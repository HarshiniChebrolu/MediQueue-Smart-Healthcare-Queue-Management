import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { LanguageProvider } from './context/LanguageContext';

import LandingPage from './pages/LandingPage';
import SignInPage from './pages/SignInPage';
import RegisterPage from './pages/RegisterPage';
import CompleteProfilePage from './pages/CompleteProfilePage';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import ReceptionistDashboard from './pages/ReceptionistDashboard';
import AdminDashboard from './pages/AdminDashboard';
import PublicDisplayPage from './pages/PublicDisplayPage';
import QueueTrackerPage from './pages/QueueTrackerPage';

const ProtectedRoute = ({ children, allowedRoles, requireProfileCompleted = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 font-bold">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm">Connecting to Hospital Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/signin" replace />;

  if (requireProfileCompleted && user?.role === 'patient' && user.profileCompleted === false) {
    return <Navigate to="/complete-profile" replace />;
  }

  return children;
};

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/signin" element={<SignInPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/display" element={<PublicDisplayPage />} />

              <Route
                path="/complete-profile"
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <CompleteProfilePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/patient-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['patient']} requireProfileCompleted={true}>
                    <PatientDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/tracker"
                element={
                  <ProtectedRoute allowedRoles={['patient']} requireProfileCompleted={true}>
                    <QueueTrackerPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/doctor-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['doctor']}>
                    <DoctorDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Staff Consoles open directly with automatic role management */}
              <Route
                path="/receptionist-dashboard"
                element={<ReceptionistDashboard />}
              />

              <Route
                path="/admin-dashboard"
                element={<AdminDashboard />}
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
