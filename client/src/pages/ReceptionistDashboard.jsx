import React, { useEffect, useState } from 'react';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import API from '../services/api';
import {
  Users,
  UserCheck,
  Stethoscope,
  Clock,
  PlusCircle,
  Search,
  FileText,
  AlertTriangle,
  Edit,
  ShieldCheck,
  CheckCircle2,
  Activity,
  BarChart3,
  Download,
  Flame,
  Shield,
  History,
  XCircle,
  Check,
  Sparkles,
  MessageSquare,
  Radio,
  Phone,
  Mail,
  UserPlus,
  RefreshCw,
  Bell,
  ArrowRight,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { TokenBadge } from '../components/common/TokenBadge';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

export const ReceptionistDashboard = () => {
  const { user, switchDemoRole } = useAuth();
  const { socket } = useSocket();
  const { t } = useLanguage();

  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');

  const [queueInfo, setQueueInfo] = useState({});
  const [waitingList, setWaitingList] = useState([]);
  const [priorityRequests, setPriorityRequests] = useState([]);
  const [notesInput, setNotesInput] = useState({});
  const [activeEmergencyAlert, setActiveEmergencyAlert] = useState(null);

  // Patient Registration Approvals State
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [approvalSearch, setApprovalSearch] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Tabs: approvals, walkin, priority_requests, analytics, audit_logs, doctor_edit
  const [activeTab, setActiveTab] = useState('approvals');

  // Walk-in & Token State
  const [patientSearch, setPatientSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showWalkinModal, setShowWalkinModal] = useState(false);

  const [walkinForm, setWalkinForm] = useState({
    name: '', mobile: '', gender: 'Male', age: 30, bloodGroup: 'O+',
  });

  const [tokenForm, setTokenForm] = useState({
    reasonForVisit: '',
    symptomsDuration: '2 days',
    existingConditions: 'None',
    priority: 'Normal',
    priorityReason: '',
  });

  // Doctor Info Edit State
  const [docEditForm, setDocEditForm] = useState({
    name: '', roomNumber: 'Room 101', startTime: '08:30 AM', endTime: '05:00 PM', defaultDuration: 10, qualification: '', specialization: '',
  });

  // Analytics & Audit Data
  const [dailyStats, setDailyStats] = useState({});
  const [etaAccuracyData, setEtaAccuracyData] = useState({ dataPoints: [], overallAccuracyPercentage: 92, averageErrorMinutes: 2.1 });
  const [auditLogs, setAuditLogs] = useState([]);

  const playEmergencyChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      [880, 1174.66, 880, 1174.66].forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(freq, now + idx * 0.2);
        gain.gain.setValueAtTime(0.3, now + idx * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.2 + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.2);
        osc.stop(now + idx * 0.2 + 0.35);
      });
    } catch (e) {}
  };

  const playSoftChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      [587.33, 880].forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);
        gain.gain.setValueAtTime(0.2, now + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.25);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.25);
      });
    } catch (e) {}
  };

  // Fetch pending registrations
  const fetchPendingRegistrations = async () => {
    setLoadingRegistrations(true);
    try {
      const { data } = await API.get('/patients?status=Pending');
      setPendingRegistrations(data?.patients || []);
    } catch (e) {
      console.error('Error fetching pending registrations:', e);
    } finally {
      setLoadingRegistrations(false);
    }
  };

  const fetchDepartmentsAndDoctors = async () => {
    try {
      const [deptRes, docRes] = await Promise.all([
        API.get('/departments'),
        API.get('/doctors'),
      ]);
      setDepartments(deptRes.data || []);
      setDoctors(docRes.data || []);
      if (docRes.data?.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(docRes.data[0]._id);
      }
      if (deptRes.data?.length > 0 && !selectedDeptId) {
        setSelectedDeptId(deptRes.data[0]._id);
      }
    } catch (e) {
      console.error('Error loading departments and doctors', e);
    }
  };

  const fetchPriorityRequests = async () => {
    try {
      const { data } = await API.get('/priority/requests');
      setPriorityRequests(data || []);
    } catch (e) {
      console.error('Error loading priority requests', e);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const [statsRes, etaRes, auditRes] = await Promise.all([
        API.get('/reports/daily-stats'),
        API.get('/reports/eta-accuracy'),
        API.get('/reports/audit-logs?limit=30'),
      ]);
      setDailyStats(statsRes.data || {});
      setEtaAccuracyData(etaRes.data || { dataPoints: [], overallAccuracyPercentage: 90, averageErrorMinutes: 2.5 });
      setAuditLogs(auditRes.data?.logs || []);
    } catch (e) {
      console.error('Error fetching analytics reports', e);
    }
  };

  const loadData = async (docId = selectedDoctorId) => {
    try {
      const targetDocId = docId || selectedDoctorId;
      const [displayRes, queueRes] = await Promise.all([
        API.get(targetDocId ? `/queue/public-display?doctorId=${targetDocId}` : '/queue/public-display'),
        API.get(targetDocId ? `/queue/doctor-queue/${targetDocId}` : '/queue/doctor-queue/single'),
      ]);

      setQueueInfo(displayRes.data);
      setWaitingList(queueRes.data.waitingList || []);
      fetchPriorityRequests();

      if (queueRes.data.doctor) {
        setDocEditForm({
          name: queueRes.data.doctor.userId?.name || '',
          roomNumber: queueRes.data.doctor.roomNumber || 'Room 101',
          startTime: queueRes.data.doctor.startTime || '08:30 AM',
          endTime: queueRes.data.doctor.endTime || '05:00 PM',
          defaultDuration: queueRes.data.doctor.defaultDuration || 10,
          qualification: queueRes.data.doctor.qualification || '',
          specialization: queueRes.data.doctor.specialization || '',
        });
      }
    } catch (e) {
      console.error('Error loading receptionist data', e);
    }
  };

  useEffect(() => {
    const initializeDashboard = async () => {
      if (!user || (user.role !== 'receptionist' && user.role !== 'admin')) {
        try {
          await switchDemoRole('receptionist');
        } catch (e) {
          console.warn('Auto receptionist switch error:', e);
        }
      }
      fetchPendingRegistrations();
      fetchDepartmentsAndDoctors();
      fetchPriorityRequests();
      fetchAnalytics();
    };
    initializeDashboard();
  }, []);

  useEffect(() => {
    if (selectedDoctorId) {
      loadData(selectedDoctorId);
    }
  }, [selectedDoctorId]);

  // Real-time socket events for registrations & priorities
  useEffect(() => {
    if (!socket) return;

    socket.on('new_patient_registration', (patient) => {
      fetchPendingRegistrations();
      playEmergencyChime();
      setActionSuccessMsg(`New Patient Registration: ${patient.name || 'New Patient'} is waiting for approval!`);
      setTimeout(() => setActionSuccessMsg(''), 5000);
    });

    socket.on('patient_waiting_message', (payload) => {
      fetchPendingRegistrations();
      playSoftChime();
      setActionSuccessMsg(`📢 Urgent note from ${payload.patientName}: "${payload.message}"`);
      setTimeout(() => setActionSuccessMsg(''), 6000);
    });

    socket.on('patient_approval_updated', () => {
      fetchPendingRegistrations();
    });

    socket.on('queue_updated', () => { loadData(selectedDoctorId); fetchAnalytics(); });
    socket.on('doctor_status_changed', () => loadData(selectedDoctorId));
    socket.on('priority_request_submitted', (req) => {
      fetchPriorityRequests();
      loadData(selectedDoctorId);
      playEmergencyChime();
      if (req) setActiveEmergencyAlert(req);
    });
    socket.on('priority_request_updated', () => {
      fetchPriorityRequests();
      loadData(selectedDoctorId);
    });

    return () => {
      socket.off('new_patient_registration');
      socket.off('patient_waiting_message');
      socket.off('patient_approval_updated');
      socket.off('queue_updated');
      socket.off('doctor_status_changed');
      socket.off('priority_request_submitted');
      socket.off('priority_request_updated');
    };
  }, [socket, selectedDoctorId]);

  // Receptionist Approves Patient Registration
  const handleApproveRegistration = async (patient, autoIssueToken = false) => {
    try {
      await API.put(`/patients/${patient._id}/approve`);
      setPendingRegistrations((prev) => prev.filter((p) => p._id !== patient._id));
      setActionSuccessMsg(`✓ Approved ${patient.name}! Patient has been admitted and redirected to their dashboard.`);
      setTimeout(() => setActionSuccessMsg(''), 4000);

      if (autoIssueToken) {
        setSelectedPatient(patient);
        setTokenForm((prev) => ({
          ...prev,
          reasonForVisit: patient.reasonForVisit || '',
        }));
        setActiveTab('walkin');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error approving registration.');
    }
  };

  // Receptionist Rejects Patient Registration
  const handleRejectRegistration = async (patientId) => {
    const reason = window.prompt('Please enter the reason for declining this registration request:');
    if (reason === null) return; // cancelled
    try {
      await API.put(`/patients/${patientId}/reject`, { reason });
      setPendingRegistrations((prev) => prev.filter((p) => p._id !== patientId));
      setActionSuccessMsg('Registration request declined.');
      setTimeout(() => setActionSuccessMsg(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Error declining registration.');
    }
  };

  const handleReviewPriority = async (id, status) => {
    try {
      await API.put(`/priority/review/${id}`, {
        status,
        receptionistNotes: notesInput[id] || '',
      });
      fetchPriorityRequests();
      loadData(selectedDoctorId);
      if (activeEmergencyAlert && activeEmergencyAlert._id === id) {
        setActiveEmergencyAlert(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error reviewing priority request');
    }
  };

  const handleSearchPatient = async (q) => {
    setPatientSearch(q);
    if (!q || !q.trim()) { setSearchResults([]); return; }
    try {
      const { data } = await API.get(`/patients/search?query=${encodeURIComponent(q.trim())}`);
      setSearchResults(data);
    } catch (e) {}
  };

  const handleRegisterWalkin = async (e) => {
    e.preventDefault();
    try {
      const { data } = await API.post('/patients/walkin', walkinForm);
      setSelectedPatient(data);
      setShowWalkinModal(false);
      setWalkinForm({ name: '', mobile: '', gender: 'Male', age: 30, bloodGroup: 'O+' });
      alert(`Walk-In Patient registered successfully! ID: ${data.patientId}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Error registering walk-in patient');
    }
  };

  const handleGenerateToken = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return alert('Please select or register a patient first.');
    if (!tokenForm.reasonForVisit || !tokenForm.reasonForVisit.trim()) {
      return alert('Reason for Visit / Illness & Symptoms is mandatory');
    }

    try {
      const { data } = await API.post('/queue/join', {
        ...tokenForm,
        doctorId: selectedDoctorId,
        departmentId: selectedDeptId,
        patientIdOverride: selectedPatient._id,
        name: selectedPatient.name,
        gender: selectedPatient.gender,
        mobile: selectedPatient.mobile,
      });

      alert(`Token ${data.tokenNumber} generated successfully for ${selectedPatient.name}!`);
      setSelectedPatient(null);
      setTokenForm({ reasonForVisit: '', symptomsDuration: '2 days', existingConditions: 'None', priority: 'Normal', priorityReason: '' });
      loadData(selectedDoctorId);
      fetchAnalytics();
    } catch (err) {
      alert(err.response?.data?.message || 'Error issuing token');
    }
  };

  const handleUpdateDoctorInfo = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId) return;
    try {
      await API.put(`/doctors/${selectedDoctorId}`, docEditForm);
      alert('Doctor details and OPD timings updated successfully!');
      fetchDepartmentsAndDoctors();
      loadData(selectedDoctorId);
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating doctor details');
    }
  };

  const handleExportCSV = async () => {
    try {
      window.open('/api/reports/export/csv?type=daily', '_blank');
    } catch (e) {
      alert('Error exporting CSV');
    }
  };

  const handleExportPDF = async () => {
    try {
      window.open('/api/reports/export/pdf?type=daily', '_blank');
    } catch (e) {
      alert('Error exporting PDF');
    }
  };

  const filteredRegistrations = pendingRegistrations.filter((p) => {
    if (!approvalSearch) return true;
    const term = approvalSearch.toLowerCase();
    return (
      p.name?.toLowerCase().includes(term) ||
      p.patientId?.toLowerCase().includes(term) ||
      p.mobile?.includes(term) ||
      p.reasonForVisit?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <Navbar />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">

        {/* Action / Alert Banner */}
        {actionSuccessMsg && (
          <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2.5 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-200" />
              <span>{actionSuccessMsg}</span>
            </div>
            <button onClick={() => setActionSuccessMsg('')} className="text-white/80 hover:text-white text-xs font-bold">
              Dismiss
            </button>
          </div>
        )}

        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-black uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5 text-teal-600" />
              <span>Front Desk Reception Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Hospital Admissions & OPD Operator
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
              Accept patient registration requests, prioritize walk-ins, manage triage notes, and issue digital queue tokens.
            </p>
          </div>

          {/* Quick Doctor Desk & Now Serving Widgets */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
              <span className="text-slate-400 block font-semibold mb-1">Active Consultation Desk:</span>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 cursor-pointer text-xs"
              >
                {doctors.map((doc) => (
                  <option key={doc._id} value={doc._id}>
                    {doc.userId?.name} ({doc.roomNumber})
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-teal-50/70 p-3 rounded-2xl border border-teal-200 text-center text-xs min-w-[100px]">
              <span className="text-teal-700 block font-bold uppercase tracking-wider text-[10px]">Now Serving</span>
              <strong className="text-teal-900 text-2xl font-black font-mono">{queueInfo.nowServing || '--'}</strong>
            </div>
          </div>
        </div>

        {/* KPI Counter Pills Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div
            onClick={() => setActiveTab('approvals')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              pendingRegistrations.length > 0
                ? 'bg-amber-50 border-amber-300 shadow-sm'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Pending Approvals</span>
              {pendingRegistrations.length > 0 ? (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              ) : (
                <UserCheck className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1 flex items-baseline gap-2">
              <span>{pendingRegistrations.length}</span>
              {pendingRegistrations.length > 0 && (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  Action Required
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">Online patient registrations</span>
          </div>

          <div
            onClick={() => setActiveTab('priority_requests')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              priorityRequests.filter((r) => r.status === 'Pending').length > 0
                ? 'bg-rose-50 border-rose-300 shadow-sm'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Priority Requests</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {priorityRequests.filter((r) => r.status === 'Pending').length}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">Emergency / Senior triage</span>
          </div>

          <div
            onClick={() => setActiveTab('walkin')}
            className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-teal-300 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Waiting in Queue</span>
              <Users className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-2xl font-black text-teal-800 mt-1">
              {waitingList.length}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">Active tokens in room</span>
          </div>

          <div
            onClick={() => setActiveTab('doctor_edit')}
            className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-teal-300 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Doctors On Duty</span>
              <Stethoscope className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {doctors.filter((d) => d.status === 'Available').length} / {doctors.length}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">Available consultation rooms</span>
          </div>
        </div>

        {/* EMERGENCY PRIORITY BANNER IF PENDING REQUESTS EXIST */}
        {priorityRequests.filter((r) => r.status === 'Pending').length > 0 && (
          <div className="bg-amber-500 text-white rounded-2xl p-4 shadow-md flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-100 shrink-0" />
              <div>
                <span className="font-extrabold uppercase tracking-wide text-xs text-amber-100 block">
                  Action Required: Pending Medical Priority Requests
                </span>
                <p className="text-sm font-black">
                  {priorityRequests.filter((r) => r.status === 'Pending').length} Patient(s) have submitted priority upgrade requests!
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('priority_requests')}
              className="px-4 py-2 bg-white text-amber-900 font-extrabold text-xs rounded-xl shadow hover:bg-amber-50 transition-all shrink-0 cursor-pointer"
            >
              Review Requests Now
            </button>
          </div>
        )}

        {/* Main Tab Controls */}
        <div className="flex border-b border-slate-200 font-semibold text-sm gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('approvals')}
            className={`pb-3 flex items-center gap-2 font-black transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'approvals' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Registration Approvals</span>
            {pendingRegistrations.length > 0 && (
              <span className="px-2 py-0.5 text-xs bg-amber-500 text-white rounded-full font-bold animate-pulse">
                {pendingRegistrations.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('walkin')}
            className={`pb-3 flex items-center gap-2 font-bold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'walkin' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Walk-In & Issue Tokens</span>
          </button>

          <button
            onClick={() => setActiveTab('priority_requests')}
            className={`pb-3 flex items-center gap-2 font-bold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'priority_requests' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Priority Requests</span>
            {priorityRequests.filter((r) => r.status === 'Pending').length > 0 && (
              <span className="px-2 py-0.5 text-xs bg-rose-500 text-white rounded-full font-bold animate-pulse">
                {priorityRequests.filter((r) => r.status === 'Pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 flex items-center gap-2 font-bold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'analytics' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Hospital Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('audit_logs')}
            className={`pb-3 flex items-center gap-2 font-bold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'audit_logs' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Audit Trail Logs</span>
          </button>

          <button
            onClick={() => setActiveTab('doctor_edit')}
            className={`pb-3 flex items-center gap-2 font-bold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'doctor_edit' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Doctor Profiles & Timings</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: REGISTRATION APPROVALS (Receptionist Gate)                        */}
        {/* ========================================================================= */}
        {activeTab === 'approvals' && (
          <div className="space-y-6">
            
            {/* Header & Search Bar */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-teal-600" />
                  <span>Incoming Patient Registration Requests ({filteredRegistrations.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Accept patient registrations to unlock their portal access. Admitted patients immediately enter their dashboard.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-grow md:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, ID, mobile, reason..."
                    value={approvalSearch}
                    onChange={(e) => setApprovalSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <button
                  onClick={fetchPendingRegistrations}
                  disabled={loadingRegistrations}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Refresh list"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingRegistrations ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Pending List Cards */}
            {filteredRegistrations.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-slate-800">
                  {approvalSearch ? 'No registrations match your search filter' : 'All Clear! No Pending Registration Requests'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  When new patients self-register online, their files will appear here in real-time for your review and admission.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredRegistrations.map((p) => (
                  <div
                    key={p._id}
                    className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4 relative overflow-hidden"
                  >
                    {/* Header Strip */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200">
                            {p.patientId}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Pending Admission
                          </span>
                        </div>
                        <h4 className="text-base font-black text-slate-900 mt-1.5">
                          {p.name}
                        </h4>
                        <span className="text-xs text-slate-500 font-medium">
                          {p.gender || 'Patient'} • Blood Group: <strong>{p.bloodGroup || 'Unknown'}</strong>
                        </span>
                      </div>

                      <div className="text-right text-[11px] text-slate-400">
                        <span>Registered</span>
                        <div className="font-medium text-slate-600">
                          {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    {/* Contact & Demographics */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Phone className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span className="font-semibold truncate">{p.mobile || 'No Phone'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Mail className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span className="font-medium truncate">{p.email}</span>
                      </div>
                    </div>

                    {/* Stated Reason for Visit */}
                    <div className="bg-teal-50/60 border border-teal-100 rounded-2xl p-3.5 space-y-1">
                      <span className="text-[10px] font-extrabold text-teal-800 uppercase tracking-wider block">
                        Stated Clinical Reason for Visit:
                      </span>
                      <p className="text-xs font-medium text-slate-800 leading-relaxed">
                        {p.reasonForVisit || 'General Health Checkup & OPD Consultation'}
                      </p>
                    </div>

                    {/* URGENT NOTE FROM PATIENT IN WAITING LOUNGE */}
                    {p.waitingMessage && (
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-3.5 text-amber-950 space-y-1 animate-pulse">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Urgent Note from Patient in Lounge:</span>
                          </span>
                          <span className="text-[10px] text-amber-700 font-semibold">
                            {p.waitingMessageTime ? new Date(p.waitingMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 bg-white/70 p-2 rounded-xl border border-amber-200">
                          "{p.waitingMessage}"
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                      <button
                        onClick={() => handleApproveRegistration(p, false)}
                        className="w-full sm:flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Accept & Admit Patient</span>
                      </button>

                      <button
                        onClick={() => handleApproveRegistration(p, true)}
                        className="w-full sm:w-auto px-3.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        title="Accept and immediately generate OPD token"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Admit & Issue Token</span>
                      </button>

                      <button
                        onClick={() => handleRejectRegistration(p._id)}
                        className="w-full sm:w-auto px-3 py-2.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold text-xs rounded-xl border border-slate-200 hover:border-rose-200 transition-all cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: WALKIN & TOKEN ISSUANCE                                           */}
        {/* ========================================================================= */}
        {activeTab === 'walkin' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">1. Select or Register Patient</h3>
                <button
                  onClick={() => setShowWalkinModal(true)}
                  className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs rounded-xl border border-teal-200 flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>New Walk-In Patient</span>
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search existing patient by Name, ID, Mobile..."
                  value={patientSearch}
                  onChange={(e) => handleSearchPatient(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
                  {searchResults.map((p) => (
                    <div
                      key={p._id}
                      onClick={() => { setSelectedPatient(p); setSearchResults([]); setPatientSearch(''); }}
                      className="p-2 hover:bg-teal-100 rounded-lg cursor-pointer flex justify-between text-xs transition-colors"
                    >
                      <div>
                        <strong className="text-slate-900">{p.name}</strong> ({p.gender})
                        <span className="text-slate-500 block">{p.mobile}</span>
                      </div>
                      <span className="font-bold text-teal-700 font-mono">{p.patientId}</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedPatient ? (
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-between text-sm">
                  <div>
                    <span className="text-xs text-teal-700 font-bold uppercase tracking-wider block">Selected Patient</span>
                    <h4 className="font-bold text-slate-900">{selectedPatient.name}</h4>
                    <p className="text-xs text-slate-600">ID: {selectedPatient.patientId} • Mobile: {selectedPatient.mobile || 'None'}</p>
                  </div>
                  <button onClick={() => setSelectedPatient(null)} className="text-xs text-red-600 font-bold hover:underline cursor-pointer">
                    Change
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No patient selected. Search or register a walk-in patient above.</p>
              )}
            </div>

            <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">2. Issue Digital Token with Symptoms</h3>

              <form onSubmit={handleGenerateToken} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Department *</label>
                    <select
                      value={selectedDeptId}
                      onChange={(e) => {
                        setSelectedDeptId(e.target.value);
                        const docs = doctors.filter((d) => d.departmentId?._id === e.target.value || d.departmentId === e.target.value);
                        if (docs.length > 0) setSelectedDoctorId(docs[0]._id);
                      }}
                      className="w-full px-3 py-2 border rounded-xl text-xs bg-white"
                    >
                      {departments.map((dept) => (
                        <option key={dept._id} value={dept._id}>
                          {dept.name} ({dept.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Doctor & Room *</label>
                    <select
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl text-xs bg-white"
                    >
                      {doctors.map((doc) => (
                        <option key={doc._id} value={doc._id}>
                          {doc.userId?.name} ({doc.roomNumber})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-teal-800 mb-1">
                    Reason for Visit / Illness & Symptoms (Mandatory) *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={tokenForm.reasonForVisit}
                    onChange={(e) => setTokenForm({ ...tokenForm, reasonForVisit: e.target.value })}
                    placeholder="e.g. Chest discomfort, severe headache, seasonal cold"
                    className="w-full px-3 py-2 border border-teal-300 bg-teal-50/50 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 placeholder-slate-400 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Duration</label>
                    <input
                      type="text"
                      value={tokenForm.symptomsDuration}
                      onChange={(e) => setTokenForm({ ...tokenForm, symptomsDuration: e.target.value })}
                      placeholder="e.g. 2 days"
                      className="w-full px-3 py-2 border rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Priority Category</label>
                    <select
                      value={tokenForm.priority}
                      onChange={(e) => setTokenForm({ ...tokenForm, priority: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-xs bg-white font-medium"
                    >
                      <option value="Normal">Normal Queue</option>
                      <option value="Emergency">Emergency Priority</option>
                      <option value="Urgent">Severe Distress / Urgent</option>
                      <option value="Pregnant">Pregnant Care</option>
                      <option value="Disability">Disability / Mobility</option>
                      <option value="Senior">Senior Citizen</option>
                      <option value="Pediatric">Young Child / Pediatric</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!selectedPatient}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/30 disabled:opacity-50 cursor-pointer"
                >
                  Generate Digital Token
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PRIORITY REQUESTS REVIEW                                          */}
        {/* ========================================================================= */}
        {activeTab === 'priority_requests' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  <span>Incoming Patient Priority Requests ({priorityRequests.length})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Review medical priority upgrade requests from patients waiting in queue. Approved requests automatically re-order queue positions and notify doctors and patients in real-time.
                </p>
              </div>
            </div>

            {priorityRequests.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-10">No priority requests submitted yet.</p>
            ) : (
              <div className="space-y-4">
                {priorityRequests.map((req) => (
                  <div
                    key={req._id}
                    className={`p-5 rounded-2xl border text-xs space-y-3 transition-all ${
                      req.status === 'Pending'
                        ? 'bg-amber-50/60 border-amber-200 shadow-sm'
                        : req.status === 'Approved'
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-900 text-base font-mono">{req.tokenNumber}</span>
                        <strong className="text-slate-800 text-sm">{req.patientName}</strong>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          {req.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px]">
                          Submitted: {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full font-bold text-xs ${
                            req.status === 'Pending'
                              ? 'bg-amber-500 text-white animate-pulse'
                              : req.status === 'Approved'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-400 text-white'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                      <span className="text-slate-400 block font-semibold text-[11px]">Patient Explanation Message</span>
                      <p className="text-slate-900 font-medium text-xs mt-0.5">"{req.reason}"</p>
                    </div>

                    {req.status === 'Pending' ? (
                      <div className="pt-2 space-y-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Internal Receptionist Notes (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="Add internal notes e.g., Verified wheelchair patient / Severe pain confirmed..."
                            value={notesInput[req._id] || ''}
                            onChange={(e) => setNotesInput({ ...notesInput, [req._id]: e.target.value })}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-teal-500"
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleReviewPriority(req._id, 'Approved')}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Approve Priority</span>
                          </button>

                          <button
                            onClick={() => handleReviewPriority(req._id, 'Rejected')}
                            className="px-4 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 font-bold text-xs rounded-xl cursor-pointer"
                          >
                            Reject Priority
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 pt-1 flex items-center justify-between">
                        <span>Internal Note: <strong>{req.receptionistNotes || 'None'}</strong></span>
                        <span>Reviewed: {req.reviewedAt ? new Date(req.reviewedAt).toLocaleTimeString() : 'Recently'}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: HOSPITAL ANALYTICS                                                */}
        {/* ========================================================================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-center">
                <span className="text-xs text-slate-400 font-bold uppercase">Total Patients Today</span>
                <div className="text-3xl font-black text-slate-900 my-1">{dailyStats.totalPatientsToday || 0}</div>
                <span className="text-[10px] text-teal-600 font-semibold">Registered Visits</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-center">
                <span className="text-xs text-slate-400 font-bold uppercase">Completed Consultations</span>
                <div className="text-3xl font-black text-emerald-700 my-1">{dailyStats.completedCount || 0}</div>
                <span className="text-[10px] text-emerald-600 font-semibold">Consultations Done</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-center">
                <span className="text-xs text-slate-400 font-bold uppercase">Avg Wait Duration</span>
                <div className="text-3xl font-black text-teal-700 my-1 font-mono">{dailyStats.avgWaitingTimeMinutes || 10}m</div>
                <span className="text-[10px] text-slate-500">Actual Waiting Time</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-center">
                <span className="text-xs text-slate-400 font-bold uppercase">ETA Accuracy Rate</span>
                <div className="text-3xl font-black text-indigo-700 my-1 font-mono">{etaAccuracyData.overallAccuracyPercentage || 92}%</div>
                <span className="text-[10px] text-indigo-600 font-semibold">Avg Error: ~{etaAccuracyData.averageErrorMinutes || 2.1}m</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Download Hospital Performance Reports</h4>
                <p className="text-xs text-slate-500">Export verified records in standard CSV or PDF format.</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-teal-600" />
                  <span>Export CSV Report</span>
                </button>

                <button
                  onClick={handleExportPDF}
                  className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Export PDF Report</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: AUDIT TRAIL LOGS                                                  */}
        {/* ========================================================================= */}
        {activeTab === 'audit_logs' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-teal-600" />
                  <span>Hospital Compliance & Action Audit Trail</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Comprehensive audit trail tracking priority reviews, patient calls, skips, and authentication events.
                </p>
              </div>
            </div>

            {auditLogs.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-10">No audit log entries recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase font-extrabold">
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Actor / Role</th>
                      <th className="p-3">Target Token</th>
                      <th className="p-3">State Change</th>
                      <th className="p-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {auditLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-slate-500 font-mono text-[11px]">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-bold text-[10px] font-mono">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-800">
                          {log.userName} <span className="text-slate-400 text-[10px]">({log.userRole})</span>
                        </td>
                        <td className="p-3 font-mono font-bold text-teal-700">
                          {log.targetTokenNumber || '--'}
                        </td>
                        <td className="p-3 text-slate-600">
                          {log.previousState && log.newState ? `${log.previousState} → ${log.newState}` : log.newState || '--'}
                        </td>
                        <td className="p-3 text-slate-600 max-w-xs truncate" title={log.details}>
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: DOCTOR PROFILES & TIMINGS                                         */}
        {/* ========================================================================= */}
        {activeTab === 'doctor_edit' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Edit Doctor Information & OPD Timings</h3>

            <form onSubmit={handleUpdateDoctorInfo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Doctor Name</label>
                <input
                  type="text" required
                  value={docEditForm.name}
                  onChange={(e) => setDocEditForm({ ...docEditForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Consultation Room</label>
                  <input
                    type="text" required
                    value={docEditForm.roomNumber}
                    onChange={(e) => setDocEditForm({ ...docEditForm, roomNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Default Duration (mins)</label>
                  <input
                    type="number" required
                    value={docEditForm.defaultDuration}
                    onChange={(e) => setDocEditForm({ ...docEditForm, defaultDuration: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">OPD Start Time</label>
                  <input
                    type="text" required
                    value={docEditForm.startTime}
                    onChange={(e) => setDocEditForm({ ...docEditForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">OPD End Time</label>
                  <input
                    type="text" required
                    value={docEditForm.endTime}
                    onChange={(e) => setDocEditForm({ ...docEditForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-md cursor-pointer"
              >
                Save Doctor Details & Timings
              </button>
            </form>
          </div>
        )}

      </main>

      {/* WALK-IN PATIENT MODAL */}
      {showWalkinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Register New Walk-In Patient</h3>
            <form onSubmit={handleRegisterWalkin} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">Patient Full Name *</label>
                <input
                  type="text" required
                  value={walkinForm.name}
                  onChange={(e) => setWalkinForm({ ...walkinForm, name: e.target.value })}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full px-3 py-2 border rounded-xl text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Mobile Number *</label>
                <input
                  type="tel" required
                  value={walkinForm.mobile}
                  onChange={(e) => setWalkinForm({ ...walkinForm, mobile: e.target.value })}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 border rounded-xl text-sm font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Gender</label>
                  <select
                    value={walkinForm.gender}
                    onChange={(e) => setWalkinForm({ ...walkinForm, gender: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm bg-white font-medium"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Age</label>
                  <input
                    type="number" required
                    value={walkinForm.age}
                    onChange={(e) => setWalkinForm({ ...walkinForm, age: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-medium"
                  />
                </div>
              </div>
              <div className="pt-2 flex gap-2">
                <button type="button" onClick={() => setShowWalkinModal(false)} className="w-1/2 py-2 border rounded-xl font-bold text-xs cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="w-1/2 py-2 bg-teal-600 text-white rounded-xl font-bold text-xs shadow cursor-pointer">
                  Register Walk-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default ReceptionistDashboard;
