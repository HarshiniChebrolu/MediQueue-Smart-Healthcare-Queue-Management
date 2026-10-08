import React, { useEffect, useState } from 'react';
import { Building2, UserCheck, Users, Shield, Loader2 } from 'lucide-react';
import API from '../../services/api';
import { useSocket } from '../../context/SocketContext';

export const StatsSection = () => {
  const { socket } = useSocket();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadStats = async () => {
    try {
      setError(false);
      const { data } = await API.get('/reports/daily-stats');
      if (data) {
        setStats(data);
      }
    } catch (e) {
      console.error('Error fetching landing page statistics', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('stats_updated', loadStats);
    socket.on('user_registered', loadStats);
    socket.on('queue_updated', loadStats);

    return () => {
      socket.off('stats_updated', loadStats);
      socket.off('user_registered', loadStats);
      socket.off('queue_updated', loadStats);
    };
  }, [socket]);

  return (
    <section className="bg-teal-950 py-12 text-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-6 text-teal-300 font-semibold text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading Live Hospital Statistics...</span>
          </div>
        ) : error && !stats ? (
          <div className="text-center py-6 text-red-300 text-sm font-semibold">
            Failed to load live statistics. Reconnecting...
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center divide-y lg:divide-y-0 lg:divide-x divide-teal-800/80">
            
            <div className="pt-4 lg:pt-0 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-teal-800/60 text-teal-300 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6" />
              </div>
              <div className="text-4xl font-extrabold text-white tracking-tight">{stats?.totalPatients ?? 0}</div>
              <p className="text-sm font-medium text-teal-200 uppercase tracking-wider">Registered Patients</p>
            </div>

            <div className="pt-4 lg:pt-0 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-teal-800/60 text-teal-300 flex items-center justify-center mx-auto mb-3">
                <UserCheck className="w-6 h-6" />
              </div>
              <div className="text-4xl font-extrabold text-white tracking-tight">{stats?.totalDoctors ?? 0}</div>
              <p className="text-sm font-medium text-teal-200 uppercase tracking-wider">Registered Doctors</p>
            </div>

            <div className="pt-4 lg:pt-0 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-teal-800/60 text-teal-300 flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6" />
              </div>
              <div className="text-4xl font-extrabold text-white tracking-tight">{stats?.totalReceptionists ?? 0}</div>
              <p className="text-sm font-medium text-teal-200 uppercase tracking-wider">Registered Receptionists</p>
            </div>

            <div className="pt-4 lg:pt-0 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-teal-800/60 text-teal-300 flex items-center justify-center mx-auto mb-3">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="text-4xl font-extrabold text-teal-300 tracking-tight">{stats?.activeDepartments ?? 0}</div>
              <p className="text-sm font-medium text-teal-200 uppercase tracking-wider">Departments</p>
            </div>

          </div>
        )}
      </div>
    </section>
  );
};

