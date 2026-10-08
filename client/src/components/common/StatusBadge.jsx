import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export const StatusBadge = ({ status }) => {
  const { t } = useLanguage();

  const getBadgeStyle = () => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Busy':
      case 'In Consultation':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'On Break':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Delayed':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'Unavailable':
      case 'Consultation Ended':
        return 'bg-slate-200 text-slate-700 border-slate-300';
      default:
        return 'bg-teal-100 text-teal-800 border-teal-300';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getBadgeStyle()}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      {t(status)}
    </span>
  );
};
