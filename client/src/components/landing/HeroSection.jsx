import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Shield, Sparkles, Stethoscope, PhoneCall, MapPin, Tv } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import API from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useLanguage } from '../../context/LanguageContext';

export const HeroSection = () => {
  const { socket } = useSocket();
  const { t } = useLanguage();
  const [liveInfo, setLiveInfo] = useState({
    nowServing: '--',
    patientsWaiting: 0,
    totalRegisteredToday: 0,
    estimatedWaitingTimeMinutes: 0,
    doctorStatus: 'Available',
    roomNumber: 'Room 101',
    doctorName: 'Dr. Arthur Pendelton, MD',
    specialization: 'Senior Consultant Physician',
    lastUpdated: new Date().toISOString(),
  });

  const fetchLiveInfo = async () => {
    try {
      const { data } = await API.get('/queue/public-display');
      setLiveInfo(data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchLiveInfo();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('queue_updated', fetchLiveInfo);
    socket.on('doctor_status_changed', fetchLiveInfo);
    return () => {
      socket.off('queue_updated');
      socket.off('doctor_status_changed');
    };
  }, [socket]);

  return (
    <section id="home" className="relative overflow-hidden bg-gradient-to-b from-teal-50/60 via-slate-50 to-white py-12 lg:py-20">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Hero Text Column */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100/80 border border-teal-200 text-teal-800 text-xs font-bold tracking-wide uppercase">
              <Sparkles className="w-4 h-4 text-teal-600 animate-spin" />
              <span>{t('smartQueueBadge')}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              {t('hospitalName')} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-teal-700 to-blue-600">
                {t('digitalQueuePortal')}
              </span>
            </h1>

            {/* Doctor Info Subheading */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-xl mx-auto lg:mx-0 space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base">{liveInfo.doctorName}</h3>
                <StatusBadge status={liveInfo.doctorStatus} />
              </div>
              <p className="text-xs font-semibold text-teal-700">{liveInfo.specialization} • {liveInfo.roomNumber}</p>
              <p className="text-xs text-slate-500">{t('opdTimingsDesc')}</p>
            </div>

            {/* Main Action Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <Link
                to="/patient-dashboard"
                className="px-6 py-3.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-lg shadow-teal-600/30 flex items-center gap-2 transition-all hover:scale-105"
              >
                <Clock className="w-5 h-5" />
                <span>{t('joinQueueNow')}</span>
              </Link>

              <a
                href="#live-hospital-status"
                className="px-5 py-3.5 text-sm font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl border border-teal-200 transition-all hover:scale-105 flex items-center gap-1.5"
              >
                <Tv className="w-4.5 h-4.5 text-teal-600" />
                <span>{t('liveQueueDisplay')}</span>
              </a>

              <Link
                to="/signin"
                className="px-5 py-3.5 text-sm font-bold text-slate-800 bg-white hover:bg-slate-100 rounded-xl border border-slate-300 shadow-sm transition-all"
              >
                {t('signIn')}
              </Link>

              <Link
                to="/register"
                className="px-5 py-3.5 text-sm font-bold text-slate-700 hover:text-slate-900"
              >
                {t('registerPatient')}
              </Link>
            </div>

            {/* Timings, Address & Emergency Contact */}
            <div className="pt-6 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                <span>MediQueue Healthcare Campus, 100 Metro Health Blvd</span>
              </div>
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-red-600 shrink-0" />
                <span className="font-bold text-red-600">{t('emergencyPhone')}</span>
              </div>
            </div>

          </div>

          {/* Right Live Queue Summary Card */}
          <div className="lg:col-span-5 relative">
            <div className="bg-white rounded-3xl p-6 shadow-2xl border-2 border-teal-500 space-y-6">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{t('importantQueueInfo')}</h4>
                  <p className="text-[11px] text-slate-500">{t('updatedRealTime')}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800">
                  {liveInfo.roomNumber}
                </span>
              </div>

              {/* Current Token Card */}
              <div className="bg-gradient-to-br from-teal-700 to-teal-900 rounded-2xl p-6 text-white text-center shadow-lg">
                <span className="text-xs font-extrabold uppercase tracking-widest text-teal-200 block mb-1">
                  {t('currentTokenBeingServed')}
                </span>
                <div className={`font-black tracking-tight ${
                  liveInfo.nowServing && liveInfo.nowServing.length > 6
                    ? 'text-2xl sm:text-3xl py-1'
                    : 'text-5xl sm:text-6xl'
                }`}>
                  {liveInfo.nowServing}
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs bg-white/20 px-3 py-1 rounded-full text-teal-50 font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{t('estimatedWait')}: ~{liveInfo.estimatedWaitingTimeMinutes} {t('mins')}</span>
                </div>
              </div>

              {/* Dynamic Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-semibold block">{t('totalWaiting')}</span>
                  <span className="text-2xl font-black text-slate-900">{liveInfo.patientsWaiting}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-semibold block">{t('registeredToday')}</span>
                  <span className="text-2xl font-black text-teal-700">{liveInfo.totalRegisteredToday}</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400">
                {t('lastUpdated')}: {new Date(liveInfo.lastUpdated).toLocaleTimeString()}
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
