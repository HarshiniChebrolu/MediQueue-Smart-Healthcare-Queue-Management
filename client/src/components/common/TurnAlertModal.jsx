import React, { useState, useEffect } from 'react';
import { BellRing, CheckCircle2, ArrowRight, Clock, Sliders } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import API from '../../services/api';

export const TurnAlertModal = () => {
  const { activeTurnAlert, setActiveTurnAlert, markAsRead } = useNotification();
  const { t } = useLanguage();
  const [selectedPref, setSelectedPref] = useState('every_time');
  const [timeLeft, setTimeLeft] = useState(120);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!activeTurnAlert) {
      setTimeLeft(120);
      return;
    }

    const calcRemaining = () => {
      const called = activeTurnAlert.calledTime ? new Date(activeTurnAlert.calledTime).getTime() : Date.now();
      const elapsedSecs = Math.floor((Date.now() - called) / 1000);
      return Math.max(0, 120 - elapsedSecs);
    };

    const initialRemaining = calcRemaining();
    setTimeLeft(initialRemaining);

    if (initialRemaining <= 0) {
      handleTimeout();
      return;
    }

    const timer = setInterval(() => {
      const remaining = calcRemaining();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        handleTimeout();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTurnAlert]);

  const handleTimeout = async () => {
    if (!activeTurnAlert) return;
    try {
      if (activeTurnAlert.tokenId) {
        await API.put(`/queue/missed-call-timeout/${activeTurnAlert.tokenId}`);
      }
      if (activeTurnAlert.notification?._id) {
        await markAsRead(activeTurnAlert.notification._id);
      }
    } catch (e) {
      console.error('Error auto requeuing timed out patient', e);
    } finally {
      setActiveTurnAlert(null);
    }
  };

  const handleConfirmOK = async () => {
    if (!activeTurnAlert) return;
    setIsSubmitting(true);
    try {
      if (activeTurnAlert.tokenId) {
        await API.put(`/queue/preference/${activeTurnAlert.tokenId}`, { preference: selectedPref });
      }
      if (activeTurnAlert.notification?._id) {
        await markAsRead(activeTurnAlert.notification._id);
      }
    } catch (e) {
      console.error('Error saving preference on OK', e);
    } finally {
      setIsSubmitting(false);
      setActiveTurnAlert(null);
    }
  };

  if (!activeTurnAlert) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center shadow-2xl border-4 border-teal-500 relative overflow-hidden animate-scaleUp max-h-[95vh] overflow-y-auto">
        
        {/* Dismiss (X) Button */}
        <button
          onClick={handleConfirmOK}
          className="absolute top-4 right-4 w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 rounded-full flex items-center justify-center font-black text-sm transition-all"
          title="Dismiss Alert"
        >
          ✕
        </button>

        {/* Top Glow & Call Badge */}
        <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3 text-teal-600 shadow-inner shrink-0">
          <BellRing className="w-8 h-8 animate-bounce text-teal-600" />
        </div>

        <span className="inline-block px-3 py-1 bg-red-100 text-red-700 font-bold text-xs uppercase tracking-widest rounded-full mb-2">
          {t('immediatePatientCall')}
        </span>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">
          {t('itsYourTurn')}
        </h2>

        <p className="text-xs font-semibold text-slate-600 mb-4">
          {t('doctorCalledYou')}
        </p>

        {/* 2-Minute Call Countdown Banner */}
        <div className="bg-amber-500 text-white rounded-2xl p-3 flex items-center justify-between shadow-md mb-4">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase">
            <Clock className="w-4 h-4 animate-spin" />
            <span>{t('timeRemainingToReach')}</span>
          </div>
          <span className="text-2xl font-black font-mono bg-amber-600 px-3 py-1 rounded-xl">
            {formattedTime}
          </span>
        </div>

        {/* Token Card */}
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 my-3 shadow-inner">
          <p className="text-xs font-semibold text-teal-800 uppercase tracking-wide">{t('yourDigitalToken')}</p>
          <div className="text-5xl font-black text-teal-700 my-1 tracking-tight">
            {activeTurnAlert.tokenNumber}
          </div>
          <div className="text-slate-700 text-xs font-medium flex items-center justify-center gap-2 mt-2">
            <span>{t('proceedTo')}</span>
            <span className="font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-300">
              {activeTurnAlert.roomNumber || 'Room 101'}
            </span>
          </div>
        </div>

        {/* Mandatory Notification Preference Selection */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 my-4 text-left space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Sliders className="w-4 h-4 text-teal-600" />
            <span>{t('notificationPreferences')}:</span>
          </div>

          <div className="space-y-1.5 text-xs">
            <label className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer transition-all ${selectedPref === 'every_time' ? 'bg-teal-50 border-teal-500 font-bold text-teal-900' : 'bg-white border-slate-200 text-slate-700'}`}>
              <input
                type="radio"
                name="alert_pref"
                value="every_time"
                checked={selectedPref === 'every_time'}
                onChange={() => setSelectedPref('every_time')}
                className="text-teal-600 focus:ring-teal-500"
              />
              <span>{t('remindMeEveryTime')}</span>
            </label>

            <label className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer transition-all ${selectedPref === 'when_next' ? 'bg-teal-50 border-teal-500 font-bold text-teal-900' : 'bg-white border-slate-200 text-slate-700'}`}>
              <input
                type="radio"
                name="alert_pref"
                value="when_next"
                checked={selectedPref === 'when_next'}
                onChange={() => setSelectedPref('when_next')}
                className="text-teal-600 focus:ring-teal-500"
              />
              <span>{t('remindMeWhenNext')}</span>
            </label>

            <label className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer transition-all ${selectedPref === 'tracking' ? 'bg-teal-50 border-teal-500 font-bold text-teal-900' : 'bg-white border-slate-200 text-slate-700'}`}>
              <input
                type="radio"
                name="alert_pref"
                value="tracking"
                checked={selectedPref === 'tracking'}
                onChange={() => setSelectedPref('tracking')}
                className="text-teal-600 focus:ring-teal-500"
              />
              <span>{t('silentTracking')}</span>
            </label>
          </div>
        </div>

        {/* Mandatory OK Button */}
        <button
          onClick={handleConfirmOK}
          disabled={isSubmitting}
          className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-black text-lg rounded-2xl shadow-lg shadow-teal-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
        >
          <CheckCircle2 className="w-6 h-6" />
          <span>{isSubmitting ? 'Saving...' : t('okProceeding')}</span>
        </button>

      </div>
    </div>
  );
};
