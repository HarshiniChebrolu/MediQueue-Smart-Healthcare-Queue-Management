import { Token } from '../models/Token.js';
import { QueueHistory } from '../models/QueueHistory.js';
import { Doctor } from '../models/Doctor.js';
import { Department } from '../models/Department.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { generatePDFReport } from '../utils/pdfGenerator.js';
import { generateCSVReport } from '../utils/csvGenerator.js';
import { getHospitalDateString } from '../utils/timezone.js';

export const getDailyStats = async (req, res) => {
  try {
    const todayStr = getHospitalDateString();

    const totalPatients = await User.countDocuments({ role: 'patient' });
    const totalDoctors = await User.countDocuments({ role: 'doctor' });
    const totalReceptionists = await User.countDocuments({ role: 'receptionist' });
    const activeDepartments = await Department.countDocuments({ activeStatus: true });

    const totalPatientsToday = await Token.countDocuments({ dateString: todayStr });
    const waitingCount = await Token.countDocuments({ dateString: todayStr, status: { $in: ['Waiting', 'Approaching'] } });
    const inConsultationCount = await Token.countDocuments({ dateString: todayStr, status: { $in: ['Called', 'In Consultation'] } });
    const completedCount = await Token.countDocuments({ dateString: todayStr, status: 'Completed' });
    const cancelledCount = await Token.countDocuments({ dateString: todayStr, status: 'Cancelled' });
    const missedCount = await Token.countDocuments({ dateString: todayStr, status: 'Missed' });

    const availableDoctors = await Doctor.countDocuments({ activeStatus: true, status: 'Available' });
    const busyDoctors = await Doctor.countDocuments({ activeStatus: true, status: { $in: ['Busy', 'In Consultation', 'Calling Next Patient'] } });

    // Calculate actual average wait time of completed tokens today
    const completedHistories = await QueueHistory.find({ dateString: todayStr, status: 'Completed' });
    let avgWaitingTimeMinutes = 10;
    if (completedHistories.length > 0) {
      const sumWait = completedHistories.reduce((acc, h) => acc + (h.waitingDurationMinutes || 0), 0);
      avgWaitingTimeMinutes = Math.round(sumWait / completedHistories.length);
    }

    res.json({
      date: todayStr,
      totalPatients,
      totalDoctors,
      totalReceptionists,
      activeDepartments,
      totalPatientsToday,
      waitingCount,
      inConsultationCount,
      completedCount,
      cancelledCount,
      missedCount,
      availableDoctors,
      busyDoctors,
      avgWaitingTimeMinutes,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDepartmentReport = async (req, res) => {
  try {
    const todayStr = getHospitalDateString();
    const departments = await Department.find({ activeStatus: true }).sort({ name: 1 });

    const report = await Promise.all(
      departments.map(async (dept) => {
        const total = await Token.countDocuments({ departmentId: dept._id, dateString: todayStr });
        const completed = await Token.countDocuments({ departmentId: dept._id, dateString: todayStr, status: 'Completed' });
        const waiting = await Token.countDocuments({ departmentId: dept._id, dateString: todayStr, status: { $in: ['Waiting', 'Approaching'] } });
        const cancelled = await Token.countDocuments({ departmentId: dept._id, dateString: todayStr, status: 'Cancelled' });
        const doctors = await Doctor.countDocuments({ departmentId: dept._id, activeStatus: true });

        return {
          departmentId: dept._id,
          title: dept.name,
          code: dept.code,
          doctorsCount: doctors,
          totalTokens: total,
          completedTokens: completed,
          waitingTokens: waiting,
          cancelledTokens: cancelled,
        };
      })
    );

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDoctorReport = async (req, res) => {
  try {
    const todayStr = getHospitalDateString();
    const doctors = await Doctor.find({ activeStatus: true })
      .populate('userId', 'name')
      .populate('departmentId', 'name');

    const report = await Promise.all(
      doctors.map(async (doc) => {
        const completed = await Token.countDocuments({ doctorId: doc._id, dateString: todayStr, status: 'Completed' });
        const waiting = await Token.countDocuments({ doctorId: doc._id, dateString: todayStr, status: { $in: ['Waiting', 'Approaching'] } });

        return {
          doctorId: doc._id,
          doctorName: doc.userId?.name || 'Doctor',
          department: doc.departmentId?.name || 'General OPD',
          roomNumber: doc.roomNumber,
          status: doc.status,
          avgConsultationMinutes: doc.avgConsultationDuration || 10,
          totalCompletedConsultations: doc.totalCompletedConsultations || completed,
          todayCompleted: completed,
          todayWaiting: waiting,
        };
      })
    );

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ETA Accuracy Analytics (Predicted vs Actual Wait Time)
export const getETAAccuracyReport = async (req, res) => {
  try {
    const histories = await QueueHistory.find({ status: 'Completed' })
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } })
      .populate('departmentId', 'name code')
      .sort({ completedTime: -1 })
      .limit(100);

    const dataPoints = histories.map((h) => {
      const predicted = h.predictedWaitMinutes || h.waitingDurationMinutes || 10;
      const actual = h.waitingDurationMinutes || 0;
      const error = Math.abs(predicted - actual);
      const accuracyPct = predicted > 0 ? Math.max(0, Math.round(100 - (error / predicted) * 100)) : 100;

      return {
        id: h._id,
        tokenNumber: h.tokenNumber,
        doctorName: h.doctorId?.userId?.name || 'Doctor',
        department: h.departmentId?.name || 'OPD',
        predictedWaitMinutes: predicted,
        actualWaitMinutes: actual,
        errorMinutes: error,
        accuracyPercentage: accuracyPct,
        completedAt: h.completedTime,
        dateString: h.dateString,
      };
    });

    let overallAvgError = 0;
    let overallAvgAccuracy = 92;
    if (dataPoints.length > 0) {
      const sumError = dataPoints.reduce((acc, p) => acc + p.errorMinutes, 0);
      overallAvgError = Math.round((sumError / dataPoints.length) * 10) / 10;

      const sumAcc = dataPoints.reduce((acc, p) => acc + p.accuracyPercentage, 0);
      overallAvgAccuracy = Math.round(sumAcc / dataPoints.length);
    }

    res.json({
      totalSamples: dataPoints.length,
      averageErrorMinutes: overallAvgError,
      overallAccuracyPercentage: overallAvgAccuracy,
      dataPoints,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Audit Logs for Staff
export const getAuditLogs = async (req, res) => {
  try {
    const { action, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (action) filter.action = action;

    const skip = (Number(page) - 1) * Number(limit);
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await AuditLog.countDocuments(filter);

    res.json({
      logs,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const exportReportPDF = async (req, res) => {
  try {
    const { type } = req.query;
    const todayStr = getHospitalDateString();

    let data = [];
    if (type === 'department') {
      const depts = await Department.find({ activeStatus: true });
      data = await Promise.all(
        depts.map(async (d) => ({
          title: d.name,
          code: d.code,
          totalTokensToday: await Token.countDocuments({ departmentId: d._id, dateString: todayStr }),
        }))
      );
    } else if (type === 'doctor') {
      const docs = await Doctor.find({ activeStatus: true }).populate('userId', 'name').populate('departmentId', 'name');
      data = docs.map((d) => ({
        doctorName: d.userId?.name,
        department: d.departmentId?.name,
        roomNumber: d.roomNumber,
        avgDurationMinutes: d.avgConsultationDuration,
      }));
    } else {
      const histories = await QueueHistory.find({ dateString: todayStr })
        .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } })
        .populate('patientId', 'name patientId')
        .limit(50);

      data = histories.map((h) => ({
        tokenNumber: h.tokenNumber,
        patientName: h.patientId?.name || 'Walk-in',
        doctorName: h.doctorId?.userId?.name || 'Doctor',
        status: h.status,
        durationMins: h.consultationDurationMinutes,
      }));
    }

    generatePDFReport(type || 'daily_queue', data, res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const exportReportCSV = async (req, res) => {
  try {
    const { type } = req.query;
    const todayStr = getHospitalDateString();

    const histories = await QueueHistory.find({ dateString: todayStr })
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } })
      .populate('patientId', 'name patientId mobile')
      .populate('departmentId', 'name');

    const data = histories.map((h) => ({
      Token: h.tokenNumber,
      Patient: h.patientId?.name || 'Walk-in',
      PatientID: h.patientId?.patientId || '',
      Doctor: h.doctorId?.userId?.name || '',
      Department: h.departmentId?.name || '',
      Priority: h.priority || 'Normal',
      Status: h.status,
      JoinedTime: h.joinedTime ? new Date(h.joinedTime).toLocaleTimeString() : '',
      CompletedTime: h.completedTime ? new Date(h.completedTime).toLocaleTimeString() : '',
      WaitTimeMinutes: h.waitingDurationMinutes || 0,
      PredictedWaitMinutes: h.predictedWaitMinutes || 0,
      ConsultationDurationMinutes: h.consultationDurationMinutes || 0,
    }));

    generateCSVReport(data.length > 0 ? data : [{ Message: 'No records today' }], res, `MediQueue_${type || 'Queue'}_Export`);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
