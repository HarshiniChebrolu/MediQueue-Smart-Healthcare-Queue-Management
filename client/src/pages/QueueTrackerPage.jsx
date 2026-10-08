import React, { useEffect, useState } from 'react';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { TurnAlertModal } from '../components/common/TurnAlertModal';
import { QRCodeModal } from '../components/common/QRCodeModal';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import API from '../services/api';
import {
  Clock,
  User,
  Stethoscope,
  MapPin,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Sliders,
  Send,
  Sparkles,
  Activity,
  ArrowRight,
  ShieldAlert,
  QrCode,
} from 'lucide-react';

export const QueueTrackerPage = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { t } = useLanguage();

  const [queueState, setQueueState] = useState({
    activeToken: null,
    currentTokenBeingServed: '--',
    totalWaitingPatients: 0,
    doctorStatus: 'Available',
    roomNumber: 'Room 101',
    doctorName: 'Physician',
    avgConsultationDuration: 10,
  });

  const [prefSaving, setPrefSaving] = useState(false);
  const [prefMessage, setPrefMessage] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  
  // Priority Request Modal State
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [priorityCategory, setPriorityCategory] = useState('Severe Pain');
  const [priorityReason, setPriorityReason] = useState('');
  const [prioritySubmitting, setPrioritySubmitting] = useState(false);
  const [priorityStatusMsg, setPriorityStatusMsg] = useState('');

  const fetchActiveToken = async () => {
    try {
      const { data } = await API.get('/queue/patient-active');
      setQueueState(data);
    } catch (e) {
      console.error('Error fetching tracker state', e);
    }
  };

  useEffect(() => {
    fetchActiveToken();
    const interval = setInterval(fetchActiveToken, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('queue_updated', fetchActiveToken);
    socket.on('doctor_queue_updated', fetchActiveToken);
    socket.on('doctor_status_changed', fetchActiveToken);
    socket.on('priority_request_updated', fetchActiveToken);
    return () => {
      socket.off('queue_updated', fetchActiveToken);
      socket.off('doctor_queue_updated', fetchActiveToken);
      socket.off('doctor_status_changed', fetchActiveToken);
      socket.off('priority_request_updated', fetchActiveToken);
    };
  }, [socket]);

  const activeToken = queueState.activeToken;

  const handleSelectPreference = async (prefOption) => {
    if (!activeToken) return;
    setPrefSaving(true);
    setPrefMessage('');
    try {
      await API.put(`/queue/preference/${activeToken._id}`, { preference: prefOption });
      setQueueState((prev) => ({
        ...prev,
        activeToken: { ...prev.activeToken, notificationPreference: prefOption },
      }));
      setPrefMessage('Notification preference saved for this consultation session!');
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating notification preference');
    } finally {
      setPrefSaving(false);
    }
  };

  const handleSubmitPriorityRequest = async (e) => {
    e.preventDefault();
    if (!activeToken) return;
    if (!priorityReason || !priorityReason.trim()) {
      setPriorityStatusMsg('Please explain your medical reason for priority upgrade.');
      return;
    }

    setPrioritySubmitting(true);
    setPriorityStatusMsg('');

    try {
      await API.post('/priority/request', {
        tokenId: activeToken._id,
        category: priorityCategory,
        reason: priorityReason.trim(),
      });
      setPriorityStatusMsg('Priority upgrade request submitted to Hospital Receptionist!');
      setTimeout(() => {
        setShowPriorityModal(false);
        setPriorityReason('');
        setPriorityStatusMsg('');
      }, 2000);
    } catch (err) {
      setPriorityStatusMsg(err.response?.data?.message || 'Failed to submit priority request.');
    } finally {
      setPrioritySubmitting(false);
    }
  };

  const currentPref = activeToken?.notificationPreference || 'every_time';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-grow max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Header Title */}
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white rounded-3xl p-8 shadow-xl border-4 border-teal-500 mb-8 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 bg-teal-500/30 border border-teal-400/40 text-teal-300 font-extrabold text-xs uppercase tracking-widest rounded-full">
              {t('liveQueueTracker')}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowQRModal(true)}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors border border-white/20"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR</span>
              </button>
              <div className="flex items-center gap-2 text-xs text-teal-200">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping" />
                <span>Real-Time Sync</span>
              </div>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            {t('liveQueueTracker')}
          </h1>
          <p className="text-xs text-teal-200 font-medium">
            Doctor: <strong className="text-white">{queueState.doctorName}</strong> ({queueState.roomNumber}) • Status: <strong>{t(queueState.doctorStatus)}</strong>
          </p>
        </div>

        {!activeToken ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-4 max-w-xl mx-auto">
            <Clock className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-xl font-bold text-slate-900">{t('noActiveToken')}</h3>
            <p className="text-slate-600 text-xs">
              {t('noActiveTokenDesc')}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* REAL-TIME PEOPLE AHEAD PROMINENT CARD */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block">
                {t('realTimePosition')}
              </span>

              <div className="text-sm text-slate-600 font-bold uppercase tracking-wider">
                {t('peopleAhead')}
              </div>

              <div className="text-7xl sm:text-8xl font-black text-teal-600 tracking-tight animate-pulse font-mono">
                {activeToken.peopleAhead}
              </div>

              <p className="text-xs font-semibold text-slate-600 max-w-md mx-auto">
                {activeToken.peopleAhead === 0
                  ? t('youAreNext')
                  : `${activeToken.peopleAhead} ${t('inFrontOfYou')}`}
              </p>
            </div>

            {/* KEY METRICS GRID WITH HONEST ETA RANGE */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              
              <div className="bg-teal-50 p-6 rounded-2xl border border-teal-200">
                <span className="text-xs font-bold text-teal-800 uppercase block">{t('yourToken')}</span>
                <div className="text-4xl font-black text-teal-900 my-1 font-mono">{activeToken.tokenNumber}</div>
                <span className="text-[11px] text-teal-700 font-semibold">{t('status')}: {t(activeToken.status || 'Waiting')}</span>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase block">{t('nowServing')}</span>
                <div className={`font-black text-slate-900 my-1 font-mono ${
                  queueState.currentTokenBeingServed && queueState.currentTokenBeingServed.length > 6
                    ? 'text-xl sm:text-2xl'
                    : 'text-3xl sm:text-4xl'
                }`}>
                  {queueState.currentTokenBeingServed}
                </div>
                <span className="text-[11px] text-slate-500 font-semibold">{t('inConsultationRoom')}</span>
              </div>

              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200">
                <span className="text-xs font-bold text-amber-800 uppercase block">{t('estimatedWait')}</span>
                <div className="text-3xl sm:text-4xl font-black text-amber-900 my-1 font-mono">
                  {activeToken.estimatedWaitMin || Math.max(1, Math.round(activeToken.estimatedWaitingTimeMinutes * 0.85))}–{activeToken.estimatedWaitMax || Math.max(2, Math.round(activeToken.estimatedWaitingTimeMinutes * 1.25))} <span className="text-lg">{t('mins')}</span>
                </div>
                <span className="text-[11px] text-amber-700 font-semibold">{t('movingAverageRange')}</span>
              </div>

            </div>

            {/* QUEUE PROGRESS TRACKER BAR */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {t('queueProgressTracker')}
              </h3>

              <div className="grid grid-cols-5 gap-2 text-center text-xs font-semibold">
                {[
                  t('tokenIssued'),
                  t('waiting'),
                  t('approaching'),
                  t('called'),
                  t('inConsultation'),
                ].map((stage, idx) => {
                  const currentStage =
                    activeToken.status === 'In Consultation' || activeToken.status === 'Completed'
                      ? 4
                      : activeToken.status === 'Called'
                      ? 3
                      : activeToken.peopleAhead === 0
                      ? 2
                      : 1;
                  const isReached = idx <= currentStage;

                  return (
                    <div key={idx} className="space-y-2">
                      <div className={`h-2.5 rounded-full transition-all ${isReached ? 'bg-teal-600' : 'bg-slate-200'}`} />
                      <span className={isReached ? 'text-teal-800 font-bold' : 'text-slate-400'}>{stage}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* USER NOTIFICATION PREFERENCES SECTION */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-teal-600" />
                    <span>{t('notificationPreferences')}</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t('chooseNotificationUpdates')}
                  </p>
                </div>
                {prefMessage && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    {prefMessage}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                
                {/* Option 1 */}
                <div
                  onClick={() => handleSelectPreference('every_time')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    currentPref === 'every_time'
                      ? 'border-teal-600 bg-teal-50/50 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-800">1</span>
                    {currentPref === 'every_time' && <CheckCircle2 className="w-5 h-5 text-teal-600" />}
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{t('remindMeEveryTime')}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {t('remindMeEveryTimeDesc')}
                  </p>
                </div>

                {/* Option 2 */}
                <div
                  onClick={() => handleSelectPreference('when_next')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    currentPref === 'when_next'
                      ? 'border-teal-600 bg-teal-50/50 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-800">2</span>
                    {currentPref === 'when_next' && <CheckCircle2 className="w-5 h-5 text-teal-600" />}
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{t('remindMeWhenNext')}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {t('remindMeWhenNextDesc')}
                  </p>
                </div>

                {/* Option 3 */}
                <div
                  onClick={() => handleSelectPreference('tracking')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    currentPref === 'tracking'
                      ? 'border-teal-600 bg-teal-50/50 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-800">3</span>
                    {currentPref === 'tracking' && <CheckCircle2 className="w-5 h-5 text-teal-600" />}
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{t('silentTracking')}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {t('silentTrackingDesc')}
                  </p>
                </div>

              </div>
            </div>

            {/* PRIORITY REQUEST SYSTEM SECTION */}
            <div className="bg-amber-50 rounded-3xl p-6 border border-amber-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-700" />
                  <h3 className="font-bold text-amber-950 text-base">Condition Change or Priority Need?</h3>
                </div>
                <p className="text-xs text-amber-800 max-w-xl">
                  If your condition worsens due to emergency symptoms, pregnancy, severe pain, elderly status, or disability, submit a priority upgrade request to Reception.
                </p>
              </div>

              <button
                onClick={() => setShowPriorityModal(true)}
                className="px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>Submit Priority Request</span>
              </button>
            </div>

          </div>
        )}

      </main>

      {/* PRIORITY REQUEST MODAL */}
      {showPriorityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <span>Submit Priority Request to Reception</span>
              </h3>
              <button onClick={() => setShowPriorityModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            {priorityStatusMsg && (
              <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold">
                {priorityStatusMsg}
              </div>
            )}

            <form onSubmit={handleSubmitPriorityRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Reason Category *</label>
                <select
                  value={priorityCategory}
                  onChange={(e) => setPriorityCategory(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
                >
                  <option value="Emergency">Emergency Symptoms</option>
                  <option value="Severe Pain">Severe Pain / Acute Distress</option>
                  <option value="Pregnancy">Pregnancy Care</option>
                  <option value="Elderly">Elderly Senior Citizen</option>
                  <option value="Disability">Disability / Mobility Impairment</option>
                  <option value="Child">Pediatric / Young Child</option>
                  <option value="Other">Other Urgent Situation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Explanatory Note for Receptionist (Mandatory) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={priorityReason}
                  onChange={(e) => setPriorityReason(e.target.value)}
                  placeholder="Explain why you require priority queue placement..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPriorityModal(false)}
                  className="w-1/2 py-2.5 border border-slate-300 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={prioritySubmitting}
                  className="w-1/2 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50"
                >
                  {prioritySubmitting ? 'Submitting...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR CODE MODAL */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        doctorName={queueState.doctorName}
        roomNumber={queueState.roomNumber}
      />

      <Footer />
      <TurnAlertModal />
    </div>
  );
};

export default QueueTrackerPage;
