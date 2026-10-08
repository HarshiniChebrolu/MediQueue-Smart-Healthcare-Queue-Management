import React, { useEffect, useState } from 'react';
import API from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Clock,
  Users,
  Activity,
  Stethoscope,
  Volume2,
  TrendingUp,
  MapPin,
  Phone,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

export const HospitalInfoSection = () => {
  const { socket } = useSocket();
  const { t } = useLanguage();
  const [liveInfo, setLiveInfo] = useState({
    hospitalName: 'MediQueue Hospital',
    doctorName: 'Dr. Arthur Pendelton, MD',
    qualification: 'MD (Internal Medicine), DM',
    specialization: 'Senior Consultant Physician',
    roomNumber: 'Room 101',
    doctorStatus: 'Available',
    avgConsultationDuration: 10,
    nowServing: '--',
    nextToken: '--',
    patientsWaiting: 0,
    totalRegisteredToday: 0,
    estimatedWaitingTimeMinutes: 0,
    lastUpdated: new Date().toISOString(),
  });

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveData = async () => {
    try {
      const displayRes = await API.get('/queue/public-display');
      if (displayRes.data) {
        setLiveInfo(displayRes.data);
      }
    } catch (e) {
      console.error('Error fetching live hospital display info', e);
    }

    try {
      const annRes = await API.get('/announcements');
      setAnnouncements(annRes.data || []);
    } catch (e) {
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('queue_updated', fetchLiveData);
    socket.on('doctor_status_changed', fetchLiveData);
    socket.on('announcement_updated', fetchLiveData);
    return () => {
      socket.off('queue_updated', fetchLiveData);
      socket.off('doctor_status_changed', fetchLiveData);
      socket.off('announcement_updated', fetchLiveData);
    };
  }, [socket]);

  return (
    <section id="live-hospital-status" className="py-16 bg-slate-900 text-white relative overflow-hidden">
      
      {/* Background Accent Gradients */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-950/80 border border-teal-700/80 rounded-full text-teal-400 font-bold text-xs uppercase tracking-widest">
            <Zap className="w-3.5 h-3.5 animate-pulse" />
            <span>{t('importantQueueInfo')}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {t('realTimeOpdBoard')}
          </h2>
          <p className="text-sm text-slate-400">
            {t('realTimeOpdDesc')}
          </p>
        </div>

        {/* Live Announcements Ticker Banner */}
        {announcements.length > 0 && (
          <div className="mb-8 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 text-amber-200 text-xs sm:text-sm font-semibold shadow-inner">
            <Volume2 className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
            <div className="truncate">
              <strong className="text-amber-400 uppercase tracking-wide mr-2">Hospital Bulletin:</strong>
              {announcements[0]?.title} — {announcements[0]?.content}
            </div>
          </div>
        )}

        {/* Dynamic Metric Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          
          {/* Card 1: Currently Serving Token */}
          <div className="bg-gradient-to-br from-teal-950/90 to-slate-800/90 p-6 rounded-3xl border border-teal-500/40 shadow-xl relative overflow-hidden group hover:border-teal-400 transition-all">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400">{t('nowServing')}</span>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div className={`font-black text-white tracking-tight my-1 ${
              liveInfo.nowServing && liveInfo.nowServing.length > 6
                ? 'text-2xl sm:text-3xl py-1'
                : 'text-4xl sm:text-5xl'
            }`}>
              {liveInfo.nowServing || '--'}
            </div>
            <div className="text-xs text-teal-300/80 font-medium flex items-center gap-1.5 mt-2">
              <Stethoscope className="w-4 h-4 text-teal-400" />
              <span>{liveInfo.doctorName} ({liveInfo.roomNumber})</span>
            </div>
          </div>

          {/* Card 2: Patients Waiting */}
          <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700/80 shadow-xl group hover:border-slate-500 transition-all">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('totalWaiting')}</span>
              <Users className="w-5 h-5 text-teal-400" />
            </div>
            <div className="text-5xl font-black text-white tracking-tight my-1">
              {liveInfo.patientsWaiting}
            </div>
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>{t('nextToken')}: <strong className="text-slate-200">{liveInfo.nextToken || '--'}</strong></span>
            </div>
          </div>

          {/* Card 3: Est. Waiting Time */}
          <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700/80 shadow-xl group hover:border-slate-500 transition-all">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('estimatedWait')}</span>
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-5xl font-black text-amber-300 tracking-tight my-1">
              ~{liveInfo.estimatedWaitingTimeMinutes} <span className="text-xl font-bold text-slate-400">{t('mins')}</span>
            </div>
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-2">
              <Activity className="w-4 h-4 text-teal-400" />
              <span>{t('avgConsultationTime')}: {liveInfo.avgConsultationDuration || 10}m / patient</span>
            </div>
          </div>

          {/* Card 4: Doctor Status */}
          <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700/80 shadow-xl group hover:border-slate-500 transition-all">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('doctorAvailability')}</span>
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="my-2">
              <StatusBadge status={liveInfo.doctorStatus || 'Available'} />
            </div>
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-3">
              <MapPin className="w-4 h-4 text-teal-400" />
              <span>{t('room')}: <strong className="text-white">{liveInfo.roomNumber}</strong></span>
            </div>
          </div>

        </div>

        {/* Live Hospital Stats Footer Bar */}
        <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-400" />
              <span>{t('registeredToday')}: <strong className="text-white font-bold">{liveInfo.totalRegisteredToday}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-teal-400" />
              <span>{t('emergencyReceptionPhone')}</span>
            </div>
          </div>
          <div className="text-slate-500 font-medium">
            {t('realtimeSyncActive')} • {t('lastUpdated')}: {new Date(liveInfo.lastUpdated || Date.now()).toLocaleTimeString()}
          </div>
        </div>

      </div>
    </section>
  );
};

export default HospitalInfoSection;
