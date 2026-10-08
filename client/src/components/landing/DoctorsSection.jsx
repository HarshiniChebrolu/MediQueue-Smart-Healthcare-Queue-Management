import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Clock, MapPin, ArrowRight, UserCheck, Stethoscope } from 'lucide-react';
import API from '../../services/api';
import { StatusBadge } from '../common/StatusBadge';
import { useSocket } from '../../context/SocketContext';
import { useLanguage } from '../../context/LanguageContext';

export const DoctorsSection = () => {
  const { socket } = useSocket();
  const { t } = useLanguage();
  const [docInfo, setDocInfo] = useState(null);

  const fetchDoctor = async () => {
    try {
      const { data } = await API.get('/queue/public-display');
      setDocInfo(data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchDoctor();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('queue_updated', fetchDoctor);
    socket.on('doctor_status_changed', fetchDoctor);
    return () => {
      socket.off('queue_updated');
      socket.off('doctor_status_changed');
    };
  }, [socket]);

  if (!docInfo) return null;

  return (
    <section id="doctor" className="py-16 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <span className="text-teal-600 font-bold text-xs uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
            {t('seniorDoctorBadge')}
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('consultantPhysician')}
          </h2>
          <p className="text-slate-600 text-sm">
            {t('consultantSubtitle')}
          </p>
        </div>

        <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-3xl font-extrabold shadow-lg shadow-teal-600/30">
                <Stethoscope className="w-10 h-10" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-black text-slate-900">{docInfo.doctorName}</h3>
                  <StatusBadge status={docInfo.doctorStatus} />
                </div>
                <p className="text-sm font-bold text-teal-700 mt-0.5">{docInfo.specialization}</p>
                <p className="text-xs text-slate-500">{docInfo.qualification} • 15+ Years Clinical Experience</p>
              </div>
            </div>

            <Link
              to="/patient-dashboard"
              className="px-5 py-3 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md shadow-teal-600/20 flex items-center gap-2 transition-all hover:scale-105"
            >
              <span>{t('joinQueue')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold block">{t('consultationRoom')}</span>
              <strong className="text-slate-900 text-base">{docInfo.roomNumber}</strong>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold block">{t('avgConsultationTime')}</span>
              <strong className="text-teal-700 text-base">{docInfo.avgConsultationDuration} {t('mins')}</strong>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold block">{t('nowServing')}</span>
              <strong className="text-teal-900 text-base font-black">{docInfo.nowServing}</strong>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold block">{t('totalWaiting')}</span>
              <strong className="text-slate-900 text-base font-black">{docInfo.patientsWaiting}</strong>
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100">
            <span>{t('opdTimingsDesc')}</span>
            <span>{t('emergencyPhone')}</span>
          </div>

        </div>

      </div>
    </section>
  );
};
