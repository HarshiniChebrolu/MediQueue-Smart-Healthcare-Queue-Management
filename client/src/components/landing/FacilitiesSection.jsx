import React from 'react';
import {
  Cross,
  Pill,
  TestTube,
  Radio,
  Truck,
  HeartPulse,
  Flame,
  MonitorPlay,
  Accessibility,
  HelpCircle,
} from 'lucide-react';

export const FacilitiesSection = () => {
  const facilities = [
    { title: '24/7 Emergency Care', desc: 'Fully equipped trauma bay with immediate resuscitation & triage.', icon: Cross, color: 'text-red-600 bg-red-50' },
    { title: 'In-House Pharmacy', desc: 'Comprehensive medicine store open round the clock.', icon: Pill, color: 'text-emerald-600 bg-emerald-50' },
    { title: 'Advanced Pathology Lab', desc: 'Automated blood analyzers, microbiology, and histology tests.', icon: TestTube, color: 'text-purple-600 bg-purple-50' },
    { title: 'Digital Radiology & Imaging', desc: 'High-speed MRI, CT scan, digital X-Ray and color Doppler.', icon: Radio, color: 'text-blue-600 bg-blue-50' },
    { title: 'Advanced Cardiac Ambulance', desc: 'GPS-enabled ICU ambulances with ventilator & trained paramedics.', icon: Truck, color: 'text-rose-600 bg-rose-50' },
    { title: 'Intensive Care Units (ICU)', desc: 'Multidisciplinary ICUs with central monitoring and life support.', icon: HeartPulse, color: 'text-teal-600 bg-teal-50' },
    { title: 'Modular Operation Theatres', desc: 'Ultra-clean laminar air flow surgical suites.', icon: Flame, color: 'text-amber-600 bg-amber-50' },
    { title: 'Digital Token Queue Service', desc: 'Live position tracking and automatic wait-time calculation.', icon: MonitorPlay, color: 'text-cyan-600 bg-cyan-50' },
    { title: 'Wheelchair & Stretcher Support', desc: 'Dedicated patient mobility assistance at entrance.', icon: Accessibility, color: 'text-indigo-600 bg-indigo-50' },
    { title: 'Patient Help Desk', desc: 'Friendly guidance counter for registration and billing support.', icon: HelpCircle, color: 'text-slate-700 bg-slate-100' },
  ];

  return (
    <section id="facilities" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-teal-600 font-bold text-xs uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
            Infrastructure & Care
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Modern Hospital Facilities
          </h2>
          <p className="text-slate-600 text-base">
            Equipped with state-of-the-art medical technology to provide comprehensive healthcare under one roof.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map((fac, idx) => {
            const Icon = fac.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:shadow-md transition-all space-y-3"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${fac.color}`}>
                  <Icon className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{fac.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{fac.desc}</p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
