import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import API from '../services/api';
import { DashboardLayout } from '../components/common/DashboardLayout';
import { StatusBadge } from '../components/common/StatusBadge';
import { TokenBadge } from '../components/common/TokenBadge';
import { EmptyState } from '../components/common/EmptyState';
import { DoctorProfileModal } from '../components/common/DoctorProfileModal';
import {
  Stethoscope,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Calendar,
  ClipboardList,
  ArrowRight,
  TrendingUp,
  MapPin,
  Award,
  DollarSign,
  FileText,
  Search,
  Filter,
  RefreshCw,
  PhoneCall,
  UserX,
  Play,
  Check,
  Pill,
} from 'lucide-react';

export const DoctorDashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, queue, appointments, consultations, profile
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [currentToken, setCurrentToken] = useState(null);
  const [waitingQueue, setWaitingQueue] = useState([]);
  const [completedToday, setCompletedToday] = useState(0);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [consultationHistory, setConsultationHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Clinical Notes & Prescription for active consultation
  const [clinicalDoc, setClinicalDoc] = useState({
    diagnosis: '',
    consultationNotes: '',
    prescription: '',
  });

  // Filter & Search states
  const [queueSearch, setQueueSearch] = useState('');
  const [queueFilter, setQueueFilter] = useState('all'); // all, waiting, called, in_consultation

  // Live timer tick for waiting times & consultation stopwatch
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatElapsedTime = (startTime) => {
    if (!startTime) return '00:00';
    const elapsedSecs = Math.max(0, Math.floor((now - new Date(startTime).getTime()) / 1000));
    const mins = Math.floor(elapsedSecs / 60);
    const secs = elapsedSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatWaitTime = (joinedTime) => {
    if (!joinedTime) return '0m';
    const elapsedMins = Math.max(0, Math.floor((now - new Date(joinedTime).getTime()) / 60000));
    return `${elapsedMins} mins`;
  };

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      const [queueRes, apptRes, historyRes] = await Promise.all([
        API.get('/queue/doctor-queue/single'),
        API.get('/appointments/doctor'),
        API.get('/queue/doctor-history'),
      ]);

      setDoctorInfo(queueRes.data.doctor);
      setCurrentToken(queueRes.data.currentToken || null);
      setWaitingQueue(queueRes.data.waitingList || []);
      setCompletedToday(queueRes.data.completedToday || 0);

      setTodayAppointments(apptRes.data.appointments || []);
      setConsultationHistory(historyRes.data || []);
    } catch (err) {
      console.error('Failed to fetch doctor dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorData();
  }, []);

  // Socket updates for live queue advancement
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchDoctorData();
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

  // Doctor Availability status toggle
  const handleStatusChange = async (newStatus) => {
    try {
      await API.put('/doctors/status', { status: newStatus });
      setDoctorInfo((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update doctor status');
    }
  };

  // Action: Call Next Patient (atomic)
  const handleCallNext = async () => {
    setActionLoading(true);
    try {
      const { data } = await API.post('/queue/call-next');
      await fetchDoctorData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error calling next patient');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Patient Attended (Step 2: Called -> In Consultation)
  const handlePatientAttended = async () => {
    setActionLoading(true);
    try {
      await API.post('/queue/patient-attended');
      await fetchDoctorData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error marking patient attended');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Complete Consultation (Step 3: saves notes & prescription)
  const handleCompleteConsultation = async () => {
    setActionLoading(true);
    try {
      await API.post('/queue/end-consultation', {
        consultationNotes: clinicalDoc.consultationNotes,
        diagnosis: clinicalDoc.diagnosis,
        prescription: clinicalDoc.prescription,
      });
      setClinicalDoc({ diagnosis: '', consultationNotes: '', prescription: '' });
      await fetchDoctorData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error completing consultation');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Skip / Re-queue
  const handleSkipPatient = async () => {
    if (!currentToken) return;
    if (!window.confirm(`Skip patient ${currentToken.tokenNumber} and move to end of queue?`)) return;
    setActionLoading(true);
    try {
      await API.put(`/queue/missed-call-timeout/${currentToken._id}`);
      await fetchDoctorData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error skipping patient');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered queue items
  const filteredQueue = waitingQueue.filter((item) => {
    const matchesSearch =
      !queueSearch ||
      item.patientName?.toLowerCase().includes(queueSearch.toLowerCase()) ||
      item.tokenNumber?.toLowerCase().includes(queueSearch.toLowerCase());

    if (!matchesSearch) return false;
    if (queueFilter === 'all') return true;
    if (queueFilter === 'waiting') return item.status === 'Waiting';
    if (queueFilter === 'called') return item.status === 'Called';
    return true;
  });

  return (
    <DashboardLayout
      role="doctor"
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div className="space-y-6">

        {/* 1. DOCTOR PROFILE BANNER & AVAILABILITY CONTROLS */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative">
              <img
                src={doctorInfo?.profileImage || user?.photoURL || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300'}
                alt={user?.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-teal-500 shadow-md shrink-0"
              />
              <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${
                doctorInfo?.status === 'Available' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  {doctorInfo?.userId?.name || user?.name}
                </h1>
                <StatusBadge status={doctorInfo?.status || 'Available'} />
              </div>
              <p className="text-xs font-bold text-teal-700">
                {doctorInfo?.specialization} • {doctorInfo?.qualification}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  <span>{doctorInfo?.roomNumber || 'Room 101'}</span>
                </span>
                <span>•</span>
                <span>Timings: <strong className="text-slate-700">{doctorInfo?.startTime || '08:30 AM'} - {doctorInfo?.endTime || '05:00 PM'}</strong></span>
                <span>•</span>
                <span>Experience: <strong className="text-slate-700">{doctorInfo?.experience || 12} yrs</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Doctor Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => setShowProfileModal(true)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors w-full sm:w-auto"
            >
              View Full Profile
            </button>

            {/* Status Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-200 w-full sm:w-auto overflow-x-auto">
              {['Available', 'Busy', 'On Break', 'Delayed'].map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                    doctorInfo?.status === st
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. TOP SUMMARY METRIC CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Today's Appointments</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-slate-900">{todayAppointments.length}</span>
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Booked for Dr. {user?.name?.split(' ')?.[1] || 'Doctor'}</span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Waiting Patients</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-amber-600">{waitingQueue.length}</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">In your dedicated queue</span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Currently Serving</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-teal-700 font-mono">
                {currentToken ? currentToken.tokenNumber : '--'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              {currentToken ? currentToken.status : 'Room Available'}
            </span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Completed Today</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-emerald-600">{completedToday}</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Consultations finalized</span>
          </div>

          <div className="col-span-2 lg:col-span-1 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Avg Duration</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-slate-900">
                {doctorInfo?.avgConsultationDuration || 10}m
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Moving avg of last 20</span>
          </div>
        </div>

        {/* 3. MAIN DASHBOARD CONTENT (Split between Active Patient & Queue) */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT 7 COLUMNS: ACTIVE PATIENT CONSULTATION CONSOLE */}
            <div className="lg:col-span-7 space-y-6">

              {/* PRIMARY CLINICAL WORKFLOW CONTROL */}
              <div className="bg-white rounded-3xl p-6 border-2 border-teal-500 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-teal-800 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-teal-600" />
                    <span>Clinical Consultation Console</span>
                  </span>
                  {currentToken && (
                    <span className="text-xs font-mono font-bold bg-slate-100 px-3 py-1 rounded-xl text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-teal-600" />
                      <span>Elapsed: {formatElapsedTime(currentToken.consultationStartTime || currentToken.calledAt)}</span>
                    </span>
                  )}
                </div>

                {!currentToken ? (
                  <div className="space-y-3">
                    <button
                      onClick={handleCallNext}
                      disabled={actionLoading || waitingQueue.length === 0}
                      className="w-full py-5 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-black text-lg rounded-2xl shadow-lg shadow-teal-600/30 flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                    >
                      <PhoneCall className="w-6 h-6" />
                      <span>{actionLoading ? 'Calling Next Patient...' : 'CALL NEXT PATIENT'}</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                    <p className="text-xs text-slate-400 text-center">
                      Identifies next eligible patient in Dr. {user?.name?.split(' ')?.[1] || 'Doctor'}'s queue ordered by priority & waiting time.
                    </p>
                  </div>
                ) : currentToken.status === 'Called' ? (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs font-bold text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-amber-600 animate-spin shrink-0" />
                        <div>
                          <span className="block text-sm font-black text-amber-950">
                            Patient Called: {currentToken.tokenNumber} ({currentToken.patientName})
                          </span>
                          <span className="text-amber-800">Awaiting arrival to Consultation {doctorInfo?.roomNumber || 'Room 101'}</span>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-amber-200 text-amber-900 rounded-full font-bold text-[11px] shrink-0">
                        2:00 Call Window
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={handlePatientAttended}
                        disabled={actionLoading}
                        className="py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Start Consultation / Attended</span>
                      </button>

                      <button
                        onClick={handleSkipPatient}
                        disabled={actionLoading}
                        className="py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl border border-slate-200 flex items-center justify-center gap-2 transition-all"
                      >
                        <UserX className="w-4 h-4 text-amber-600" />
                        <span>Skip / Re-queue Patient</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs font-bold text-emerald-900 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                        <span>Active Consultation in Progress ({currentToken.tokenNumber} - {currentToken.patientName})</span>
                      </span>
                      <span className="font-mono text-emerald-800">Room {doctorInfo?.roomNumber}</span>
                    </div>

                    {/* CLINICAL DOCUMENTATION FORM (Notes, Diagnosis, Prescription) */}
                    <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                        Clinical Documentation (Diagnosis & Prescription)
                      </span>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Primary Medical Diagnosis
                        </label>
                        <input
                          type="text"
                          value={clinicalDoc.diagnosis}
                          onChange={(e) => setClinicalDoc({ ...clinicalDoc, diagnosis: e.target.value })}
                          placeholder="e.g. Acute Upper Respiratory Infection / Hypertension Stage 1"
                          className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Consultation Clinical Notes / Advice
                        </label>
                        <textarea
                          rows={2}
                          value={clinicalDoc.consultationNotes}
                          onChange={(e) => setClinicalDoc({ ...clinicalDoc, consultationNotes: e.target.value })}
                          placeholder="Document examination findings, history, and advice..."
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                          <Pill className="w-3.5 h-3.5 text-teal-600" />
                          <span>Prescription / Medications (Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={clinicalDoc.prescription}
                          onChange={(e) => setClinicalDoc({ ...clinicalDoc, prescription: e.target.value })}
                          placeholder="e.g. Tab Paracetamol 650mg TDS x 3 days, Cetirizine 10mg HS"
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleCompleteConsultation}
                      disabled={actionLoading}
                      className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-base rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>{actionLoading ? 'Saving & Completing...' : 'COMPLETE CONSULTATION'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* CURRENT PATIENT CLINICAL DETAILS CARD */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-teal-600" />
                    <span>Currently Serving Patient Details</span>
                  </h3>
                  {currentToken && <TokenBadge priority={currentToken.priority} />}
                </div>

                {!currentToken ? (
                  <div className="text-center py-12 text-slate-400 space-y-2">
                    <Users className="w-10 h-10 mx-auto text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">No patient is currently inside the consultation room.</p>
                    <p className="text-[11px] text-slate-400">Click "Call Next Patient" above to advance your queue.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Token & Status Banner */}
                    <div className="bg-teal-50/70 p-5 rounded-2xl border border-teal-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 block">Queue Token</span>
                        <span className="text-4xl font-black text-teal-900 font-mono">{currentToken.tokenNumber}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 font-bold block uppercase">Status</span>
                        <span className="inline-block mt-0.5 px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full">
                          {currentToken.status}
                        </span>
                      </div>
                    </div>

                    {/* Urgent Triage Banner if Flagged */}
                    {currentToken.isUrgentFlagged && (
                      <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-red-900">
                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-black text-red-950 block">TRIAGE ASSISTANT ALERT</strong>
                          <span>{currentToken.triageNote || 'High priority symptoms detected during token intake.'}</span>
                        </div>
                      </div>
                    )}

                    {/* Patient Core Demographics */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Patient Name</span>
                        <strong className="text-slate-900 text-sm block mt-0.5 truncate">{currentToken.patientName}</strong>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Age / Gender</span>
                        <strong className="text-slate-900 text-sm block mt-0.5">{currentToken.patientAge}y • {currentToken.patientGender}</strong>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Check-In / Wait</span>
                        <strong className="text-slate-900 text-sm block mt-0.5">{formatWaitTime(currentToken.joinedTime)}</strong>
                      </div>
                    </div>

                    {/* Reason for Visit / Medical Details */}
                    <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 block">
                        Illness Symptoms & Reason for Visit
                      </span>
                      <p className="text-xs font-semibold text-amber-950 leading-relaxed">
                        "{currentToken.reasonForVisit}"
                      </p>
                      <div className="flex flex-wrap gap-4 pt-1 text-[11px] text-amber-800">
                        <span>Duration: <strong>{currentToken.symptomsDuration || '1-2 days'}</strong></span>
                        <span>Existing Conditions: <strong>{currentToken.existingConditions || 'None'}</strong></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT 5 COLUMNS: MY PATIENT QUEUE (DOCTOR-SPECIFIC!) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-teal-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      My Patient Queue ({waitingQueue.length})
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                    Dr. {user?.name?.split(' ')?.[1] || 'Doctor'} Queue
                  </span>
                </div>

                {waitingQueue.length === 0 ? (
                  <EmptyState
                    icon={CheckCircle2}
                    title="Your queue is currently empty"
                    description="All patients booked for your OPD consultations have been attended or no new patients are waiting."
                  />
                ) : (
                  <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                    {waitingQueue.map((item, idx) => (
                      <div
                        key={item._id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          idx === 0
                            ? 'bg-teal-50/70 border-teal-300 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-teal-900 bg-teal-100/70 px-2 py-0.5 rounded-lg">
                              {item.tokenNumber}
                            </span>
                            <span className="text-xs font-bold text-slate-900 truncate max-w-[130px]">
                              {item.patientName}
                            </span>
                          </div>
                          <TokenBadge priority={item.priority} />
                        </div>

                        <p className="text-[11px] text-slate-600 line-clamp-1 italic mb-2">
                          "{item.reasonForVisit}"
                        </p>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                          <span>Waited: <strong className="text-slate-800">{formatWaitTime(item.joinedTime)}</strong></span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* 4. TAB: MY PATIENT QUEUE (FULL TABLE VIEW) */}
        {activeTab === 'queue' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-teal-600" />
                  <span>Doctor-Specific Patient Queue</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time active queue for Dr. {user?.name}. Only patients assigned to this doctor are visible.
                </p>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search patient or token..."
                    value={queueSearch}
                    onChange={(e) => setQueueSearch(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <button
                  onClick={fetchDoctorData}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl"
                  title="Refresh Queue"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Token</th>
                    <th className="py-3 px-4">Patient Name</th>
                    <th className="py-3 px-4">Age / Gender</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Symptoms / Reason</th>
                    <th className="py-3 px-4">Waiting Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No patients matching current queue filter.
                      </td>
                    </tr>
                  ) : (
                    filteredQueue.map((t, idx) => (
                      <tr key={t._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-black text-teal-800 text-sm">
                          {t.tokenNumber}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {t.patientName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {t.patientAge}y • {t.patientGender}
                        </td>
                        <td className="py-3.5 px-4">
                          <TokenBadge priority={t.priority} />
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                          {t.reasonForVisit}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {formatWaitTime(t.joinedTime)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-800 font-bold rounded-full border border-amber-200 text-[10px]">
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {idx === 0 && !currentToken ? (
                            <button
                              onClick={handleCallNext}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs"
                            >
                              Call Now
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">In Queue</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. TAB: TODAY'S APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600" />
                <span>Today's Appointments Roster ({todayAppointments.length})</span>
              </h3>
              <p className="text-xs text-slate-500">
                All pre-scheduled outpatient bookings for Dr. {user?.name} today.
              </p>
            </div>

            {todayAppointments.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No appointments scheduled for today"
                description="Patients who book an appointment with you will appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Time Slot</th>
                      <th className="py-3 px-4">Token</th>
                      <th className="py-3 px-4">Patient Name</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Reason for Visit</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {todayAppointments.map((appt) => (
                      <tr key={appt._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {appt.timeSlot}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-teal-800">
                          {appt.tokenNumber}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {appt.patientName} ({appt.patientAge}y)
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {appt.patientMobile || '--'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-sm truncate">
                          {appt.reasonForVisit}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 font-bold rounded-full text-[10px] ${
                            appt.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : appt.status === 'In Consultation'
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {appt.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 6. TAB: CONSULTATION RECORDS & HISTORY */}
        {activeTab === 'consultations' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-teal-600" />
                <span>Consultation Records & Clinical History ({consultationHistory.length})</span>
              </h3>
              <p className="text-xs text-slate-500">
                Log of completed consultations with diagnosis and prescription records.
              </p>
            </div>

            {consultationHistory.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No completed consultations yet"
                description="When you complete patient consultations, their records and history will be recorded here."
              />
            ) : (
              <div className="space-y-3">
                {consultationHistory.map((item) => (
                  <div key={item._id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-teal-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-sm">
                          {item.tokenNumber}
                        </span>
                        <div>
                          <strong className="text-slate-900 text-sm block">{item.patientId?.name || 'Patient'}</strong>
                          <span className="text-[11px] text-slate-500">Completed at {new Date(item.completedTime || item.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[10px]">
                          Duration: {item.consultationDurationMinutes || 10} mins
                        </span>
                        <TokenBadge priority={item.priority} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                      {item.diagnosis && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Diagnosis:</span>
                          <span className="text-slate-800 font-semibold">{item.diagnosis}</span>
                        </div>
                      )}
                      {item.prescription && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Prescription:</span>
                          <span className="text-teal-900 font-semibold">{item.prescription}</span>
                        </div>
                      )}
                    </div>
                    {item.consultationNotes && (
                      <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                        "{item.consultationNotes}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Doctor Profile Modal */}
      {showProfileModal && (
        <DoctorProfileModal
          doctor={doctorInfo}
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </DashboardLayout>
  );
};

export default DoctorDashboard;
