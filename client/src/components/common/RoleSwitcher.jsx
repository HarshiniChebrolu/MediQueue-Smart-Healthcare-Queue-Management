import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Users, Stethoscope, ShieldCheck, ChevronDown, Check, Sparkles } from 'lucide-react';

export const RoleSwitcher = () => {
  const { user, switchDemoRole } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const roles = [
    {
      key: 'patient',
      name: 'David Miller',
      roleLabel: 'Patient',
      desc: 'Token GM-001 (In Consultation)',
      route: '/patient-dashboard',
      icon: Users,
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    {
      key: 'doctor-arthur',
      name: 'Dr. Arthur Pendelton',
      roleLabel: 'Doctor (OPD)',
      desc: 'Room 101 • 3 in Queue',
      route: '/doctor-dashboard',
      icon: Stethoscope,
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    },
    {
      key: 'doctor-sarah',
      name: 'Dr. Sarah Jenkins',
      roleLabel: 'Doctor (Cardio)',
      desc: 'Room 204 • Urgent Queue',
      route: '/doctor-dashboard',
      icon: Stethoscope,
      badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    },
    {
      key: 'receptionist',
      name: 'Elena Rostova',
      roleLabel: 'Receptionist / Staff',
      desc: 'Hospital Queue Frontdesk',
      route: '/receptionist-dashboard',
      icon: ShieldCheck,
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    },
    {
      key: 'admin',
      name: 'Dr. James Sterling',
      roleLabel: 'Hospital Administrator',
      desc: 'CMO Executive Console',
      route: '/admin-dashboard',
      icon: ShieldCheck,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    },
  ];

  const handleSelectRole = async (targetRole) => {
    setSwitching(true);
    setOpen(false);
    try {
      await switchDemoRole(targetRole.key);
      navigate(targetRole.route);
    } catch (err) {
      console.error('Failed to switch demo role', err);
    } finally {
      setSwitching(false);
    }
  };

  const currentRoleLabel = user?.role === 'patient'
    ? 'Patient Portal'
    : user?.role === 'doctor'
    ? `Dr. ${user?.name?.split(' ')?.[1] || user?.name || 'Doctor'}`
    : user?.role === 'receptionist'
    ? 'Staff / Reception'
    : user?.role === 'admin'
    ? 'Admin Console'
    : 'Portal';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={switching}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 transition-all shadow-sm"
        title="Quick Role Switcher for Evaluation"
      >
        <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
        <span className="hidden sm:inline text-slate-500 font-semibold">Demo Role:</span>
        <span className="text-teal-900 font-black">{switching ? 'Switching...' : currentRoleLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-scaleUp">
            <div className="px-3 py-2 border-b border-slate-100 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Instant Role Switcher
              </span>
              <p className="text-xs text-slate-600">Switch roles seamlessly to evaluate experiences</p>
            </div>

            <div className="space-y-1">
              {roles.map((r) => {
                const Icon = r.icon;
                const isSelected =
                  (r.key === 'patient' && user?.role === 'patient') ||
                  (r.key.startsWith('doctor') && user?.role === 'doctor' && user?.email?.includes(r.key.split('-')[1])) ||
                  (r.key === 'receptionist' && user?.role === 'receptionist') ||
                  (r.key === 'admin' && user?.role === 'admin');

                return (
                  <button
                    key={r.key}
                    onClick={() => handleSelectRole(r)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors ${
                      isSelected
                        ? 'bg-teal-50 border border-teal-200 text-teal-950 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                        <Icon className="w-4 h-4 text-teal-700" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 leading-tight">{r.name}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 block leading-tight">{r.desc}</span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
