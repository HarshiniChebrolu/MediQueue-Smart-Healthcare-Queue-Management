import { PriorityRequest } from '../models/PriorityRequest.js';
import { Token } from '../models/Token.js';
import { Doctor } from '../models/Doctor.js';
import { recalculateDoctorQueue } from '../utils/queueCalculations.js';
import { dispatchSmartNotification } from '../utils/notificationService.js';
import { logAudit } from '../utils/auditLogger.js';

// Accurate, deterministic priority category mappings
export const PRIORITY_RANK_MAP = {
  Emergency: 1,
  'Severe Pain': 2,
  Pregnancy: 2,
  Disability: 3,
  Elderly: 4,
  Child: 4,
  Other: 5,
};

export const CATEGORY_TO_TOKEN_PRIORITY = {
  Emergency: 'Emergency',
  'Severe Pain': 'Urgent',
  Pregnancy: 'Pregnant',
  Disability: 'Disability',
  Elderly: 'Senior',
  Child: 'Pediatric',
  Other: 'Normal',
};

// Patient Submits Priority Upgrade Request
export const submitPriorityRequest = async (req, res) => {
  try {
    const { category, reason, tokenId } = req.body;

    if (!category || !reason || !reason.trim() || !tokenId) {
      return res.status(400).json({ message: 'Valid token ID, priority category, and explanatory message are mandatory.' });
    }

    const token = await Token.findById(tokenId);
    if (!token) {
      return res.status(404).json({ message: 'Active token not found.' });
    }

    // Security: Patient can only submit priority request for their own token
    if (token.patientId.toString() !== req.user._id.toString() && req.user.role !== 'receptionist') {
      return res.status(403).json({ message: 'Not authorized to modify priority for this patient token.' });
    }

    // Check if token is in active state
    if (!['Waiting', 'Approaching'].includes(token.status)) {
      return res.status(400).json({ message: `Cannot request priority for token in '${token.status}' status.` });
    }

    // Check if pending request already exists
    const existing = await PriorityRequest.findOne({
      tokenId,
      status: 'Pending',
    });

    if (existing) {
      return res.status(400).json({ message: 'You already have a pending priority request for this token under review.' });
    }

    const priorityReq = await PriorityRequest.create({
      tokenId: token._id,
      patientId: token.patientId,
      doctorId: token.doctorId,
      departmentId: token.departmentId,
      patientName: token.patientName,
      tokenNumber: token.tokenNumber,
      category,
      reason: String(reason).trim(),
      status: 'Pending',
    });

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'PRIORITY_REQUEST_SUBMITTED',
      targetType: 'PriorityRequest',
      targetId: priorityReq._id,
      targetTokenNumber: token.tokenNumber,
      details: `Priority upgrade requested: category "${category}". Reason: "${reason}"`,
      req,
    });

    const io = req.app.get('socketio');
    if (io) {
      io.to('staff').emit('priority_request_submitted', priorityReq);
    }

    res.status(201).json(priorityReq);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Receptionist / Doctor gets all priority requests
export const getPriorityRequests = async (req, res) => {
  try {
    const { status, doctorId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (doctorId) filter.doctorId = doctorId;

    const requests = await PriorityRequest.find(filter)
      .populate('patientId', 'name mobile email patientId gender dob')
      .populate('tokenId', 'tokenNumber reasonForVisit joinedTime queuePosition status')
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } })
      .populate('departmentId', 'name code')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Receptionist Reviews Priority Request (Approve / Reject)
export const reviewPriorityRequest = async (req, res) => {
  try {
    const { status, receptionistNotes } = req.body;
    const { id } = req.params;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be 'Approved' or 'Rejected'." });
    }

    const priorityReq = await PriorityRequest.findById(id);
    if (!priorityReq) {
      return res.status(404).json({ message: 'Priority request not found.' });
    }

    // Security: Do not allow modifying a request that is already resolved
    if (priorityReq.status !== 'Pending') {
      return res.status(400).json({
        message: `This priority request has already been ${priorityReq.status.toLowerCase()} on ${priorityReq.reviewedAt ? new Date(priorityReq.reviewedAt).toLocaleTimeString() : 'record'}.`,
      });
    }

    priorityReq.status = status;
    priorityReq.receptionistNotes = receptionistNotes ? String(receptionistNotes).trim() : '';
    priorityReq.reviewedBy = req.user._id;
    priorityReq.reviewedAt = new Date();
    await priorityReq.save();

    const token = await Token.findById(priorityReq.tokenId);
    const io = req.app.get('socketio');

    if (status === 'Approved' && token) {
      const newRank = PRIORITY_RANK_MAP[priorityReq.category] || 2;
      const newTokenPriority = CATEGORY_TO_TOKEN_PRIORITY[priorityReq.category] || 'Urgent';

      const prevPriority = token.priority;
      token.priority = newTokenPriority;
      token.priorityRank = newRank;
      token.priorityReason = `Verified by Reception: ${priorityReq.category} ("${priorityReq.reason}")`;
      await token.save();

      // Snapshot previous positions for fairness transparency notices
      const previousTokens = await Token.find({
        doctorId: token.doctorId,
        status: { $in: ['Waiting', 'Approaching'] },
      });
      const previousPositionsMap = {};
      previousTokens.forEach((t) => {
        previousPositionsMap[t._id.toString()] = t.queuePosition;
      });

      // Recalculate queue positions and trigger notifications
      await recalculateDoctorQueue(token.doctorId, io, previousPositionsMap);

      // Notify Patient
      await dispatchSmartNotification({
        userId: token.patientId,
        tokenId: token._id,
        title: 'Priority Request Approved',
        message: `Your priority request (${priorityReq.category}) for Token ${token.tokenNumber} was APPROVED by Reception. You have been moved up in line.`,
        type: 'success',
        io,
        tokenNumber: token.tokenNumber,
      });

      await logAudit({
        userId: req.user._id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'PRIORITY_REQUEST_APPROVED',
        targetType: 'PriorityRequest',
        targetId: priorityReq._id,
        targetTokenNumber: token.tokenNumber,
        previousState: prevPriority,
        newState: newTokenPriority,
        details: `Approved priority ${priorityReq.category} for ${token.tokenNumber}. Notes: "${priorityReq.receptionistNotes}"`,
        req,
      });
    } else if (status === 'Rejected' && token) {
      await dispatchSmartNotification({
        userId: token.patientId,
        tokenId: token._id,
        title: 'Priority Request Reviewed',
        message: `Your priority request for Token ${token.tokenNumber} was reviewed. Standard queue placement maintained. Note: ${receptionistNotes || 'Standard priority maintained.'}`,
        type: 'info',
        io,
        tokenNumber: token.tokenNumber,
      });

      await logAudit({
        userId: req.user._id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'PRIORITY_REQUEST_REJECTED',
        targetType: 'PriorityRequest',
        targetId: priorityReq._id,
        targetTokenNumber: token.tokenNumber,
        previousState: 'Pending',
        newState: 'Rejected',
        details: `Rejected priority for ${token.tokenNumber}. Notes: "${priorityReq.receptionistNotes}"`,
        req,
      });
    }

    if (io) {
      io.to('staff').emit('priority_request_updated', priorityReq);
    }

    res.json(priorityReq);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
