import React, { useEffect, useState, useRef } from 'react';
import { Activity, Maximize2, Volume2, VolumeX, Stethoscope, RefreshCw } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import API from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';

export const PublicDisplayPage = () => {
  const { socket } = useSocket();
  const { language, changeLanguage, t } = useLanguage();

  const [doctorsList, setDoctorsList] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [displayInfo, setDisplayInfo] = useState({
    hospitalName: 'MediQueue Hospital',
    doctorName: 'Attending Physician',
    qualification: 'MD',
    specialization: 'Consultant Specialist',
    roomNumber: 'Room 101',
    doctorStatus: 'Available',
    nowServing: '--',
    nextToken: '--',
    patientsWaiting: 0,
    totalRegisteredToday: 0,
    estimatedWaitingTimeMinutes: 0,
    lastUpdated: new Date().toISOString(),
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const lastAnnouncedTokenRef = useRef('');

  // Voice announcement helper using Web Speech API
  const speakAnnouncement = (text) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      if (language === 'hi') {
        utterance.lang = 'hi-IN';
      } else if (language === 'te') {
        utterance.lang = 'te-IN';
      } else {
        utterance.lang = 'en-US';
      }
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[Web Speech] Announcement error:', e);
    }
  };

  const fetchDoctors = async () => {
    try {
      const { data } = await API.get('/doctors');
      setDoctorsList(data || []);
      if (data.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(data[0]._id);
      }
    } catch (e) {
      console.error('Error fetching doctors list', e);
    }
  };

  const fetchDisplayData = async (docId = selectedDoctorId) => {
    try {
      const url = docId ? `/queue/public-display?doctorId=${docId}` : '/queue/public-display';
      const { data } = await API.get(url);
      setDisplayInfo(data);

      // Check if now serving token changed and is valid
      if (data.nowServing && data.nowServing !== '--' && data.nowServing !== 'No Active Patient') {
        if (data.nowServing !== lastAnnouncedTokenRef.current) {
          lastAnnouncedTokenRef.current = data.nowServing;
          let announcementMsg = `Token ${data.nowServing}, please proceed to Consultation ${data.roomNumber || 'Room 101'}.`;
          if (language === 'hi') {
            announcementMsg = `टोकन संख्या ${data.nowServing}, कृपया परामर्श कक्ष ${data.roomNumber || '101'} में जाएं।`;
          } else if (language === 'te') {
            announcementMsg = `టోకెన్ నంబర్ ${data.nowServing}, దయచేసి సంప్రదింపుల గది ${data.roomNumber || '101'} కి వెళ్ళండి.`;
          }
          speakAnnouncement(announcementMsg);
        }
      }
    } catch (e) {
      console.error('Error fetching public TV display data', e);
    }
  };

  useEffect(() => {
    fetchDoctors();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedDoctorId) {
      fetchDisplayData(selectedDoctorId);
    }
  }, [selectedDoctorId]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchDisplayData(selectedDoctorId);
    };

    socket.on('public_display_updated', handleUpdate);
    socket.on('queue_updated', handleUpdate);
    socket.on('doctor_status_changed', handleUpdate);

    return () => {
      socket.off('public_display_updated', handleUpdate);
      socket.off('queue_updated', handleUpdate);
      socket.off('doctor_status_changed', handleUpdate);
    };
  }, [socket, selectedDoctorId, voiceEnabled]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  const toggleVoice = () => {
    const nextState = !voiceEnabled;
    setVoiceEnabled(nextState);
    if (nextState) {
      speakAnnouncement('Voice announcement system enabled.');
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between font-sans select-none p-6 sm:p-8">
      
      {/* Top TV Display Header */}
      <header className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-teal-500/30 shrink-0">
            <Activity className="w-8 h-8 stroke-[3]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {displayInfo.hospitalName}
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-400">
              Live Digital OPD Token Display Board • Privacy-Safe
            </p>
          </div>
        </div>

        {/* Doctor Selector & Audio / Fullscreen Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {doctorsList.length > 1 && (
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-2xl border border-slate-800">
              <Stethoscope className="w-4 h-4 text-teal-400" />
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="bg-transparent text-xs font-bold text-teal-200 focus:outline-none cursor-pointer"
                aria-label="Select Doctor Queue"
              >
                {doctorsList.map((doc) => (
                  <option key={doc._id} value={doc._id} className="bg-slate-900 text-white">
                    {doc.userId?.name} ({doc.roomNumber})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Voice Announcement Toggle */}
          <button
            onClick={toggleVoice}
            className={`px-3.5 py-2 rounded-2xl border flex items-center gap-2 font-bold text-xs transition-all ${
              voiceEnabled
                ? 'bg-teal-600 border-teal-500 text-white shadow-lg shadow-teal-600/30'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Toggle Audio Turn Announcement"
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{voiceEnabled ? t('soundOn') : t('soundOff')}</span>
          </button>

          {/* Language Selector */}
          <div className="bg-slate-800 px-3 py-2 rounded-2xl border border-slate-700 text-xs font-bold text-slate-300">
            <select
              value={language}
              onChange={(e) => changeLanguage(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
              aria-label="Select Language"
            >
              <option value="en" className="bg-slate-900">EN</option>
              <option value="hi" className="bg-slate-900">हिन्दी</option>
              <option value="te" className="bg-slate-900">తెలుగు</option>
            </select>
          </div>

          {/* Live Clock */}
          <div className="text-right px-3 py-1">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-teal-300 font-mono">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">
              {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>

          <button
            onClick={toggleFullScreen}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-300 border border-slate-700 transition-colors"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Big TV Queue Card */}
      <main className="my-auto max-w-5xl mx-auto w-full py-6">
        <div className="bg-slate-900 rounded-3xl p-8 sm:p-10 border-2 border-slate-800 shadow-2xl space-y-8">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-6 gap-4">
            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-white">{displayInfo.doctorName}</h2>
              <p className="text-sm font-semibold text-teal-400 mt-1">{displayInfo.specialization} • {displayInfo.qualification}</p>
            </div>

            <div className="flex items-center gap-3">
              <StatusBadge status={displayInfo.doctorStatus} />
              <div className="px-5 py-2.5 bg-slate-950 rounded-2xl border border-slate-800 font-black text-teal-300 text-sm">
                {t('consultationRoom')} {displayInfo.roomNumber}
              </div>
            </div>
          </div>

          {/* Large Tokens Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            
            {/* NOW SERVING BIG HERO CARD */}
            <div className="md:col-span-7 bg-gradient-to-br from-teal-950 via-slate-900 to-slate-950 border-4 border-teal-500/50 rounded-3xl p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-teal-300 block mb-2">
                {t('nowServing')}
              </span>
              <div className={`font-black tracking-tight text-teal-200 animate-pulse my-2 font-mono transition-all ${
                displayInfo.nowServing && displayInfo.nowServing.length > 6
                  ? 'text-2xl sm:text-3xl md:text-4xl py-3'
                  : 'text-5xl sm:text-6xl md:text-7xl'
              }`}>
                {displayInfo.nowServing}
              </div>
              <span className="text-xs sm:text-sm text-teal-300/90 font-bold block mt-3">
                {t('proceedInsideRoom')} {displayInfo.roomNumber}
              </span>
            </div>

            {/* NEXT TOKEN IN LINE & WAITING METRICS */}
            <div className="md:col-span-5 space-y-4">
              <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-center space-y-1 shadow-inner">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('nextToken')}</span>
                <div className="text-5xl sm:text-6xl font-black text-amber-400 font-mono my-1">{displayInfo.nextToken}</div>
                <span className="text-xs text-slate-500 font-semibold">{t('readyNearDoor')}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800">
                  <span className="text-xs text-slate-400 block font-bold uppercase">{t('peopleAhead')}</span>
                  <span className="text-3xl sm:text-4xl font-black text-white my-1 block">{displayInfo.patientsWaiting}</span>
                  <span className="text-[10px] text-slate-500">{t('inOpdWaitingArea')}</span>
                </div>

                <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800">
                  <span className="text-xs text-slate-400 block font-bold uppercase">{t('estimatedWait')}</span>
                  <span className="text-3xl sm:text-4xl font-black text-teal-300 my-1 block font-mono">
                    ~{displayInfo.estimatedWaitingTimeMinutes} {t('mins')}
                  </span>
                  <span className="text-[10px] text-teal-500/80">{t('dynamicMovingAverage')}</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 py-2 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-5xl mx-auto w-full">
        <span>{t('hospitalName')} • {t('opdClinicSubtitle')}</span>
        <span className="text-teal-500/80 font-semibold">{t('privacyNotice')}</span>
      </footer>

    </div>
  );
};

export default PublicDisplayPage;
