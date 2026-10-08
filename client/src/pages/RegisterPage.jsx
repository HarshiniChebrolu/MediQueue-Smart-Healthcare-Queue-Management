import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Phone,
  Calendar,
  MapPin,
  ShieldCheck,
  Stethoscope,
  Eye,
  EyeOff,
  Clock,
  Check,
  Send,
  Building2,
  MessageSquare,
  CheckCheck,
  Thermometer,
  HeartPulse,
  Baby,
  Pill,
  ClipboardCheck,
  FileText,
  Info,
  Shield,
  Layers,
  AlertTriangle,
  HelpCircle,
  Users,
  BadgeCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import API from '../services/api';

export const RegisterPage = () => {
  const { register, setAuthSession } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    mobile: '',
    gender: 'Male',
    dob: '',
    address: '',
    emergencyContact: '',
    bloodGroup: 'O+',
    reasonForVisit: '',
    symptomsDuration: '2–3 days',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // When patient completes registration, this state transitions to confirmation / waiting state
  const [pendingApprovalInfo, setPendingApprovalInfo] = useState(null);
  const [urgentMessage, setUrgentMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageDeliveredTime, setMessageDeliveredTime] = useState(null);
  const [isApproved, setIsApproved] = useState(false);

  // Clean quick category options with Lucide vector icons (strictly NO emojis)
  const quickReasonTags = [
    { label: 'General Checkup', text: 'Routine Health Checkup & OPD Consultation', icon: Stethoscope },
    { label: 'Fever & Cold', text: 'Viral fever, cough, body ache, and cold symptoms', icon: Thermometer },
    { label: 'Chest Discomfort', text: 'Chest tightness, palpitations, and breathlessness', icon: HeartPulse },
    { label: 'Joint / Ortho', text: 'Severe joint stiffness, back pain, or orthopedic injury', icon: Activity },
    { label: 'Pediatric Care', text: 'Child health evaluation, fever, or pediatric review', icon: Baby },
    { label: 'Eye / Vision', text: 'Blurry vision, eye irritation, or ophthalmology checkup', icon: Eye },
    { label: 'Prescription Refill', text: 'Chronic medication review and prescription renewal', icon: Pill },
    { label: 'Doctor Follow-up', text: 'Follow-up consultation after prior tests / treatments', icon: ClipboardCheck },
  ];

  const durationOptions = [
    'Started today',
    '2–3 days',
    'About a week',
    'More than 2 weeks',
    'Chronic / Ongoing',
  ];

  const waitingQuickNotes = [
    'In waiting hall with elevated temperature',
    'Arrived at Front-Desk Counter 1',
    'Experiencing acute discomfort, requesting priority',
    'Accompanying senior citizen or infant',
    'Returning patient for follow-up review',
  ];

  // Live OPD Department Wait Status (Displays realistic hospital wait estimates)
  const liveDepartments = [
    { name: 'General Medicine', doctor: 'Dr. Sarah Jenkins', room: 'Room 101', wait: '8 mins', queue: '3 ahead' },
    { name: 'Cardiology Clinic', doctor: 'Dr. Robert Vance', room: 'Room 204', wait: '14 mins', queue: '5 ahead' },
    { name: 'Orthopedics & Spine', doctor: 'Dr. Alena Patel', room: 'Room 105', wait: '10 mins', queue: '2 ahead' },
    { name: 'Pediatrics Care', doctor: 'Dr. Michael Chang', room: 'Room 103', wait: '5 mins', queue: '1 ahead' },
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectQuickTag = (tag) => {
    if (!formData.reasonForVisit) {
      setFormData({ ...formData, reasonForVisit: tag.text });
    } else if (formData.reasonForVisit.includes(tag.text)) {
      const newReason = formData.reasonForVisit
        .replace(` • ${tag.text}`, '')
        .replace(`${tag.text} • `, '')
        .replace(tag.text, '')
        .trim();
      setFormData({ ...formData, reasonForVisit: newReason });
    } else {
      setFormData({ ...formData, reasonForVisit: `${formData.reasonForVisit} • ${tag.text}` });
    }
  };

  // Password criteria check
  const passwordCriteria = [
    { label: '8+ characters', met: formData.password.length >= 8 },
    { label: 'Uppercase letter (A-Z)', met: /[A-Z]/.test(formData.password) },
    { label: 'Lowercase letter (a-z)', met: /[a-z]/.test(formData.password) },
    { label: 'Number (0-9)', met: /\d/.test(formData.password) },
    { label: 'Special character (!@#$...)', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) },
  ];

  const allCriteriaMet = passwordCriteria.every((c) => c.met);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.mobile || !formData.password) {
      setError('Full Name, Mobile Number, Email Address, and Password are required.');
      return;
    }

    if (!allCriteriaMet) {
      setError('Please ensure your password satisfies all 5 security requirements.');
      return;
    }

    setLoading(true);

    try {
      const res = await register({
        ...formData,
        reasonForVisit: formData.reasonForVisit
          ? `${formData.reasonForVisit} (Duration: ${formData.symptomsDuration})`
          : '',
      });

      if (res?.approvalStatus === 'Pending' || res?.isPendingApproval) {
        setPendingApprovalInfo(res);
      } else {
        navigate('/patient-dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Patient registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Send Note to Receptionist while waiting
  const handleSendUrgentNote = async (e) => {
    if (e) e.preventDefault();
    if (!urgentMessage.trim() || !pendingApprovalInfo?._id) return;

    setSendingMessage(true);
    try {
      await API.post(`/patients/${pendingApprovalInfo._id}/waiting-message`, {
        message: urgentMessage.trim(),
      });
      setMessageDeliveredTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setUrgentMessage('');
    } catch (err) {
      console.error('Failed to send message to receptionist:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  // Socket & Polling Listener for Receptionist Approval
  useEffect(() => {
    if (!pendingApprovalInfo?._id) return;

    const patientId = pendingApprovalInfo._id;

    const handleApproval = (payload) => {
      const approvedPatient = payload?.user || payload;
      setIsApproved(true);
      if (setAuthSession) {
        setAuthSession({
          ...pendingApprovalInfo,
          ...approvedPatient,
          approvalStatus: 'Approved',
          activeStatus: true,
        });
      }
      setTimeout(() => {
        navigate('/patient-dashboard');
      }, 1200);
    };

    if (socket) {
      socket.on(`patient_approved_${patientId}`, handleApproval);
      socket.on('patient_approval_updated', (data) => {
        if ((data.patientId === patientId || data._id === patientId) && data.status === 'Approved') {
          handleApproval(data);
        }
      });
    }

    const pollInterval = setInterval(async () => {
      try {
        const { data } = await API.get(`/patients/${patientId}`);
        if (data?.patient?.approvalStatus === 'Approved') {
          clearInterval(pollInterval);
          handleApproval({ user: data.patient });
        }
      } catch (err) {
        // quiet fallback
      }
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      if (socket) {
        socket.off(`patient_approved_${patientId}`, handleApproval);
        socket.off('patient_approval_updated');
      }
    };
  }, [pendingApprovalInfo, socket, navigate, setAuthSession]);

  // =========================================================================
  // VIEW A: POST-REGISTRATION CONFIRMATION & ADMISSION LOUNGE
  // =========================================================================
  if (pendingApprovalInfo) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl w-full mx-auto space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 border border-teal-200 text-teal-800 text-xs font-semibold">
              <Activity className="w-3.5 h-3.5 text-teal-600" />
              <span>MediQueue Outpatient Admission Gate</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Registration Received
            </h1>
            <p className="text-xs text-slate-500">
              Your profile has been forwarded to the hospital reception desk for entry authorization.
            </p>
          </div>

          {/* Status Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6 text-center">
            {isApproved ? (
              <div className="space-y-4 py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-300 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <span className="inline-block px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md text-[11px] font-semibold">
                    Registration Approved
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-2">
                    Welcome, {pendingApprovalInfo.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Front-desk admission is confirmed. Redirecting you to your patient dashboard...
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto">
                  <Clock className="w-7 h-7 text-teal-600 animate-spin-slow" />
                </div>

                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span>Awaiting Front-Desk Acceptance</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 pt-1">
                    Admission Verification in Progress
                  </h2>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    The reception operator is reviewing your intake details. Your dashboard will open automatically upon authorization.
                  </p>
                </div>

                {/* Patient Profile Summary */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left text-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-slate-500">Assigned Patient ID:</span>
                    <strong className="font-mono font-bold text-teal-700 text-sm">{pendingApprovalInfo.patientId}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Patient Name:</span>
                    <span className="font-semibold text-slate-900">{pendingApprovalInfo.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Contact Number:</span>
                    <span className="font-medium text-slate-700">{pendingApprovalInfo.mobile}</span>
                  </div>
                  {pendingApprovalInfo.reasonForVisit && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-slate-500 block text-[11px] mb-1">Reason for Visit:</span>
                      <span className="text-slate-700 font-medium bg-white p-2.5 rounded-xl border border-slate-200 block text-[11px]">
                        {pendingApprovalInfo.reasonForVisit}
                      </span>
                    </div>
                  )}
                </div>

                {/* Direct Front-Desk Message Box */}
                <div className="bg-teal-50/50 border border-teal-200 rounded-2xl p-4 text-left space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-teal-900">
                      <MessageSquare className="w-4 h-4 text-teal-700" />
                      <span className="text-xs font-semibold">Message Front-Desk Operator</span>
                    </div>
                    <span className="text-[10px] text-teal-700 font-medium bg-teal-100 px-2 py-0.5 rounded-full">Optional</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Need immediate assistance or already present at the counter? Send a note to the reception console:
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {waitingQuickNotes.map((note, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setUrgentMessage(note)}
                        className="px-2.5 py-1 bg-white hover:bg-teal-50 border border-teal-200 rounded-lg text-[10px] text-slate-700 transition-colors text-left cursor-pointer shadow-2xs"
                      >
                        {note}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleSendUrgentNote} className="space-y-2 pt-1">
                    <textarea
                      rows={2}
                      value={urgentMessage}
                      onChange={(e) => setUrgentMessage(e.target.value)}
                      placeholder="Type a message to the reception desk..."
                      className="w-full bg-white border border-teal-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 resize-none outline-none"
                    />

                    <div className="flex items-center justify-between">
                      {messageDeliveredTime ? (
                        <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Delivered to reception at {messageDeliveredTime}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Reception updates in real time</span>
                      )}

                      <button
                        type="submit"
                        disabled={sendingMessage || !urgentMessage.trim()}
                        className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {sendingMessage ? <span>Sending...</span> : (
                          <>
                            <Send className="w-3 h-3" />
                            <span>Send Note</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="text-[11px] text-slate-400 pt-1">
                  This page will automatically advance when the reception operator confirms your admission.
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW B: REFINED PATIENT SELF-REGISTRATION (Single Cohesive Page with Rich Left Sidebar)
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 py-6 sm:py-10 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-6xl w-full mx-auto">
        
        {/* Main Grid: Rich Left Panel (5 Cols) + Clean Single Form Card (7 Cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ========================================================================= */}
          {/* LEFT COLUMN: Filled, Authoritative Healthcare Info, Live OPD & Workflow (5 Cols) */}
          {/* ========================================================================= */}
          <aside className="lg:col-span-5 bg-gradient-to-b from-slate-900 via-slate-850 to-teal-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-800 space-y-6">
            
            {/* 1. Hospital Brand & Live OPD Status Header */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Link to="/" className="inline-flex items-center gap-2.5 group">
                  <div className="w-10 h-10 rounded-xl bg-teal-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
                    <Activity className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-2xl font-black tracking-tight text-white flex items-center gap-1">
                      Medi<span className="text-teal-400">Queue</span>
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 block -mt-1">
                      Outpatient Admissions
                    </span>
                  </div>
                </Link>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>OPD Active</span>
                </div>
              </div>

              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  Patient Self-Registration
                </h1>
                <p className="text-xs text-slate-300 leading-relaxed mt-1">
                  Complete this single clinical intake form to receive your digital consultation token and track live OPD wait times.
                </p>
              </div>
            </div>

            {/* 2. Live OPD Departments & Wait Time Directory (Fills Left Side with High-Utility Data) */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-700/70 pb-2">
                <div className="flex items-center gap-1.5 text-teal-300 font-bold text-xs uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-teal-400" />
                  <span>Live OPD Wait Times</span>
                </div>
                <span className="text-[10px] text-slate-400">Real-Time Estimations</span>
              </div>

              <div className="space-y-2 text-xs">
                {liveDepartments.map((dept, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-700/50 hover:border-teal-500/40 transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-white block text-xs">{dept.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {dept.doctor} • {dept.room}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-teal-300 font-bold text-xs block">~{dept.wait}</span>
                      <span className="text-[10px] text-slate-400">{dept.queue}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-300 font-medium">
                <span className="flex items-center gap-1 text-slate-400">
                  <Users className="w-3.5 h-3.5 text-teal-400" />
                  <span>Average Wait Today:</span>
                </span>
                <span className="text-teal-300 font-bold">~9 mins (Paperless Queue)</span>
              </div>
            </div>

            {/* 3. Workflow Timeline: 4-Step Patient Journey */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-700/70 pb-2">
                <div className="flex items-center gap-1.5 text-teal-300 font-bold text-xs uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5 text-teal-400" />
                  <span>How Your Visit Works</span>
                </div>
                <span className="text-[10px] text-slate-400">Standard OPD Flow</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/40 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-white font-semibold block text-xs">Fill Single Intake Form</strong>
                    <span className="text-slate-400 text-[11px]">Personal details, medical background, and current symptoms.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 border border-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="text-white font-semibold block text-xs">Front-Desk Verification</strong>
                    <span className="text-slate-400 text-[11px]">Reception staff reviews and authorizes entry to the digital queue.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 border border-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <strong className="text-white font-semibold block text-xs">Digital Queue Token</strong>
                    <span className="text-slate-400 text-[11px]">Live token issued; track queue progress directly on your phone.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 border border-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <div>
                    <strong className="text-white font-semibold block text-xs">Doctor Consultation</strong>
                    <span className="text-slate-400 text-[11px]">Audible chime and room notification when your token is called.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Urgent Clinical Alert (Safety Protocol) */}
            <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-200 font-semibold block text-xs">
                  Emergency Medical Notice
                </strong>
                <p className="text-amber-200/80 text-[11px] leading-relaxed mt-0.5">
                  If you are experiencing severe chest pain, sudden breathlessness, heavy bleeding, or trauma, report directly to <strong>Room 001 (Emergency Triage)</strong> without waiting in the OPD queue.
                </p>
              </div>
            </div>

            {/* 5. Front-Desk Helpdesk & Wheelchair Assistance */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-teal-400 shrink-0" />
                <div>
                  <span className="font-semibold text-white block text-xs">Need Physical Assistance?</span>
                  <span className="text-slate-400 text-[11px]">Wheelchairs available at Atrium Counter 1</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-teal-300 bg-teal-900/40 px-2 py-1 rounded-md border border-teal-500/30 shrink-0">
                Counter 1
              </span>
            </div>

            {/* 6. Security & Confidentiality Badge */}
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-3.5 flex items-center gap-2.5 text-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <strong className="text-white font-semibold block text-xs">
                  256-Bit Encrypted Health Records
                </strong>
                <span className="text-slate-400 text-[11px]">
                  Clinical privacy guaranteed. Your records are accessed strictly by your consulting doctor.
                </span>
              </div>
            </div>

          </aside>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: The Single Cohesive Registration Form (7 Cols)             */}
          {/* ========================================================================= */}
          <main className="lg:col-span-7 bg-white text-slate-800 rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-9 space-y-6">

            {/* Form Top Title */}
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Patient Intake & Consultation Details
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete the single form below to enter the hospital OPD queue.
                </p>
              </div>
              <span className="text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full shrink-0">
                Single Page Intake
              </span>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-800 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <div>
                  <strong className="font-semibold block">Please verify details:</strong>
                  <span>{error}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* 1. PERSONAL DETAILS */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-2">
                  <User className="w-4 h-4 text-teal-700" />
                  <h3>1. Personal & Contact Information</h3>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Legal Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Johnathan Smith"
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-colors"
                    />
                  </div>
                </div>

                {/* Mobile & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="tel"
                        name="mobile"
                        required
                        value={formData.mobile}
                        onChange={handleChange}
                        placeholder="e.g. 9876543210"
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="e.g. john@example.com"
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Password & Checklist */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Portal Security Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Create security password"
                      className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Checklist */}
                  <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                      {passwordCriteria.map((c, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-1.5 ${c.met ? 'text-teal-800 font-medium' : 'text-slate-400'}`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                              c.met ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-400'
                            }`}
                          >
                            <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                          </span>
                          <span className="text-[11px]">{c.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. DEMOGRAPHICS & MEDICAL PROFILE */}
              <div className="space-y-3.5 pt-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-2">
                  <FileText className="w-4 h-4 text-teal-700" />
                  <h3>2. Demographics & Medical Background</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      name="dob"
                      value={formData.dob}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
                    <select
                      name="bloodGroup"
                      value={formData.bloodGroup}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Residential Address
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Street, City, Area"
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Emergency Contact Phone
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="tel"
                        name="emergencyContact"
                        value={formData.emergencyContact}
                        onChange={handleChange}
                        placeholder="Next of kin / Guardian"
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. REASON FOR VISIT & SYMPTOMS */}
              <div className="space-y-3.5 pt-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-2">
                  <Stethoscope className="w-4 h-4 text-teal-700" />
                  <h3>3. Reason for Visit & Primary Concern</h3>
                </div>

                {/* Clinical Triage Note */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-start gap-2 text-slate-600 text-xs">
                  <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                  <p>
                    Please specify your concern so nursing staff can allocate your token to the appropriate OPD room.
                  </p>
                </div>

                {/* Quick Symptom Chips with Clean Lucide Icons */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Quick-Select Symptoms / Specialty:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {quickReasonTags.map((tag, idx) => {
                      const TagIcon = tag.icon;
                      const isSelected = formData.reasonForVisit.includes(tag.text);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectQuickTag(tag)}
                          className={`p-2 rounded-xl border text-left transition-all flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                              : 'bg-slate-50 hover:bg-teal-50 text-slate-700 border-slate-200 hover:border-teal-300'
                          }`}
                        >
                          <TagIcon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-teal-700'}`} />
                          <span className="text-[11px] font-medium truncate">{tag.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Textarea */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Describe Your Current Symptoms
                  </label>
                  <textarea
                    rows={2}
                    name="reasonForVisit"
                    value={formData.reasonForVisit}
                    onChange={handleChange}
                    placeholder="e.g. Moderate fever, body ache, and persistent cough since yesterday..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 resize-none"
                  />
                </div>

                {/* Symptoms Duration Dropdown */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-700">
                    How long have you had these symptoms?
                  </label>
                  <select
                    name="symptomsDuration"
                    value={formData.symptomsDuration}
                    onChange={handleChange}
                    className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                  >
                    {durationOptions.map((opt, i) => (
                      <option key={i} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <span>Submitting Intake Registration...</span>
                  ) : (
                    <>
                      <span>Complete Intake & Enter Waiting Lounge</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <p className="text-[11px] text-slate-400 text-center">
                  Your record is routed immediately to Front-Desk Reception for queue token assignment.
                </p>
              </div>

            </form>

            {/* Footer Link */}
            <footer className="border-t border-slate-100 pt-3 text-center text-xs text-slate-500">
              <span>Already registered? </span>
              <Link to="/signin" className="font-semibold text-teal-700 hover:text-teal-900 hover:underline">
                Sign In to Patient Portal
              </Link>
            </footer>

          </main>

        </div>

      </div>
    </div>
  );
};

export default RegisterPage;
