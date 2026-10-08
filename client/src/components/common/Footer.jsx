import React from 'react';
import { Activity, Phone, Mail, MapPin, Clock, ShieldCheck, Heart } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          
          {/* Brand & Intro */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center text-slate-900 font-bold">
                <Activity className="w-6 h-6 stroke-[3]" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Medi<span className="text-teal-400">Queue</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              {t('aboutDesc')}
            </p>
            <div className="flex items-center gap-2 text-teal-400 text-xs font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>NABH Accredited Multispecialty Hospital</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-base">{t('quickLinks')}</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="/#about" className="hover:text-teal-400 transition-colors">{t('about')} MediQueue</a></li>
              <li><a href="/#departments" className="hover:text-teal-400 transition-colors">{t('departmentDirectory')}</a></li>
              <li><a href="/#doctors" className="hover:text-teal-400 transition-colors">{t('doctors')}</a></li>
              <li><a href="/display" target="_blank" className="hover:text-teal-400 transition-colors">{t('publicTvDisplay')}</a></li>
            </ul>
          </div>

          {/* Departments */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-base">{t('keySpecialities')}</h4>
            <ul className="space-y-2.5 text-sm">
              <li>General Medicine & Diabetology</li>
              <li>Cardiology & Heart Care</li>
              <li>Neurology & Neurosurgery</li>
              <li>Orthopaedics & Joint Surgery</li>
              <li>Pediatrics & Newborn Care</li>
              <li>Gynecology & Obstetrics</li>
            </ul>
          </div>

          {/* Contact Information */}
          <div className="space-y-3.5 text-sm">
            <h4 className="text-white font-semibold mb-4 text-base">{t('hospitalContact')}</h4>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
              <span>MediQueue Healthcare Campus, 100 Metro Health Boulevard, City Center</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-teal-400 shrink-0" />
              <div>
                <div>Reception: +1 800 555 0199</div>
                <div className="text-xs text-red-400 font-medium">{t('emergencyPhone')}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-teal-400 shrink-0" />
              <span>care@mediqueuehospital.com</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <Clock className="w-4 h-4 text-teal-400 shrink-0" />
              <span>{t('opdTimingsDesc')}</span>
            </div>
          </div>

        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} MediQueue Hospital. {t('allRightsReserved')}</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-slate-300">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300">Terms of Service</a>
            <a href="#" className="hover:text-slate-300">Patient Rights</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
