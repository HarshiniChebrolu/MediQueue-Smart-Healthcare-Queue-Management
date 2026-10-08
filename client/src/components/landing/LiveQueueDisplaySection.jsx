import React, { useEffect, useState } from 'react';
import { Activity, Clock, MonitorPlay, RefreshCw, UserCheck, MapPin } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import API from '../../services/api';
import { StatusBadge } from '../common/StatusBadge';

export const LiveQueueDisplaySection = () => {
  const { socket } = useSocket();
  const [queueInfo, setQueueInfo] = useState({
    hospitalName: 'MediQueue Hospital',
    doctorName: 'Dr. Arthur Pendelton, MD',
    qualification: 'MD (Internal Medicine), DM',
    specialization: 'Senior Consultant Physician',
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

  const fetchDisplayData = async () => {
    try {
      const { data } = await API.get('/queue/public-display');
      setQueueInfo(data);
    } catch (e) {
      console.error('Error fetching live queue display data', e);
    }
  };

  useEffect(() => {
    fetchDisplayData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('queue_updated', () => fetchDisplayData());
    socket.on('doctor_status_changed', () => fetchDisplayData());
    return () => {
      socket.off('queue_updated');
      socket.off('doctor_status_changed');
    };
  }, [socket]);

  return (
    <section id="live-queue" className="py-16 bg-slate-950 text-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Board Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-10 border-b border-slate-800 pb-6">
          <div>
            <span className="text-teal-400 font-bold text-xs uppercase tracking-widest bg-teal-950 px-3 py-1 rounded-full border border-teal-800 inline-flex items-center gap-1.5 mb-2">
              <MonitorPlay className="w-3.5 h-3.5 text-teal-400" />
              Public Live OPD Display Board
            </span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              {queueInfo.hospitalName} — OPD Live Queue Status
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Live token numbers, doctor availability, room location, and estimated wait positions.
            </p>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-teal-300 block">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-xs font-semibold text-slate-400 uppercase">
              {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Single Doctor Main Display Card */}
        <div className="bg-slate-900 rounded-3xl p-8 border-2 border-slate-800 shadow-2xl space-y-8">
          
          {/* Doctor Info & Status */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-black text-white">{queueInfo.doctorName}</h3>
                <StatusBadge status={queueInfo.doctorStatus} />
              </div>
              <p className="text-xs font-semibold text-teal-400 mt-1">
                {queueInfo.specialization} • {queueInfo.qualification}
              </p>
            </div>

            <div className="px-4 py-2 bg-slate-950 rounded-xl border border-slate-800 text-xs font-bold text-teal-300 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-400" />
              <span>Consultation {queueInfo.roomNumber}</span>
            </div>
          </div>

          {/* Tokens Display Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Now Serving Big Card */}
            <div className="bg-gradient-to-br from-teal-950 to-slate-950 border border-teal-500/40 rounded-3xl p-8 text-center shadow-xl">
              <span className="text-xs font-extrabold uppercase tracking-widest text-teal-300 block mb-2">
                NOW SERVING
              </span>
              <div className={`font-black tracking-tight text-teal-200 animate-pulse my-2 ${
                queueInfo.nowServing && queueInfo.nowServing.length > 6
                  ? 'text-2xl sm:text-3xl py-2'
                  : 'text-5xl sm:text-6xl'
              }`}>
                {queueInfo.nowServing}
              </div>
              <span className="text-xs text-teal-300/80 font-medium">
                Please proceed inside {queueInfo.roomNumber} when your token is called
              </span>
            </div>

            {/* Next Token & Waiting Stats */}
            <div className="grid grid-cols-2 gap-4">
              
              <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 flex flex-col justify-center text-center space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase">NEXT TOKEN</span>
                <span className="text-4xl font-black text-amber-400 my-1">{queueInfo.nextToken}</span>
                <span className="text-[11px] text-slate-500 font-semibold">Be ready near door</span>
              </div>

              <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 flex flex-col justify-center text-center space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase">PATIENTS WAITING</span>
                <span className="text-4xl font-black text-white my-1">{queueInfo.patientsWaiting}</span>
                <span className="text-[11px] text-slate-500 font-semibold">In Waiting Line</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 col-span-2 flex justify-between items-center text-xs px-6">
                <span className="text-slate-400 font-semibold">Est. Waiting Time for New Patient</span>
                <span className="font-bold text-teal-300 text-sm">~{queueInfo.estimatedWaitingTimeMinutes} Mins</span>
              </div>

            </div>

          </div>

          <div className="text-right text-[11px] text-slate-500">
            Last Updated: {new Date(queueInfo.lastUpdated).toLocaleTimeString()} • Powered by MediQueue WebSockets
          </div>

        </div>

      </div>
    </section>
  );
};
