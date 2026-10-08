import React from 'react';
import { HeartPulse, ShieldCheck, Award, Clock, Users, Cpu } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const AboutSection = () => {
  const { t } = useLanguage();

  return (
    <section id="about" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-teal-600 font-bold text-xs uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
            {t('aboutHospital')}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {t('aboutTitle')}
          </h2>
          <p className="text-slate-600 leading-relaxed text-base">
            {t('aboutDesc')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <HeartPulse className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">{t('patientFocusedCare')}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t('patientFocusedCareDesc')}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">{t('smartDigitalQueueFacility')}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t('smartDigitalQueueFacilityDesc')}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">{t('experiencedSpecialists')}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t('experiencedSpecialistsDesc')}
            </p>
          </div>

        </div>

      </div>
    </section>
  );
};

export default AboutSection;
