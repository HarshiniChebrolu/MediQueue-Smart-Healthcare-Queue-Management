import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Lock, Mail, UserCheck, Stethoscope, User, ArrowRight, Smartphone, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

export const SignInPage = () => {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  const [activeRole, setActiveRole] = useState('patient'); // patient, doctor, receptionist
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  // Google OAuth Popup Modal State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password, activeRole);
      if (user.role === 'patient') {
        if (!user.profileCompleted) navigate('/complete-profile');
        else navigate('/patient-dashboard');
      } else if (user.role === 'doctor') {
        navigate('/doctor-dashboard');
      } else if (user.role === 'receptionist') {
        navigate('/receptionist-dashboard');
      } else if (user.role === 'admin') {
        navigate('/admin-dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (roleEmail, rolePass, roleName) => {
    setActiveRole(roleName);
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  // Google Sign-In Executer
  const executeGoogleAuth = async (googleUser) => {
    setError('');
    setLoadingGoogle(true);
    try {
      const res = await googleLogin({ googleUser });
      if (!res.profileCompleted) {
        navigate('/complete-profile');
      } else {
        navigate('/patient-dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Google authentication failed.');
    } finally {
      setLoadingGoogle(false);
      setShowGoogleModal(false);
    }
  };

  const handleGoogleClick = () => {
    if (activeRole !== 'patient') {
      setError('Google Sign-In is for Patients only. Doctors and Receptionists must sign in using Email & Password.');
      return;
    }
    setShowGoogleModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <Link to="/" className="inline-flex items-center gap-2 group">
          <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/30">
            <Activity className="w-7 h-7 stroke-[2.5]" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-slate-900">
            Medi<span className="text-teal-600">Queue</span>
          </span>
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Sign in to Hospital Portal</h2>
        <p className="text-xs text-slate-500">Access role-specific OPD queues and clinical dashboards</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl border border-slate-200 sm:px-10">
          
          {/* Role Tabs Selection */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => { setActiveRole('patient'); setEmail(''); setPassword(''); setError(''); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                activeRole === 'patient'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Patient</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveRole('doctor'); setEmail(''); setPassword(''); setError(''); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                activeRole === 'doctor'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>Doctor</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveRole('receptionist'); setEmail(''); setPassword(''); setError(''); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                activeRole === 'receptionist'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Reception</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveRole('admin'); setEmail(''); setPassword(''); setError(''); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                activeRole === 'admin'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Registered Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`Enter ${activeRole} email`}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-md shadow-teal-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
            >
              {loading ? 'Authenticating...' : `Sign In as ${activeRole.toUpperCase()}`}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* PATIENT-ONLY GOOGLE SIGN IN & OTP SECTION */}
          {activeRole === 'patient' && (
            <>
              {/* OR Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-slate-400 font-bold tracking-wider">OR</span>
                </div>
              </div>

              {/* Continue with Google Button */}
              <button
                type="button"
                disabled={loadingGoogle}
                onClick={handleGoogleClick}
                className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-slate-700 font-bold text-sm shadow-sm flex items-center justify-center gap-3 transition-all hover:scale-[1.01] hover:border-slate-400 hover:shadow"
              >
                {loadingGoogle ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-slate-600" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Connecting to Google...</span>
                  </span>
                ) : (
                  <>
                    <GoogleIcon />
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              {/* Continue with Mobile OTP (Coming Soon) */}
              <div className="mt-3">
                <button
                  type="button"
                  disabled
                  className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 font-semibold text-xs flex items-center justify-between cursor-not-allowed opacity-80"
                >
                  <span className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-slate-400" />
                    <span>Continue with Mobile OTP</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    Coming Soon
                  </span>
                </button>
              </div>
            </>
          )}

          {/* Quick Login Helper Box */}
          <div className="mt-6 pt-6 border-t border-slate-100 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">
              Quick One-Click Demo Credentials
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('patient@mediqueue.com', 'Patient123!', 'patient')}
                className="p-2 text-[11px] font-medium bg-slate-50 hover:bg-teal-50 hover:text-teal-700 border border-slate-200 rounded-lg text-slate-700 transition-colors"
              >
                Patient Demo
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('dr.arthur@mediqueue.com', 'Doctor123!', 'doctor')}
                className="p-2 text-[11px] font-medium bg-slate-50 hover:bg-teal-50 hover:text-teal-700 border border-slate-200 rounded-lg text-slate-700 transition-colors"
              >
                Doctor Demo
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('receptionist@mediqueue.com', 'Password123!', 'receptionist')}
                className="p-2 text-[11px] font-medium bg-slate-50 hover:bg-teal-50 hover:text-teal-700 border border-slate-200 rounded-lg text-slate-700 transition-colors"
              >
                Reception Demo
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('admin@mediqueue.com', 'Admin123!', 'admin')}
                className="p-2 text-[11px] font-medium bg-slate-50 hover:bg-amber-50 hover:text-amber-800 border border-slate-200 rounded-lg text-slate-700 transition-colors"
              >
                Admin Demo
              </button>
            </div>
          </div>

          {/* Register Patient Link */}
          {activeRole === 'patient' && (
            <div className="mt-6 text-center text-xs text-slate-600">
              Don't have a patient account yet?{' '}
              <Link to="/register" className="font-bold text-teal-600 hover:underline">
                Register as New Patient
              </Link>
            </div>
          )}

        </div>
      </div>

      {/* GOOGLE ACCOUNT CHOOSER MODAL (Dev & Production Instant Sign-In) */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 animate-scaleUp relative">
            <button
              onClick={() => setShowGoogleModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <GoogleIcon />
              <div>
                <h3 className="text-base font-bold text-slate-900">Sign in with Google</h3>
                <p className="text-xs text-slate-500">Choose a Google Patient account to continue</p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Google Account:</p>

              {/* Sample Google Accounts */}
              <button
                onClick={() =>
                  executeGoogleAuth({
                    name: 'Aarav Sharma',
                    email: 'aarav.sharma@gmail.com',
                    sub: 'google_10928374829101',
                    picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                  })
                }
                className="w-full p-3 bg-slate-50 hover:bg-teal-50/60 border border-slate-200 hover:border-teal-300 rounded-2xl flex items-center gap-3 text-left transition-all group"
              >
                <div className="w-9 h-9 rounded-full bg-teal-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                  AS
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-teal-800">Aarav Sharma</div>
                  <div className="text-[11px] text-slate-500 truncate">aarav.sharma@gmail.com</div>
                </div>
                <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">New Patient</span>
              </button>

              <button
                onClick={() =>
                  executeGoogleAuth({
                    name: 'Priya Patel',
                    email: 'priya.patel@gmail.com',
                    sub: 'google_10928374829102',
                    picture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
                  })
                }
                className="w-full p-3 bg-slate-50 hover:bg-teal-50/60 border border-slate-200 hover:border-teal-300 rounded-2xl flex items-center gap-3 text-left transition-all group"
              >
                <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                  PP
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-teal-800">Priya Patel</div>
                  <div className="text-[11px] text-slate-500 truncate">priya.patel@gmail.com</div>
                </div>
                <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">New Patient</span>
              </button>
            </div>

            {/* Custom Google Email input */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <p className="text-[11px] font-bold text-slate-500">Or enter custom Google account details:</p>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Full Name (e.g. Rahul Verma)"
                  value={customGoogleName}
                  onChange={(e) => setCustomGoogleName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
                <input
                  type="email"
                  placeholder="Google Email (e.g. rahul@gmail.com)"
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
                <button
                  type="button"
                  disabled={!customGoogleEmail.trim()}
                  onClick={() =>
                    executeGoogleAuth({
                      name: customGoogleName.trim() || 'Google Patient',
                      email: customGoogleEmail.trim(),
                      sub: `google_${Date.now()}`,
                    })
                  }
                  className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-colors"
                >
                  Authorize with Custom Google Account
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default SignInPage;
