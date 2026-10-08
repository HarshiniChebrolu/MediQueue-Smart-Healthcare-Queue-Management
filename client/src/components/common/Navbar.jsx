import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, LogOut, LayoutDashboard, Tv, Globe, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

import { RoleSwitcher } from './RoleSwitcher';

export const Navbar = () => {
  const { user, logout, switchDemoRole } = useAuth();
  const { language, changeLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const handleOpenReceptionDesk = async (e) => {
    e.preventDefault();
    if (!user || (user.role !== 'receptionist' && user.role !== 'admin')) {
      try {
        await switchDemoRole('receptionist');
      } catch (err) {
        console.warn('Switch to receptionist error', err);
      }
    }
    navigate('/receptionist-dashboard');
  };

  const getDashboardRoute = () => {
    if (!user) return '/signin';
    if (user.role === 'patient') return '/patient-dashboard';
    if (user.role === 'doctor') return '/doctor-dashboard';
    if (user.role === 'receptionist') return '/receptionist-dashboard';
    if (user.role === 'admin') return '/admin-dashboard';
    return '/';
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Hospital Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/30 group-hover:scale-105 transition-transform">
            <Activity className="w-7 h-7 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-1 font-sans">
              Medi<span className="text-teal-600">Queue</span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest text-teal-700 block -mt-1">
              {t('opdClinicSubtitle')}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-4 font-semibold text-slate-700 text-sm">
          <a href="/#home" className="hover:text-teal-600 transition-colors">{t('home')}</a>
          
          <Link
            to="/display"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold rounded-xl border border-teal-200 transition-all text-xs"
          >
            <Tv className="w-3.5 h-3.5 text-teal-600" />
            <span>{t('publicTvDisplay')}</span>
          </Link>

          <button
            onClick={handleOpenReceptionDesk}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold rounded-xl border border-purple-200 transition-all text-xs cursor-pointer"
            title="Front-Desk Reception Console"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Reception Desk</span>
          </button>

          <a href="/#about" className="hover:text-teal-600 transition-colors">{t('about')}</a>
          <a href="/#doctor" className="hover:text-teal-600 transition-colors">{t('doctors')}</a>
          <a href="/#contact" className="hover:text-teal-600 transition-colors">{t('contact')}</a>

          {/* Language Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
            <Globe className="w-3.5 h-3.5 text-teal-600" />
            <select
              value={language}
              onChange={(e) => changeLanguage(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              aria-label="Select Language"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="te">తెలుగు</option>
            </select>
          </div>

          <RoleSwitcher />

          {user ? (
            <div className="flex items-center gap-3 ml-2">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.name}
                  className="w-9 h-9 rounded-full object-cover border-2 border-teal-500 shadow-sm"
                />
              ) : null}
              <Link
                to={getDashboardRoute()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-md shadow-teal-600/20"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>{t('dashboard')}</span>
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate('/signin');
                }}
                className="p-2 text-slate-400 hover:text-red-600 rounded-xl transition-colors"
                title={t('signOut')}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link
              to="/signin"
              className="px-4 py-2 text-sm font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors border border-teal-200"
            >
              {t('signIn')}
            </Link>
          )}
        </nav>

        {/* Mobile Actions */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="flex items-center bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 text-xs">
            <select
              value={language}
              onChange={(e) => changeLanguage(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
              aria-label="Select Language"
            >
              <option value="en">EN</option>
              <option value="hi">हिन्दी</option>
              <option value="te">తెలుగు</option>
            </select>
          </div>

          {user ? (
            <Link
              to={getDashboardRoute()}
              className="px-3 py-1.5 text-xs font-bold bg-teal-600 text-white rounded-lg"
            >
              {t('dashboard')}
            </Link>
          ) : (
            <Link
              to="/signin"
              className="px-3 py-1.5 text-xs font-bold bg-teal-600 text-white rounded-lg"
            >
              {t('signIn')}
            </Link>
          )}
        </div>

      </div>
    </header>
  );
};
