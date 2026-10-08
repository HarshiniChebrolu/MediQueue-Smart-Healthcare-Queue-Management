import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotification } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import API from '../services/api';
import { DashboardLayout } from '../components/common/DashboardLayout';
import { StatusBadge } from '../components/common/StatusBadge';
import { TokenBadge } from '../components/common/TokenBadge';
import { EmptyState } from '../components/common/EmptyState';
import { DoctorProfileModal } from '../components/common/DoctorProfileModal';
import { TurnAlertModal } from '../components/common/TurnAlertModal';
import { QRCodeModal } from '../components/common/QRCodeModal';
import {
  Calendar,
  CalendarPlus,
  Clock,
  User,
  Users,
  Stethoscope,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  MapPin,
  QrCode,
  FileText,
  Bell,
  HeartPulse,
  Baby,
  Bone,
  Info,
  DollarSign,
  ChevronRight,
  XCircle,
  Pill,
  ShieldAlert,
  Send,
  RefreshCw,
  X,
  ShieldCheck,
} from 'lucide-react';

export const PatientDashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { notifications, unreadCount, markAllAsRead } = useNotification();
  const { t, language } = useLanguage();

  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, book, appointments, queue, history, notifications

  // Live Token & Queue state
  const [queueState, setQueueState] = useState({
    activeToken: null,
    currentTokenBeingServed: '--',
    totalWaitingPatients: 0,
    doctorStatus: 'Available',
    roomNumber: 'Room 101',
    doctorName: 'Physician',
    avgConsultationDuration: 10,
  });

  // Appointments & History
  const [myAppointments, setMyAppointments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedDoctorForModal, setSelectedDoctorForModal] = useState(null);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [priorityCategory, setPriorityCategory] = useState('Severe Pain');
  const [priorityReason, setPriorityReason] = useState('');
  const [prioritySubmitting, setPrioritySubmitting] = useState(false);
  const [priorityStatusMsg, setPriorityStatusMsg] = useState('');

  // Booking Flow Multi-Step State
  const [bookingStep, setBookingStep] = useState(1); // 1: Dept, 2: Doctor, 3: Slot & Medical Details, 4: Confirmed
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    appointmentDate: new Date().toISOString().split('T')[0],
    timeSlot: '10:00 AM',
    reasonForVisit: '',
    symptomsDuration: '2 days',
    existingConditions: 'None',
    priority: 'Normal',
    priorityReason: '',
  });
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Fetch active token
  const fetchActiveToken = async () => {
    try {
      const { data } = await API.get('/queue/patient-active');
      setQueueState(data);
    } catch (e) {
      console.error('Error fetching patient active token', e);
    }
  };

  // Fetch patient appointments
  const fetchMyAppointments = async () => {
    try {
      const { data } = await API.get('/appointments/my');
      setMyAppointments(data || []);
    } catch (e) {
      console.error('Error fetching appointments', e);
    }
  };

  // Fetch departments and doctors
  const fetchDepartmentsAndDoctors = async () => {
    try {
      const [deptRes, docRes] = await Promise.all([
        API.get('/departments'),
        API.get('/doctors'),
      ]);
      setDepartments(deptRes.data || []);
      setDoctorsList(docRes.data || []);
      if (deptRes.data?.length > 0 && !selectedDept) {
        setSelectedDept(deptRes.data[0]);
      }
    } catch (e) {
      console.error('Error fetching departments & doctors', e);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchActiveToken(),
      fetchMyAppointments(),
      fetchDepartmentsAndDoctors(),
    ]).finally(() => setLoading(false));

    const interval = setInterval(() => {
      fetchActiveToken();
      fetchMyAppointments();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Socket updates
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchActiveToken();
      fetchMyAppointments();
    };

    socket.on('queue_updated', handleUpdate);
    socket.on('doctor_queue_updated', handleUpdate);
    socket.on('doctor_status_changed', handleUpdate);

    return () => {
      socket.off('queue_updated', handleUpdate);
      socket.off('doctor_queue_updated', handleUpdate);
      socket.off('doctor_status_changed', handleUpdate);
    };
  }, [socket]);

  // Handle Cancel Token
  const handleCancelToken = async () => {
    if (!queueState.activeToken) return;
    if (!window.confirm('Are you sure you want to cancel your active queue token?')) return;
    try {
      await API.put(`/queue/cancel/${queueState.activeToken._id}`);
      await fetchActiveToken();
      await fetchMyAppointments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel token');
    }
  };

  // Handle Cancel Appointment
  const handleCancelAppointment = async (apptId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await API.put(`/appointments/${apptId}/cancel`);
      await fetchActiveToken();
      await fetchMyAppointments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel appointment');
    }
  };

  // Handle Notification Preference update
  const handleSelectPreference = async (prefOption) => {
    if (!queueState.activeToken) return;
    try {
      await API.put(`/queue/preference/${queueState.activeToken._id}`, { preference: prefOption });
      setQueueState((prev) => ({
        ...prev,
        activeToken: { ...prev.activeToken, notificationPreference: prefOption },
      }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update preference');
    }
  };

  // Handle Request Priority Upgrade
  const handleRequestPriority = async (e) => {
    e.preventDefault();
    if (!queueState.activeToken) return;
    setPrioritySubmitting(true);
    setPriorityStatusMsg('');
    try {
      await API.post('/priority/request', {
        tokenId: queueState.activeToken._id,
        category: priorityCategory,
        reason: priorityReason,
      });
      setPriorityStatusMsg('Priority upgrade request submitted to reception successfully!');
      setTimeout(() => {
        setShowPriorityModal(false);
        setPriorityStatusMsg('');
        setPriorityReason('');
      }, 1500);
      await fetchActiveToken();
    } catch (err) {
      setPriorityStatusMsg(err.response?.data?.message || 'Failed to submit priority request.');
    } finally {
      setPrioritySubmitting(false);
    }
  };

  // Complete Appointment Booking Flow
  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!selectedDoctor) {
      setBookingError('Please select a doctor to continue.');
      return;
    }
    if (!bookingForm.reasonForVisit.trim()) {
      setBookingError('Reason for visit / Illness symptoms is required.');
      return;
    }

    setBookingError('');
    setBookingSubmitting(true);

    try {
      const { data } = await API.post('/appointments', {
        doctorId: selectedDoctor._id,
        departmentId: selectedDept?._id || selectedDoctor.departmentId?._id || selectedDoctor.departmentId,
        appointmentDate: bookingForm.appointmentDate,
        timeSlot: bookingForm.timeSlot,
        reasonForVisit: bookingForm.reasonForVisit,
        symptomsDuration: bookingForm.symptomsDuration,
        existingConditions: bookingForm.existingConditions,
        priority: bookingForm.priority,
        priorityReason: bookingForm.priorityReason,
      });

      setConfirmedBooking(data);
      setBookingStep(4);
      await fetchActiveToken();
      await fetchMyAppointments();
    } catch (err) {
      setBookingError(err.response?.data?.message || 'Failed to book appointment.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const activeToken = queueState.activeToken;
  const filteredDoctors = selectedDept
    ? doctorsList.filter((d) => d.departmentId?._id === selectedDept._id || d.departmentId === selectedDept._id)
    : doctorsList;

  // Department icon helper
  const getDeptIcon = (code) => {
    switch (code) {
      case 'CARD':
        return <HeartPulse className="w-5 h-5 text-red-500" />;
      case 'PED':
        return <Baby className="w-5 h-5 text-amber-500" />;
      case 'ORTH':
        return <Bone className="w-5 h-5 text-indigo-500" />;
      default:
        return <Stethoscope className="w-5 h-5 text-teal-600" />;
    }
  };

  return (
    <DashboardLayout
      role="patient"
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab);
        if (tab === 'book') setBookingStep(1);
      }}
    >
      <div className="space-y-6">

        {/* 1. PATIENT HEADER BANNER */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-xl font-black shadow-md shadow-teal-600/30 shrink-0">
              {user?.name?.charAt(0) || 'P'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-3 py-0.5 bg-teal-100 text-teal-800 font-bold text-xs rounded-full uppercase tracking-wider">
                  {t('patientPortal')}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {new Date().toLocaleDateString(language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900">
                {t('welcome')}, {user?.name || 'Patient'} 👋
              </h1>
              <p className="text-xs text-slate-500">
                {t('patientId')}: <strong className="text-teal-700 font-mono">{user?.patientId || 'PAT-2026-0001'}</strong> • {t('bloodGroup')}: <strong className="text-slate-700">{user?.bloodGroup || 'O+'}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowQRModal(true)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-2 transition-all hover:scale-105"
            >
              <QrCode className="w-4 h-4 text-teal-600" />
              <span>{t('queueQr')}</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('book');
                setBookingStep(1);
              }}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-600/20 flex items-center gap-2 transition-all hover:scale-105"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>{t('bookAppointment')}</span>
            </button>
          </div>
        </div>

        {/* 2. TAB: MAIN PATIENT DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">

            {/* LIVE QUEUE & TOKEN STATUS HERO */}
            {activeToken ? (
              <div className="bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-10 translate-x-12 -translate-y-8 pointer-events-none">
                  <Activity className="w-96 h-96" />
                </div>

                <div className="relative z-10 space-y-6">
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-xs font-black uppercase tracking-wider text-teal-200">
                        {t('liveDigitalOpdToken')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <TokenBadge priority={activeToken.priority} />
                      <button
                        onClick={handleCancelToken}
                        className="text-xs font-bold text-red-300 hover:text-red-100 transition-colors"
                      >
                        {t('cancelToken')}
                      </button>
                    </div>
                  </div>

                  {/* Core 4 Metrics Showcase */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-teal-200 block">
                        {t('yourToken')}
                      </span>
                      <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white block mt-1">
                        {activeToken.tokenNumber}
                      </span>
                      <span className="text-[10px] text-teal-200/80 block mt-1">Position #{activeToken.queuePosition}</span>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-teal-200 block">
                        {t('nowServing')}
                      </span>
                      <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-emerald-300 block mt-1">
                        {queueState.currentTokenBeingServed}
                      </span>
                      <span className="text-[10px] text-teal-200/80 block mt-1">{t('insideRoom')} {queueState.roomNumber}</span>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-teal-200 block">
                        {t('peopleAhead')}
                      </span>
                      <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-amber-300 block mt-1">
                        {activeToken.peopleAhead ?? 0}
                      </span>
                      <span className="text-[10px] text-teal-200/80 block mt-1">{t('inFrontOfYou')}</span>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-teal-200 block">
                        {t('estimatedWait')}
                      </span>
                      <span className="text-3xl sm:text-4xl font-black text-white block mt-1">
                        ~{activeToken.estimatedWaitMin || 5}–{activeToken.estimatedWaitMax || 15}{t('mins')}
                      </span>
                      <span className="text-[10px] text-teal-200/80 block mt-1">{t('movingAverageEta')}</span>
                    </div>
                  </div>

                  {/* VISUAL QUEUE PROGRESS STEPPER */}
                  <div className="bg-black/20 p-4 rounded-2xl border border-white/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 block mb-3">
                      {t('queueLifecycle')}
                    </span>
                    <div className="flex items-center justify-between relative">
                      <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/20 -translate-y-1/2 -z-0" />
                      {[
                        { step: 1, label: t('booked'), active: true },
                        { step: 2, label: t('inQueue'), active: true },
                        { step: 3, label: t('approaching'), active: (activeToken.peopleAhead ?? 5) <= 1 },
                        { step: 4, label: t('called'), active: activeToken.status === 'Called' || activeToken.status === 'In Consultation' },
                        { step: 5, label: t('inConsultation'), active: activeToken.status === 'In Consultation' },
                      ].map((st, i) => (
                        <div key={i} className="flex flex-col items-center gap-1.5 relative z-10">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-md ${
                              st.active
                                ? 'bg-emerald-400 text-slate-900 ring-4 ring-emerald-400/30'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {st.active ? <CheckCircle2 className="w-4 h-4" /> : st.step}
                          </div>
                          <span className={`text-[10px] font-bold ${st.active ? 'text-white' : 'text-slate-400'}`}>
                            {st.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Assigned Doctor & Room Information Banner */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-teal-300">
                        <Stethoscope className="w-5 h-5" />
                      </div>
                      <div>
                        <strong className="text-sm font-bold block">{activeToken.doctorId?.userId?.name || queueState.doctorName}</strong>
                        <span className="text-xs text-teal-200">
                          {t('room')}: <strong>{activeToken.doctorId?.roomNumber || queueState.roomNumber}</strong> • {t('status')}: {t(queueState.doctorStatus)}
                        </span>
                      </div>
                    </div>

                    {/* Preference Selector */}
                    <div className="flex items-center gap-2 text-xs bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
                      <Bell className="w-3.5 h-3.5 text-teal-300" />
                      <span className="text-[11px] text-teal-200">Alerts:</span>
                      <select
                        value={activeToken.notificationPreference || 'every_time'}
                        onChange={(e) => handleSelectPreference(e.target.value)}
                        className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                      >
                        <option value="every_time" className="text-slate-900">{t('remindMeEveryTime')}</option>
                        <option value="when_next" className="text-slate-900">{t('remindMeWhenNext')}</option>
                        <option value="tracking" className="text-slate-900">{t('silentTracking')}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto border border-teal-100">
                  <Activity className="w-7 h-7" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-lg font-black text-slate-900">{t('noActiveToken')}</h3>
                  <p className="text-xs text-slate-500">
                    {t('noActiveTokenDesc')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('book');
                    setBookingStep(1);
                  }}
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/30 inline-flex items-center gap-2 transition-all hover:scale-105"
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>{t('bookAppointment')}</span>
                </button>
              </div>
            )}

            {/* UPCOMING & RECENT APPOINTMENTS PREVIEW */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    My Appointments ({myAppointments.length})
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('appointments')}
                  className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {myAppointments.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No appointments booked yet"
                  description="When you schedule appointments with doctors, they will be listed here."
                  actionLabel="Book Appointment"
                  onAction={() => {
                    setActiveTab('book');
                    setBookingStep(1);
                  }}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myAppointments.slice(0, 4).map((appt) => (
                    <div
                      key={appt._id}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-teal-200 transition-all bg-slate-50/50 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <strong className="text-sm text-slate-900 block">
                            {appt.doctorId?.userId?.name || 'Dr. Specialist'}
                          </strong>
                          <span className="text-xs text-teal-700 font-semibold">
                            {appt.departmentId?.name || 'Clinical OPD'}
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          appt.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : appt.status === 'In Consultation'
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}>
                          {appt.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-200/60">
                        <span className="flex items-center gap-1 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-teal-600" />
                          <span>{appt.appointmentDate} at {appt.timeSlot}</span>
                        </span>
                        <span className="font-mono font-bold text-teal-800">
                          Token: {appt.tokenNumber}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* 3. TAB: BOOK APPOINTMENT (STEP-BY-STEP DOCTOR SELECTION & QUEUE JOIN) */}
        {activeTab === 'book' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">

            {/* Stepper Header */}
            <div className="border-b border-slate-100 pb-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <CalendarPlus className="w-6 h-6 text-teal-600" />
                    <span>Book Outpatient Consultation</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Connect directly to your specialist's dedicated queue with live token assignment.
                  </p>
                </div>
                <span className="text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                  Step {bookingStep} of 4
                </span>
              </div>

              {/* Step indicator breadcrumbs */}
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <span className={bookingStep >= 1 ? 'text-teal-700' : ''}>1. Department</span>
                <span>→</span>
                <span className={bookingStep >= 2 ? 'text-teal-700' : ''}>2. Doctor</span>
                <span>→</span>
                <span className={bookingStep >= 3 ? 'text-teal-700' : ''}>3. Slot & Symptoms</span>
                <span>→</span>
                <span className={bookingStep >= 4 ? 'text-teal-700' : ''}>4. Token Confirmed</span>
              </div>
            </div>

            {/* STEP 1: SELECT DEPARTMENT */}
            {bookingStep === 1 && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider text-xs">
                  Choose Clinical Department
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {departments.map((dept) => {
                    const isSelected = selectedDept?._id === dept._id;
                    return (
                      <div
                        key={dept._id}
                        onClick={() => setSelectedDept(dept)}
                        className={`p-5 rounded-2xl border-2 transition-all cursor-pointer space-y-2 ${
                          isSelected
                            ? 'border-teal-500 bg-teal-50/50 shadow-md scale-[1.02]'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                          {getDeptIcon(dept.code)}
                        </div>
                        <strong className="text-sm font-bold text-slate-900 block">{dept.name}</strong>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{dept.description}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setBookingStep(2)}
                    disabled={!selectedDept}
                    className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50"
                  >
                    <span>Continue to Doctors</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: SELECT DOCTOR (RICH DOCTOR CARDS) */}
            {bookingStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider text-xs">
                    Select Specialist in {selectedDept?.name}
                  </h4>
                  <button
                    onClick={() => setBookingStep(1)}
                    className="text-xs font-bold text-teal-700 hover:underline"
                  >
                    Change Department
                  </button>
                </div>

                {filteredDoctors.length === 0 ? (
                  <EmptyState
                    icon={Stethoscope}
                    title="No doctors available in this department"
                    description="Please choose another department to consult an available specialist."
                    actionLabel="Back to Departments"
                    onAction={() => setBookingStep(1)}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredDoctors.map((doc) => {
                      const isSelected = selectedDoctor?._id === doc._id;
                      const docUser = doc.userId || {};
                      return (
                        <div
                          key={doc._id}
                          className={`p-5 rounded-3xl border-2 transition-all space-y-4 ${
                            isSelected
                              ? 'border-teal-500 bg-teal-50/40 shadow-lg'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <img
                              src={doc.profileImage || docUser.photoURL || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200'}
                              alt={docUser.name}
                              className="w-16 h-16 rounded-2xl object-cover border-2 border-teal-500 shadow-sm shrink-0"
                            />
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <h5 className="text-sm font-black text-slate-900 truncate">{docUser.name}</h5>
                                <StatusBadge status={doc.status || 'Available'} />
                              </div>
                              <p className="text-xs font-semibold text-teal-700 truncate">{doc.specialization}</p>
                              <p className="text-[11px] text-slate-500">
                                {doc.qualification} • {doc.experience || 10} yrs experience
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                            <div>
                              <span className="text-slate-400 block font-medium">Location</span>
                              <strong className="text-slate-800 font-bold">{doc.roomNumber || 'Room 101'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-medium">Timings</span>
                              <strong className="text-slate-800 font-bold">{doc.startTime || '09:00 AM'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-medium">Queue</span>
                              <strong className="text-amber-700 font-bold">{doc.waitingCount || 0} Waiting</strong>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setSelectedDoctorForModal(doc)}
                              className="flex-1 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                              View Profile
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDoctor(doc);
                                setBookingStep(3);
                              }}
                              className="flex-1 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1"
                            >
                              <span>Select & Book</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: SELECT DATE, TIME & ENTER SYMPTOMS */}
            {bookingStep === 3 && (
              <form onSubmit={handleConfirmBooking} className="space-y-6 max-w-2xl mx-auto">
                <div className="bg-teal-50 p-4 rounded-2xl border border-teal-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedDoctor?.profileImage || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200'}
                      alt="Doctor"
                      className="w-12 h-12 rounded-xl object-cover border border-teal-300"
                    />
                    <div>
                      <strong className="text-sm font-bold text-teal-950 block">{selectedDoctor?.userId?.name}</strong>
                      <span className="text-xs text-teal-800">{selectedDoctor?.specialization} • {selectedDoctor?.roomNumber}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBookingStep(2)}
                    className="text-xs font-bold text-teal-700 hover:underline"
                  >
                    Change Doctor
                  </button>
                </div>

                {bookingError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                    {bookingError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Consultation Date
                    </label>
                    <input
                      type="date"
                      required
                      value={bookingForm.appointmentDate}
                      onChange={(e) => setBookingForm({ ...bookingForm, appointmentDate: e.target.value })}
                      className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Time Slot
                    </label>
                    <select
                      value={bookingForm.timeSlot}
                      onChange={(e) => setBookingForm({ ...bookingForm, timeSlot: e.target.value })}
                      className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    >
                      {['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reason for Visit / Illness Symptoms <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={bookingForm.reasonForVisit}
                    onChange={(e) => setBookingForm({ ...bookingForm, reasonForVisit: e.target.value })}
                    placeholder="Describe your current medical concern, symptoms, or purpose of visit..."
                    className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Symptoms Duration
                    </label>
                    <input
                      type="text"
                      value={bookingForm.symptomsDuration}
                      onChange={(e) => setBookingForm({ ...bookingForm, symptomsDuration: e.target.value })}
                      placeholder="e.g. 2 days / 1 week"
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pre-existing Medical Conditions
                    </label>
                    <input
                      type="text"
                      value={bookingForm.existingConditions}
                      onChange={(e) => setBookingForm({ ...bookingForm, existingConditions: e.target.value })}
                      placeholder="e.g. Diabetes, Asthma, None"
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setBookingStep(2)}
                    className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={bookingSubmitting}
                    className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/30 flex items-center gap-2 transition-all hover:scale-105"
                  >
                    {bookingSubmitting ? 'Confirming...' : 'CONFIRM APPOINTMENT & ISSUE TOKEN'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 4: CONFIRMATION SUCCESS & TOKEN ASSIGNED */}
            {bookingStep === 4 && confirmedBooking && (
              <div className="text-center py-8 max-w-lg mx-auto space-y-6 animate-scaleUp">
                <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-900">Appointment Confirmed!</h3>
                  <p className="text-xs text-slate-500">
                    Your appointment with Dr. {selectedDoctor?.userId?.name} is successfully scheduled.
                  </p>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 text-left space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <span className="text-xs text-slate-500 font-semibold">Your Digital Token</span>
                    <span className="text-3xl font-black font-mono text-teal-800">
                      {confirmedBooking.tokenNumber}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Doctor</span>
                      <strong className="text-slate-800">{selectedDoctor?.userId?.name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Location</span>
                      <strong className="text-slate-800">{selectedDoctor?.roomNumber}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Date & Time</span>
                      <strong className="text-slate-800">{confirmedBooking.appointmentDate} • {confirmedBooking.timeSlot}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Queue Status</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        Active in Doctor's Queue
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md"
                  >
                    Go to Patient Dashboard
                  </button>

                  <button
                    onClick={() => setActiveTab('appointments')}
                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200"
                  >
                    View All Appointments
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* 4. TAB: MY APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  <span>My Appointments Roster ({myAppointments.length})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Full historical records and upcoming appointments with attending physicians.
                </p>
              </div>

              <button
                onClick={() => {
                  setActiveTab('book');
                  setBookingStep(1);
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>New Appointment</span>
              </button>
            </div>

            {myAppointments.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No appointments found"
                description="Book an appointment with a specialist to get started."
                actionLabel="Book Appointment"
                onAction={() => {
                  setActiveTab('book');
                  setBookingStep(1);
                }}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Date & Slot</th>
                      <th className="py-3 px-4">Token</th>
                      <th className="py-3 px-4">Doctor</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Reason for Visit</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myAppointments.map((appt) => (
                      <tr key={appt._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {appt.appointmentDate} • {appt.timeSlot}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-black text-teal-800 text-sm">
                          {appt.tokenNumber}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {appt.doctorId?.userId?.name || 'Dr. Specialist'} ({appt.doctorId?.roomNumber || 'Room 101'})
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {appt.departmentId?.name || 'OPD'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                          {appt.reasonForVisit}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                            appt.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : appt.status === 'Cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-teal-100 text-teal-800'
                          }`}>
                            {appt.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {appt.status !== 'Completed' && appt.status !== 'Cancelled' ? (
                            <button
                              onClick={() => handleCancelAppointment(appt._id)}
                              className="px-2.5 py-1 text-[11px] font-bold text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          ) : appt.consultationNotes ? (
                            <span className="text-[11px] text-teal-700 font-bold">Notes Recorded</span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Archived</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 5. TAB: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-teal-600" />
                  <span>Notification Center</span>
                </h3>
                <p className="text-xs text-slate-500">Live system events, token alerts, and doctor turn notices.</p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No notifications"
                description="You are fully up to date! Live queue alerts will appear here."
              />
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n._id}
                    className={`p-4 rounded-2xl border transition-colors ${
                      n.isRead ? 'bg-white border-slate-200' : 'bg-teal-50/50 border-teal-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <strong className="text-xs font-bold text-slate-900">{n.title}</strong>
                      <span className="text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-slate-600">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 6. TAB: LIVE QUEUE TRACKER */}
        {activeTab === 'queue' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Activity className="w-6 h-6 text-teal-600" />
                  <span>{t('liveQueueTracker')}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time live queue progression, position calculation, and doctor room status.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowQRModal(true)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all"
                >
                  <QrCode className="w-4 h-4 text-teal-600" />
                  <span>{t('queueQr')}</span>
                </button>
                <button
                  onClick={() => fetchActiveToken()}
                  className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold rounded-xl border border-teal-200 flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-teal-600" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {activeToken ? (
              <div className="space-y-6">
                {/* Hero Queue Card */}
                <div className="bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                  <div className="relative z-10 space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-xs font-black uppercase tracking-wider text-teal-200">
                          {t('realTimePosition')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <TokenBadge priority={activeToken.priority} />
                        <button
                          onClick={() => setShowPriorityModal(true)}
                          className="px-3 py-1 bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-300/40 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
                          <span>Request Priority</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-200 block">
                          {t('yourToken')}
                        </span>
                        <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white block mt-1">
                          {activeToken.tokenNumber}
                        </span>
                        <span className="text-[10px] text-teal-200/80 block mt-1">Position #{activeToken.queuePosition}</span>
                      </div>

                      <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-200 block">
                          {t('nowServing')}
                        </span>
                        <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-emerald-300 block mt-1">
                          {queueState.currentTokenBeingServed}
                        </span>
                        <span className="text-[10px] text-teal-200/80 block mt-1">{t('insideRoom')} {queueState.roomNumber}</span>
                      </div>

                      <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-200 block">
                          {t('peopleAhead')}
                        </span>
                        <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-amber-300 block mt-1">
                          {activeToken.peopleAhead ?? 0}
                        </span>
                        <span className="text-[10px] text-teal-200/80 block mt-1">{t('inFrontOfYou')}</span>
                      </div>

                      <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-200 block">
                          {t('estimatedWait')}
                        </span>
                        <span className="text-3xl sm:text-4xl font-black text-white block mt-1">
                          ~{activeToken.estimatedWaitMin || 5}–{activeToken.estimatedWaitMax || 15}{t('mins')}
                        </span>
                        <span className="text-[10px] text-teal-200/80 block mt-1">{t('movingAverageEta')}</span>
                      </div>
                    </div>

                    {/* Stepper */}
                    <div className="bg-black/20 p-4 rounded-2xl border border-white/10">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 block mb-3">
                        {t('queueLifecycle')}
                      </span>
                      <div className="flex items-center justify-between relative">
                        <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/20 -translate-y-1/2 -z-0" />
                        {[
                          { step: 1, label: t('booked'), active: true },
                          { step: 2, label: t('inQueue'), active: true },
                          { step: 3, label: t('approaching'), active: (activeToken.peopleAhead ?? 5) <= 1 },
                          { step: 4, label: t('called'), active: activeToken.status === 'Called' || activeToken.status === 'In Consultation' },
                          { step: 5, label: t('inConsultation'), active: activeToken.status === 'In Consultation' },
                        ].map((st, i) => (
                          <div key={i} className="flex flex-col items-center gap-1.5 relative z-10">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-md ${
                                st.active
                                  ? 'bg-emerald-400 text-slate-900 ring-4 ring-emerald-400/30'
                                  : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {st.active ? <CheckCircle2 className="w-4 h-4" /> : st.step}
                            </div>
                            <span className={`text-[10px] font-bold ${st.active ? 'text-white' : 'text-slate-400'}`}>
                              {st.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Attending Doctor Info */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-teal-300">
                          <Stethoscope className="w-5 h-5" />
                        </div>
                        <div>
                          <strong className="text-sm font-bold block">{activeToken.doctorId?.userId?.name || queueState.doctorName}</strong>
                          <span className="text-xs text-teal-200">
                            {t('room')}: <strong>{activeToken.doctorId?.roomNumber || queueState.roomNumber}</strong> • {t('status')}: {t(queueState.doctorStatus)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCancelToken}
                          className="px-3.5 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 text-xs font-bold rounded-xl transition-all"
                        >
                          {t('cancelToken')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Patient Preparation Guide */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    <span>Clinic Waiting Area Instructions</span>
                  </h4>
                  <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                    <li>Please keep your audio notifications unmuted to receive audio chimes when your token is called.</li>
                    <li>When your token turns to <strong>"Approaching"</strong> (1 person ahead), please move closer to <strong>{queueState.roomNumber}</strong>.</li>
                    <li>If you feel sudden severe distress or pain, use the <strong>"Request Priority"</strong> button above for immediate medical attention.</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-4 shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto border border-teal-100 shadow-xs">
                  <Activity className="w-8 h-8" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h3 className="text-lg font-black text-slate-900">{t('noActiveToken')}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {t('noActiveTokenDesc')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('book');
                    setBookingStep(1);
                  }}
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/30 inline-flex items-center gap-2 transition-all hover:scale-105"
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>{t('bookAppointment')}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 7. TAB: CONSULTATION HISTORY */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-teal-600" />
                  <span>{t('consultationHistory')}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Past medical consultations, doctor notes, diagnosis summaries, and treatment records.
                </p>
              </div>
            </div>

            {myAppointments.filter((a) => a.status === 'Completed').length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No completed consultations yet"
                description="Once you finish a consultation with an attending physician, the medical records and prescription notes will be safely archived here."
                actionLabel="Book New Consultation"
                onAction={() => {
                  setActiveTab('book');
                  setBookingStep(1);
                }}
              />
            ) : (
              <div className="space-y-4">
                {myAppointments
                  .filter((a) => a.status === 'Completed')
                  .map((record) => (
                    <div
                      key={record._id}
                      className="p-5 rounded-2xl border border-slate-200 hover:border-teal-200 bg-slate-50/60 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                            <Stethoscope className="w-5 h-5 text-teal-700" />
                          </div>
                          <div>
                            <strong className="text-sm font-bold text-slate-900 block">
                              {record.doctorId?.userId?.name || 'Dr. Specialist'}
                            </strong>
                            <span className="text-xs text-teal-700 font-semibold">
                              {record.departmentId?.name || 'Clinical OPD'} • {record.doctorId?.roomNumber || 'Room 101'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Completed Consultation
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            Token: <strong>{record.tokenNumber}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                            Reason for Visit / Symptoms
                          </span>
                          <p className="text-slate-800 font-medium">
                            {record.reasonForVisit || 'General Medical Consultation'}
                          </p>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                            Physician Notes & Clinical Advice
                          </span>
                          <p className="text-slate-800 font-medium italic">
                            {record.consultationNotes || 'Consultation concluded successfully. Follow healthy lifestyle practices.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-teal-600" />
                          <span>Date: {record.appointmentDate} at {record.timeSlot}</span>
                        </span>
                        <span className="text-teal-700 font-bold">Verified Medical Record</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Priority Request Modal */}
      {showPriorityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <h4 className="text-base font-black text-slate-900">Request Priority Upgrade</h4>
              </div>
              <button
                onClick={() => {
                  setShowPriorityModal(false);
                  setPriorityStatusMsg('');
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {priorityStatusMsg && (
              <div className="p-3 bg-teal-50 border border-teal-200 text-teal-900 rounded-xl text-xs font-semibold">
                {priorityStatusMsg}
              </div>
            )}

            <form onSubmit={handleRequestPriority} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Priority Reason Category
                </label>
                <select
                  value={priorityCategory}
                  onChange={(e) => setPriorityCategory(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="Severe Pain">Severe Acute Pain</option>
                  <option value="Elderly">Elderly Patient (Above 65 Years)</option>
                  <option value="Physical Disability">Physical Disability / Wheelchair</option>
                  <option value="Infant">Infant / Pediatric Distress</option>
                  <option value="Pregnancy">Pregnancy Emergency</option>
                  <option value="Other">Other Clinical Urgent Condition</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Explain Medical Reason / Symptoms
                </label>
                <textarea
                  rows={3}
                  required
                  value={priorityReason}
                  onChange={(e) => setPriorityReason(e.target.value)}
                  placeholder="Describe why fast-track medical attention is needed..."
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPriorityModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={prioritySubmitting}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{prioritySubmitting ? 'Submitting...' : 'Submit Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctor Profile Modal */}
      {selectedDoctorForModal && (
        <DoctorProfileModal
          doctor={selectedDoctorForModal}
          isOpen={!!selectedDoctorForModal}
          onClose={() => setSelectedDoctorForModal(null)}
          onBookAppointment={(doc) => {
            setSelectedDoctor(doc);
            setActiveTab('book');
            setBookingStep(3);
          }}
        />
      )}

      {/* Turn Alert Modal */}
      <TurnAlertModal />

      {/* QR Code Modal */}
      {showQRModal && (
        <QRCodeModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          doctorId={activeToken?.doctorId?._id || ''}
          departmentId={activeToken?.departmentId?._id || ''}
          doctorName={activeToken?.doctorId?.userId?.name || queueState.doctorName || 'Attending Physician'}
          roomNumber={activeToken?.doctorId?.roomNumber || queueState.roomNumber || 'Room 101'}
        />
      )}
    </DashboardLayout>
  );
};

export default PatientDashboard;
