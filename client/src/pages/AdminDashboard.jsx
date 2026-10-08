import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import API from '../services/api';
import { DashboardLayout } from '../components/common/DashboardLayout';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import {
  Users,
  UserCheck,
  UserPlus,
  Stethoscope,
  Building2,
  Calendar,
  Activity,
  CheckCircle2,
  Clock,
  TrendingUp,
  BarChart3,
  FileText,
  ShieldCheck,
  Search,
  Plus,
  ArrowUpRight,
  Check,
  X,
  AlertCircle,
  Filter,
  Eye,
  Phone,
  Mail,
  MapPin,
  Heart,
  Sparkles,
  RefreshCw,
  Sliders,
  Trash2,
  UserX,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('patients'); // patients, doctors, receptionists, dashboard, appointments

  // Data states
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [receptionists, setReceptionists] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({
    totalPatients: 0,
    pendingApprovals: 0,
    approvedPatients: 0,
    totalDoctors: 0,
    totalReceptionists: 0,
    totalAppointments: 0,
  });

  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState('');

  // Search & Filter states
  const [searchPatient, setSearchPatient] = useState('');
  const [patientStatusFilter, setPatientStatusFilter] = useState('all'); // all, Pending, Approved, Rejected
  const [searchDoc, setSearchDoc] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [searchRecep, setSearchRecep] = useState('');

  // Modals state
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [showAddReceptionistModal, setShowAddReceptionistModal] = useState(false);
  const [selectedPatientForDetail, setSelectedPatientForDetail] = useState(null);
  const [patientHistoryData, setPatientHistoryData] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [rejectingPatient, setRejectingPatient] = useState(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // New Doctor Form
  const [newDoctorForm, setNewDoctorForm] = useState({
    name: '',
    email: '',
    password: 'Doctor123!',
    mobile: '',
    gender: 'Male',
    departmentId: '',
    qualification: 'MBBS, MD',
    specialization: '',
    roomNumber: 'Room 101',
    experience: 5,
    startTime: '09:00 AM',
    endTime: '05:00 PM',
    consultationFee: 500,
    defaultDuration: 10,
    biography: '',
  });

  // New Receptionist Form
  const [newRecepForm, setNewRecepForm] = useState({
    name: '',
    email: '',
    password: 'Password123!',
    mobile: '',
    gender: 'Female',
    address: 'MediQueue Main OPD Helpdesk',
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Fetch all administrative records
  const fetchAllAdminData = async () => {
    try {
      setLoading(true);
      const [patRes, docRes, recepRes, deptRes, apptRes] = await Promise.all([
        API.get('/patients').catch(() => ({ data: { patients: [], stats: {} } })),
        API.get('/doctors').catch(() => ({ data: [] })),
        API.get('/receptionists').catch(() => ({ data: [] })),
        API.get('/departments').catch(() => ({ data: [] })),
        API.get('/appointments/all').catch(() => ({ data: [] })),
      ]);

      const pats = patRes.data?.patients || [];
      const patStats = patRes.data?.stats || {};
      const docs = docRes.data || [];
      const receps = recepRes.data || [];
      const depts = deptRes.data || [];
      const appts = apptRes.data || [];

      setPatients(pats);
      setDoctors(docs);
      setReceptionists(receps);
      setDepartments(depts);
      setAppointments(appts);

      if (depts.length > 0 && !newDoctorForm.departmentId) {
        setNewDoctorForm((prev) => ({ ...prev, departmentId: depts[0]._id }));
      }

      setStats({
        totalPatients: patStats.total || pats.length,
        pendingApprovals: patStats.pending || pats.filter((p) => p.approvalStatus === 'Pending').length,
        approvedPatients: patStats.approved || pats.filter((p) => p.approvalStatus === 'Approved').length,
        totalDoctors: docs.length,
        totalReceptionists: receps.length,
        totalAppointments: appts.length,
      });
    } catch (err) {
      console.error('Error fetching admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAdminData();
  }, []);

  // Real-time socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewPatient = (newPat) => {
      showToast(`🔔 New Patient Registration Request: ${newPat.name} (${newPat.patientId || 'New'})`);
      fetchAllAdminData();
    };

    const handleStatusUpdate = () => {
      fetchAllAdminData();
    };

    socket.on('new_patient_registration', handleNewPatient);
    socket.on('patient_approval_updated', handleStatusUpdate);
    socket.on('doctor_status_changed', handleStatusUpdate);
    socket.on('stats_updated', handleStatusUpdate);

    return () => {
      socket.off('new_patient_registration', handleNewPatient);
      socket.off('patient_approval_updated', handleStatusUpdate);
      socket.off('doctor_status_changed', handleStatusUpdate);
      socket.off('stats_updated', handleStatusUpdate);
    };
  }, [socket]);

  // ================= ACTION HANDLERS =================

  // Approve Patient Registration
  const handleApprovePatient = async (patientId, patientName) => {
    setActionLoadingId(patientId);
    try {
      await API.put(`/patients/${patientId}/approve`);
      showToast(`✅ Patient ${patientName} registration approved! Account is now active.`);
      await fetchAllAdminData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve patient registration.');
    } finally {
      setActionLoadingId('');
    }
  };

  // Submit Rejection
  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectingPatient) return;
    setActionLoadingId(rejectingPatient._id);
    try {
      await API.put(`/patients/${rejectingPatient._id}/reject`, {
        reason: rejectionReasonInput || 'Declined per hospital registration policy.',
      });
      showToast(`Registration request for ${rejectingPatient.name} declined.`);
      setRejectingPatient(null);
      setRejectionReasonInput('');
      await fetchAllAdminData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to decline patient registration.');
    } finally {
      setActionLoadingId('');
    }
  };

  // Toggle Patient Active Status
  const handleTogglePatientStatus = async (patientId) => {
    try {
      const { data } = await API.put(`/patients/${patientId}/status`);
      showToast(data.message || 'Patient status updated.');
      await fetchAllAdminData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle status.');
    }
  };

  // Open Full Patient History Modal
  const handleViewPatientDetails = async (patient) => {
    setSelectedPatientForDetail(patient);
    setLoadingHistory(true);
    try {
      const { data } = await API.get(`/patients/${patient._id}`);
      setPatientHistoryData(data);
    } catch (e) {
      setPatientHistoryData({ patient, appointments: [], tokens: [] });
    } finally {
      setLoadingHistory(false);
    }
  };

  // Submit Add Doctor
  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    try {
      await API.post('/doctors', newDoctorForm);
      showToast(`🩺 Dr. ${newDoctorForm.name} added to hospital faculty!`);
      setShowAddDoctorModal(false);
      setNewDoctorForm({
        name: '',
        email: '',
        password: 'Doctor123!',
        mobile: '',
        gender: 'Male',
        departmentId: departments[0]?._id || '',
        qualification: 'MBBS, MD',
        specialization: '',
        roomNumber: 'Room 101',
        experience: 5,
        startTime: '09:00 AM',
        endTime: '05:00 PM',
        consultationFee: 500,
        defaultDuration: 10,
        biography: '',
      });
      await fetchAllAdminData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add doctor.');
    }
  };

  // Toggle Doctor Status
  const handleToggleDoctorStatus = async (doctorId, newStatus) => {
    try {
      await API.put('/doctors/status', { doctorId, status: newStatus });
      showToast(`Doctor status changed to ${newStatus}`);
      await fetchAllAdminData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update doctor status.');
    }
  };

  // Submit Add Receptionist
  const handleCreateReceptionist = async (e) => {
    e.preventDefault();
    try {
      await API.post('/receptionists', newRecepForm);
      showToast(`👤 Receptionist ${newRecepForm.name} added successfully!`);
      setShowAddReceptionistModal(false);
      setNewRecepForm({
        name: '',
        email: '',
        password: 'Password123!',
        mobile: '',
        gender: 'Female',
        address: 'MediQueue Main OPD Helpdesk',
      });
      await fetchAllAdminData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add receptionist.');
    }
  };

  // Toggle Receptionist Status
  const handleToggleRecepStatus = async (id) => {
    try {
      const { data } = await API.put(`/receptionists/${id}/status`);
      showToast(data.message || 'Receptionist status updated.');
      await fetchAllAdminData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle receptionist status.');
    }
  };

  // Filtered Lists
  const pendingRegistrations = patients.filter((p) => p.approvalStatus === 'Pending');

  const filteredPatients = patients.filter((p) => {
    const matchesStatus =
      patientStatusFilter === 'all' || p.approvalStatus === patientStatusFilter;
    const matchesSearch =
      !searchPatient ||
      p.name?.toLowerCase().includes(searchPatient.toLowerCase()) ||
      p.patientId?.toLowerCase().includes(searchPatient.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchPatient.toLowerCase()) ||
      p.mobile?.includes(searchPatient) ||
      p.reasonForVisit?.toLowerCase().includes(searchPatient.toLowerCase()) ||
      p.bloodGroup?.toLowerCase().includes(searchPatient.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredDoctors = doctors.filter((d) => {
    const matchesSearch =
      !searchDoc ||
      d.userId?.name?.toLowerCase().includes(searchDoc.toLowerCase()) ||
      d.specialization?.toLowerCase().includes(searchDoc.toLowerCase()) ||
      d.roomNumber?.toLowerCase().includes(searchDoc.toLowerCase());
    const matchesDept =
      selectedDeptFilter === 'all' ||
      d.departmentId?._id === selectedDeptFilter ||
      d.departmentId === selectedDeptFilter;
    return matchesSearch && matchesDept;
  });

  const filteredReceptionists = receptionists.filter((r) => {
    return (
      !searchRecep ||
      r.name?.toLowerCase().includes(searchRecep.toLowerCase()) ||
      r.email?.toLowerCase().includes(searchRecep.toLowerCase()) ||
      r.mobile?.includes(searchRecep)
    );
  });

  // Recharts Chart Data
  const departmentVolumeData = departments.map((dept) => ({
    name: dept.name?.split(' ')[0] || dept.code,
    doctors: doctors.filter((d) => d.departmentId?._id === dept._id || d.departmentId === dept._id).length,
  }));

  return (
    <DashboardLayout
      role="admin"
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div className="space-y-6">

        {/* Global Toast Banner */}
        {toastMessage && (
          <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-teal-500/40 flex items-center gap-3 animate-fadeIn">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
            <span className="text-xs font-bold">{toastMessage}</span>
          </div>
        )}

        {/* 1. ADMIN HEADER BANNER */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center text-xl font-black shadow-md shadow-amber-500/20 shrink-0">
              <ShieldCheck className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-3 py-0.5 bg-amber-100 text-amber-900 font-bold text-xs rounded-full uppercase tracking-wider">
                  Admin Control Console
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900">
                Hospital Governance & Staff Portal
              </h1>
              <p className="text-xs text-slate-500">
                Patient record oversight, registration approvals, doctor faculty, and reception personnel management.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowAddDoctorModal(true)}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-600/20 flex items-center gap-1.5 transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>Add Doctor</span>
            </button>

            <button
              onClick={() => setShowAddReceptionistModal(true)}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all hover:scale-105"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Receptionist</span>
            </button>
          </div>
        </div>

        {/* 2. STATS & PENDING APPROVAL ALERT CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Pending Approvals Card (Highlighted if > 0) */}
          <div
            onClick={() => setActiveTab('approvals')}
            className={`p-5 rounded-3xl border-2 transition-all cursor-pointer space-y-2 ${
              stats.pendingApprovals > 0
                ? 'bg-amber-50/70 border-amber-300 shadow-sm hover:shadow-md'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                {stats.pendingApprovals > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
                Registration Requests
              </span>
              <UserCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-900">{stats.pendingApprovals}</span>
              <span className="text-xs font-bold text-amber-700">Awaiting Decision</span>
            </div>
            <span className="text-[10px] text-amber-800/80 block">Click to review & accept</span>
          </div>

          {/* Approved Patients */}
          <div
            onClick={() => setActiveTab('patients')}
            className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-slate-300 transition-all cursor-pointer space-y-2 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Patient Master Records
              </span>
              <Users className="w-5 h-5 text-teal-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{stats.approvedPatients}</span>
              <span className="text-xs font-bold text-teal-700">Active Profiles</span>
            </div>
            <span className="text-[10px] text-slate-400 block">Total registered: {stats.totalPatients}</span>
          </div>

          {/* Doctors Active */}
          <div
            onClick={() => setActiveTab('doctors')}
            className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-slate-300 transition-all cursor-pointer space-y-2 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Doctor Faculty
              </span>
              <Stethoscope className="w-5 h-5 text-sky-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{stats.totalDoctors}</span>
              <span className="text-xs font-bold text-sky-700">Specialists</span>
            </div>
            <span className="text-[10px] text-slate-400 block">Assigned across {departments.length} clinics</span>
          </div>

          {/* Reception Staff */}
          <div
            onClick={() => setActiveTab('receptionists')}
            className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-slate-300 transition-all cursor-pointer space-y-2 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Reception Personnel
              </span>
              <UserPlus className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{stats.totalReceptionists}</span>
              <span className="text-xs font-bold text-indigo-700">Frontdesk Staff</span>
            </div>
            <span className="text-[10px] text-slate-400 block">Desk triage & token operators</span>
          </div>

        </div>

        {/* ================= TAB 1: PENDING PATIENT REGISTRATION APPROVALS ================= */}
        {activeTab === 'approvals' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900">
                    Patient Registration Requests Awaiting Admin Approval
                  </h3>
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 font-extrabold text-xs rounded-full">
                    {pendingRegistrations.length} Pending
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Every self-registered patient must be accepted by an administrator before they can join OPD queues and consult doctors.
                </p>
              </div>

              <button
                onClick={fetchAllAdminData}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Refresh Queue</span>
              </button>
            </div>

            {pendingRegistrations.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No Pending Registration Requests"
                description="All new patient registrations have been verified and approved by the hospital administration. New submissions will appear here automatically."
              />
            ) : (
              <div className="space-y-4">
                {pendingRegistrations.map((pat) => (
                  <div
                    key={pat._id}
                    className="p-5 rounded-2xl border-2 border-amber-200 bg-amber-50/20 hover:bg-amber-50/40 transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 font-black text-base flex items-center justify-center border border-amber-300">
                          {pat.name?.charAt(0) || 'P'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-black text-slate-900">{pat.name}</h4>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 uppercase">
                              Pending Admin Review
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            ID: <strong className="font-mono text-teal-800">{pat.patientId || 'New ID'}</strong> • Gender: <strong>{pat.gender}</strong> • Blood Group: <strong className="text-red-600">{pat.bloodGroup || 'Unknown'}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Acceptance Buttons */}
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          disabled={actionLoadingId === pat._id}
                          onClick={() => handleApprovePatient(pat._id, pat.name)}
                          className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all hover:scale-105"
                        >
                          <Check className="w-4 h-4" />
                          <span>{actionLoadingId === pat._id ? 'Approving...' : 'Accept & Approve'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRejectingPatient(pat);
                            setRejectionReasonInput('');
                          }}
                          className="flex-1 sm:flex-initial px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-xl transition-all"
                        >
                          <X className="w-4 h-4" />
                          <span>Decline</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleViewPatientDetails(pat)}
                          className="p-2.5 text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl"
                          title="View Full Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Patient's Submitted Reason for Visit */}
                    <div className="bg-white p-4 rounded-xl border border-amber-200/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-950">
                        <span className="flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                          <span>Reason for Hospital Visit / Chief Complaint:</span>
                        </span>
                        <span className="text-slate-400 font-normal">
                          Submitted {new Date(pat.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-800 font-medium leading-relaxed pl-5">
                        {pat.reasonForVisit || 'General outpatient consultation and clinical review requested.'}
                      </p>
                    </div>

                    {/* Contact & Address Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-600 bg-white/70 p-3 rounded-xl border border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span className="truncate">Mobile: <strong className="text-slate-800">{pat.mobile}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span className="truncate">Email: <strong className="text-slate-800">{pat.email}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="truncate">Emergency Contact: <strong className="text-slate-800">{pat.emergencyContact || 'None'}</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: PATIENT MASTER RECORDS ================= */}
        {activeTab === 'patients' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-teal-600" />
                  <span>Patient Master Records Directory ({filteredPatients.length})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Search, review medical conditions, inspect visit reasons, and track full patient consultation history.
                </p>
              </div>

              {/* Status Filter & Search */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
                  {['all', 'Approved', 'Pending', 'Rejected'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setPatientStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-all ${
                        patientStatusFilter === st
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {st === 'all' ? 'All Records' : st}
                    </button>
                  ))}
                </div>

                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search name, ID, phone, reason..."
                    value={searchPatient}
                    onChange={(e) => setSearchPatient(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {filteredPatients.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No Patient Records Found"
                description="No patient accounts match your current search query or approval filter."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-200">
                      <th className="py-3 px-4">Patient ID & Name</th>
                      <th className="py-3 px-4">Contact Info</th>
                      <th className="py-3 px-4">Blood Group</th>
                      <th className="py-3 px-4">Reason for Visit</th>
                      <th className="py-3 px-4">Approval Status</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPatients.map((pat) => (
                      <tr key={pat._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div>
                            <span className="text-sm block">{pat.name}</span>
                            <span className="font-mono text-teal-800 text-[11px] font-semibold">{pat.patientId}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-600">
                          <div>
                            <span className="block text-slate-800 font-medium">{pat.mobile}</span>
                            <span className="text-[11px] text-slate-400">{pat.email}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-lg bg-red-50 text-red-700 font-bold border border-red-200 text-[11px]">
                            {pat.bloodGroup || 'Unknown'}
                          </span>
                        </td>

                        <td className="py-3 px-4 max-w-xs truncate text-slate-700 font-medium">
                          {pat.reasonForVisit || <span className="text-slate-400 italic">None specified</span>}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              pat.approvalStatus === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : pat.approvalStatus === 'Pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {pat.approvalStatus || 'Approved'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleTogglePatientStatus(pat._id)}
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] border transition-all ${
                              pat.activeStatus
                                ? 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-red-50 hover:text-red-700'
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                            title="Click to toggle account activation"
                          >
                            {pat.activeStatus ? '● Active' : '○ Disabled'}
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleViewPatientDetails(pat)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Records</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: DOCTOR FACULTY MANAGEMENT ================= */}
        {activeTab === 'doctors' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-teal-600" />
                  <span>Medical Faculty & Specialists ({filteredDoctors.length})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Manage specialist profiles, assigned OPD consultation rooms, timings, and fees.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <select
                  value={selectedDeptFilter}
                  onChange={(e) => setSelectedDeptFilter(e.target.value)}
                  className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium cursor-pointer"
                >
                  <option value="all">All Clinical Departments</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>{dept.name}</option>
                  ))}
                </select>

                <div className="relative flex-1 sm:w-56">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search doctor, room..."
                    value={searchDoc}
                    onChange={(e) => setSearchDoc(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddDoctorModal(true)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Doctor</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDoctors.map((doc) => (
                <div
                  key={doc._id}
                  className="p-5 rounded-3xl border-2 border-slate-200 hover:border-teal-300 bg-white space-y-4 shadow-xs transition-all"
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={doc.profileImage || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200'}
                      alt="Doctor"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-teal-500 shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <strong className="text-sm font-black text-slate-900 truncate">
                          {doc.userId?.name}
                        </strong>
                        <StatusBadge status={doc.status} />
                      </div>
                      <p className="text-xs font-bold text-teal-700 truncate">{doc.specialization}</p>
                      <p className="text-[11px] text-slate-500">{doc.qualification} • {doc.experience} yrs exp</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-400 block font-medium">Room</span>
                      <strong className="text-slate-800">{doc.roomNumber}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Consultation Fee</span>
                      <strong className="text-teal-800">₹{doc.consultationFee}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Active Queue</span>
                      <strong className="text-amber-700">{doc.waitingCount || 0} Waiting</strong>
                    </div>
                  </div>

                  {/* Timings & Availability Toggle */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    <span className="text-slate-500 text-[11px] flex items-center gap-1 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-teal-600" />
                      <span>{doc.startTime} - {doc.endTime}</span>
                    </span>

                    <select
                      value={doc.status}
                      onChange={(e) => handleToggleDoctorStatus(doc._id, e.target.value)}
                      className="text-xs font-bold px-2.5 py-1 bg-slate-100 border border-slate-300 rounded-lg cursor-pointer focus:outline-none"
                    >
                      <option value="Available">Available</option>
                      <option value="Busy">Busy</option>
                      <option value="On Break">On Break</option>
                      <option value="Unavailable">Unavailable</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 4: RECEPTION STAFF MANAGEMENT ================= */}
        {activeTab === 'receptionists' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-600" />
                  <span>Receptionist Staff Roster ({filteredReceptionists.length})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Frontdesk personnel managing outpatient walk-ins, priority triage, and doctor queuing consoles.
                </p>
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search receptionist..."
                    value={searchRecep}
                    onChange={(e) => setSearchRecep(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddReceptionistModal(true)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Receptionist</span>
                </button>
              </div>
            </div>

            {filteredReceptionists.length === 0 ? (
              <EmptyState
                icon={UserPlus}
                title="No Receptionists Found"
                description="Add reception desk personnel to manage OPD walk-ins and hospital phone queues."
                actionLabel="Add Receptionist"
                onAction={() => setShowAddReceptionistModal(true)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredReceptionists.map((rec) => (
                  <div
                    key={rec._id}
                    className="p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 bg-white space-y-3 shadow-xs transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-800 font-black text-sm flex items-center justify-center border border-indigo-200">
                        {rec.name?.charAt(0) || 'R'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-black text-slate-900 truncate">{rec.name}</h4>
                        <span className="text-xs text-indigo-700 font-semibold block truncate">Frontdesk Operator</span>
                        <span className="text-[10px] text-slate-400">{rec.email}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Mobile:</span>
                        <strong className="text-slate-800">{rec.mobile || 'None'}</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Access Status:</span>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          rec.activeStatus !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {rec.activeStatus !== false ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleToggleRecepStatus(rec._id)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                          rec.activeStatus !== false
                            ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {rec.activeStatus !== false ? 'Deactivate Access' : 'Activate Account'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 5: EXECUTIVE OVERVIEW DASHBOARD ================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Quick Pending Registrations Hero Notice */}
            {stats.pendingApprovals > 0 && (
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-5 rounded-3xl shadow-lg flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black">Action Required: {stats.pendingApprovals} New Patient Registration Requests</h4>
                    <p className="text-xs text-amber-100">Review patient reasons for visit, demographics, and approve accounts for queue entry.</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('approvals')}
                  className="px-4 py-2 bg-white text-amber-900 font-bold text-xs rounded-xl shadow-xs hover:bg-amber-50 transition-all shrink-0"
                >
                  Review Requests →
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Department Volume Chart */}
              <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-teal-600" />
                  <span>Clinical Department Faculty Capacity</span>
                </h3>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentVolumeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="doctors" fill="#0d9488" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Patient Breakdown */}
              <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-teal-600" />
                  <span>Patient Population Triage</span>
                </h3>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-1">
                    <span className="text-[11px] font-bold text-teal-900 uppercase">Approved Patients</span>
                    <strong className="text-2xl font-black text-teal-950 block">{stats.approvedPatients}</strong>
                    <span className="text-[10px] text-teal-700">Ready for OPD consultation</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                    <span className="text-[11px] font-bold text-amber-900 uppercase">Pending Approvals</span>
                    <strong className="text-2xl font-black text-amber-950 block">{stats.pendingApprovals}</strong>
                    <span className="text-[10px] text-amber-700">Awaiting admin review</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 space-y-1">
                    <span className="text-[11px] font-bold text-sky-900 uppercase">Specialist Doctors</span>
                    <strong className="text-2xl font-black text-sky-950 block">{stats.totalDoctors}</strong>
                    <span className="text-[10px] text-sky-700">Across {departments.length} departments</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-1">
                    <span className="text-[11px] font-bold text-indigo-900 uppercase">Reception Staff</span>
                    <strong className="text-2xl font-black text-indigo-950 block">{stats.totalReceptionists}</strong>
                    <span className="text-[10px] text-indigo-700">Operating front desk</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 6: ALL APPOINTMENTS ================= */}
        {activeTab === 'appointments' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" />
              <span>Hospital Appointments Roster ({appointments.length})</span>
            </h3>

            {appointments.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No appointments scheduled"
                description="Bookings generated by patients or receptionists will appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-200">
                      <th className="py-2.5 px-3">Date / Slot</th>
                      <th className="py-2.5 px-3">Token</th>
                      <th className="py-2.5 px-3">Patient</th>
                      <th className="py-2.5 px-3">Doctor</th>
                      <th className="py-2.5 px-3">Reason for Visit</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {appointments.map((a) => (
                      <tr key={a._id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3 font-semibold text-slate-900">{a.appointmentDate} • {a.timeSlot}</td>
                        <td className="py-3 px-3 font-mono font-bold text-teal-800">{a.tokenNumber}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">{a.patientName}</td>
                        <td className="py-3 px-3 text-slate-700 font-medium">{a.doctorId?.userId?.name || 'Dr. Specialist'}</td>
                        <td className="py-3 px-3 max-w-xs truncate text-slate-600">{a.reasonForVisit || 'OPD Checkup'}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            a.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : a.status === 'Cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-teal-100 text-teal-800'
                          }`}>
                            {a.status}
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

      </div>

      {/* ================= MODAL: ADD DOCTOR ================= */}
      {showAddDoctorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-slate-200 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                  <Stethoscope className="w-5 h-5 text-teal-700" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">Add New Medical Specialist</h4>
                  <p className="text-xs text-slate-500">Create login credentials and assign clinical room.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDoctorModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDoctor} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Doctor Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Priya Varma"
                    value={newDoctorForm.name}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, name: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Department *</label>
                  <select
                    required
                    value={newDoctorForm.departmentId}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, departmentId: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Doctor Login Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="dr.priya@mediqueue.com"
                    value={newDoctorForm.email}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, email: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Temporary Password *</label>
                  <input
                    type="password"
                    required
                    value={newDoctorForm.password}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, password: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Specialization *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Pediatrician"
                    value={newDoctorForm.specialization}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, specialization: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Qualifications *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MBBS, MD, DNB"
                    value={newDoctorForm.qualification}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, qualification: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Room # *</label>
                  <input
                    type="text"
                    required
                    placeholder="Room 204"
                    value={newDoctorForm.roomNumber}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, roomNumber: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Consultation Fee (₹)</label>
                  <input
                    type="number"
                    value={newDoctorForm.consultationFee}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, consultationFee: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Experience (Yrs)</label>
                  <input
                    type="number"
                    value={newDoctorForm.experience}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, experience: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Shift Start Time</label>
                  <input
                    type="text"
                    placeholder="09:00 AM"
                    value={newDoctorForm.startTime}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, startTime: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Shift End Time</label>
                  <input
                    type="text"
                    placeholder="05:00 PM"
                    value={newDoctorForm.endTime}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, endTime: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Short Bio / Background</label>
                <textarea
                  rows={2}
                  placeholder="Clinical background, expertise, and patient care approach..."
                  value={newDoctorForm.biography}
                  onChange={(e) => setNewDoctorForm({ ...newDoctorForm, biography: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDoctorModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Save & Register Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD RECEPTIONIST ================= */}
      {showAddReceptionistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <h4 className="text-base font-black text-slate-900">Add Reception Staff Member</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddReceptionistModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReceptionist} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Staff Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suman Rao"
                  value={newRecepForm.name}
                  onChange={(e) => setNewRecepForm({ ...newRecepForm, name: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Login Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="suman.reception@mediqueue.com"
                  value={newRecepForm.email}
                  onChange={(e) => setNewRecepForm({ ...newRecepForm, email: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 00000"
                    value={newRecepForm.mobile}
                    onChange={(e) => setNewRecepForm({ ...newRecepForm, mobile: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={newRecepForm.gender}
                    onChange={(e) => setNewRecepForm({ ...newRecepForm, gender: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Temporary Password *</label>
                <input
                  type="password"
                  required
                  value={newRecepForm.password}
                  onChange={(e) => setNewRecepForm({ ...newRecepForm, password: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Desk Assignment</label>
                <input
                  type="text"
                  value={newRecepForm.address}
                  onChange={(e) => setNewRecepForm({ ...newRecepForm, address: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddReceptionistModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Create Receptionist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: PATIENT FULL DETAILS & CONSULTATION HISTORY ================= */}
      {selectedPatientForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-slate-200 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 font-black text-lg flex items-center justify-center">
                  {selectedPatientForDetail.name?.charAt(0) || 'P'}
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900">{selectedPatientForDetail.name}</h4>
                  <p className="text-xs text-slate-500">
                    ID: <strong className="font-mono text-teal-800">{selectedPatientForDetail.patientId}</strong> • Blood Group: <strong className="text-red-600">{selectedPatientForDetail.bloodGroup}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPatientForDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Demographics Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-400 block font-medium">Gender</span>
                <strong className="text-slate-800">{selectedPatientForDetail.gender}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Mobile</span>
                <strong className="text-slate-800">{selectedPatientForDetail.mobile}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Approval</span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                  selectedPatientForDetail.approvalStatus === 'Approved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {selectedPatientForDetail.approvalStatus || 'Approved'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Account Access</span>
                <strong className={selectedPatientForDetail.activeStatus ? 'text-emerald-700' : 'text-red-600'}>
                  {selectedPatientForDetail.activeStatus ? 'Active' : 'Disabled'}
                </strong>
              </div>
            </div>

            {/* Reason for Visit */}
            <div className="bg-teal-50/60 p-4 rounded-2xl border border-teal-200 space-y-1 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-900 block">
                Primary Reason for Hospital Visit / Complaint:
              </span>
              <p className="text-slate-800 font-medium">
                {selectedPatientForDetail.reasonForVisit || 'Routine outpatient consultation and physician review.'}
              </p>
            </div>

            {/* History Records */}
            <div className="space-y-3">
              <h5 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Consultation & Token History
              </h5>

              {loadingHistory ? (
                <div className="py-6 text-center text-xs text-slate-400 font-bold">
                  Loading clinical records...
                </div>
              ) : patientHistoryData?.appointments?.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                  No appointments booked yet for this patient.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {patientHistoryData?.appointments?.map((appt) => (
                    <div key={appt._id} className="p-3 rounded-xl border border-slate-200 bg-white text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-slate-900">{appt.doctorId?.userId?.name || 'Physician'} ({appt.departmentId?.name})</strong>
                        <span className="font-mono font-bold text-teal-800">Token: {appt.tokenNumber}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 text-[11px]">
                        <span>{appt.appointmentDate} • {appt.timeSlot}</span>
                        <span className="font-bold text-emerald-700">{appt.status}</span>
                      </div>
                      {appt.consultationNotes && (
                        <p className="text-[11px] text-slate-600 italic pt-1 border-t border-slate-100">
                          Notes: {appt.consultationNotes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedPatientForDetail(null)}
                className="px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DECLINE REGISTRATION REASON ================= */}
      {rejectingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h4 className="text-base font-black text-slate-900">Decline Patient Registration</h4>
              </div>
              <button
                type="button"
                onClick={() => setRejectingPatient(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              You are declining the registration request for <strong>{rejectingPatient.name}</strong> ({rejectingPatient.patientId}).
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Declining (Optional):
                </label>
                <textarea
                  rows={3}
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder="e.g. Incomplete contact information, duplicate patient identity..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingPatient(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === rejectingPatient._id}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  {actionLoadingId === rejectingPatient._id ? 'Declining...' : 'Confirm Decline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default AdminDashboard;
