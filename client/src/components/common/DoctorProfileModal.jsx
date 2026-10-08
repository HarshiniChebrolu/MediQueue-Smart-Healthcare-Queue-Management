import React from 'react';
import { X, Stethoscope, Clock, MapPin, Award, Calendar, DollarSign, Users, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export const DoctorProfileModal = ({ doctor, isOpen, onClose, onBookAppointment }) => {
  if (!isOpen || !doctor) return null;

  const doctorUser = doctor.userId || {};
  const dept = doctor.departmentId || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Hero */}
        <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-slate-900 p-6 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 translate-x-8 -translate-y-8 pointer-events-none">
            <Stethoscope className="w-64 h-64" />
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10">
            <img
              src={doctor.profileImage || doctorUser.photoURL || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300'}
              alt={doctorUser.name || 'Doctor'}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-white/20 shadow-xl shrink-0"
            />
            <div className="text-center sm:text-left space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-xl sm:text-2xl font-black">{doctorUser.name || 'Dr. Physician'}</h3>
                <StatusBadge status={doctor.status || 'Available'} />
              </div>
              <p className="text-teal-200 font-semibold text-sm">
                {doctor.specialization}
              </p>
              <p className="text-xs text-slate-300">
                {doctor.qualification} • Reg: <span className="font-mono text-white">{doctor.registrationNumber}</span>
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2 text-xs text-slate-200">
                <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
                  <MapPin className="w-3.5 h-3.5 text-teal-300" />
                  <strong>{doctor.roomNumber || 'Room 101'}</strong>
                </span>
                <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
                  <Award className="w-3.5 h-3.5 text-teal-300" />
                  <span>{doctor.experience || 10}+ Years Exp</span>
                </span>
                <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
                  <Users className="w-3.5 h-3.5 text-teal-300" />
                  <span>{doctor.waitingCount ?? 0} in Queue</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Biography */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Professional Biography</h4>
            <p className="text-sm text-slate-700 leading-relaxed">
              {doctor.biography || 'Dedicated hospital clinical specialist providing patient-centered outpatient medical diagnosis and evidence-based care.'}
            </p>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-slate-400 font-semibold block">Department</span>
              <strong className="text-slate-900 font-bold mt-0.5 block truncate">{dept.name || 'OPD'}</strong>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-slate-400 font-semibold block">Consultation Timings</span>
              <strong className="text-slate-900 font-bold mt-0.5 block">{doctor.startTime || '09:00 AM'} - {doctor.endTime || '05:00 PM'}</strong>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-slate-400 font-semibold block">Avg Consult Time</span>
              <strong className="text-slate-900 font-bold mt-0.5 block">~{doctor.avgConsultationDuration || 10} mins</strong>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-slate-400 font-semibold block">Consultation Fee</span>
              <strong className="text-teal-700 font-bold mt-0.5 block">₹{doctor.consultationFee || 500}</strong>
            </div>
          </div>

          {/* Clinical Days */}
          <div className="bg-teal-50/50 p-4 rounded-2xl border border-teal-100 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-teal-900 block">Available OPD Days:</span>
              <span className="text-slate-600 font-medium">Monday through Saturday (Sunday Emergency Coverage)</span>
            </div>
            <span className="px-3 py-1 bg-teal-100 text-teal-800 font-bold rounded-lg shrink-0">
              Active OPD
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Close
            </button>
            {onBookAppointment && (
              <button
                onClick={() => {
                  onClose();
                  onBookAppointment(doctor);
                }}
                className="px-6 py-2.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-md shadow-teal-600/30 flex items-center gap-2 transition-all hover:scale-105"
              >
                <Calendar className="w-4 h-4" />
                <span>Book Appointment</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
