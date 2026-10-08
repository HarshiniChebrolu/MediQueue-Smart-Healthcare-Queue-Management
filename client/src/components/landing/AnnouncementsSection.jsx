import React, { useEffect, useState } from 'react';
import { Megaphone, Bell, Calendar, AlertCircle } from 'lucide-react';
import API from '../../services/api';
import { useSocket } from '../../context/SocketContext';

export const AnnouncementsSection = () => {
  const [announcements, setAnnouncements] = useState([]);
  const { socket } = useSocket();

  useEffect(() => {
    async function loadAnnouncements() {
      try {
        const { data } = await API.get('/announcements/active');
        setAnnouncements(data);
      } catch (e) {
        console.error('Error fetching announcements', e);
      }
    }
    loadAnnouncements();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('new_announcement', (ann) => {
      setAnnouncements((prev) => [ann, ...prev]);
    });
    return () => socket.off('new_announcement');
  }, [socket]);

  return (
    <section id="announcements" className="py-16 bg-slate-100/70 border-t border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-slate-900">Hospital Notices & Bulletins</h3>
            <p className="text-xs text-slate-500 font-medium">Updated live by Hospital Reception</p>
          </div>
        </div>

        {announcements.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center text-slate-500 text-sm border border-slate-200">
            No active announcements at this moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {announcements.map((ann) => (
              <div
                key={ann._id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      ann.type === 'Emergency Notice'
                        ? 'bg-red-100 text-red-800'
                        : ann.type === 'Doctor Delayed'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-teal-100 text-teal-800'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    {ann.type}
                  </span>
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(ann.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h4 className="text-lg font-bold text-slate-900">{ann.title}</h4>
                <p className="text-sm text-slate-600 leading-relaxed">{ann.message}</p>
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
};
