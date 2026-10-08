import React from 'react';

export const TokenBadge = ({ priority }) => {
  const getBadgeStyle = () => {
    switch (priority) {
      case 'Emergency':
        return 'bg-red-600 text-white font-bold animate-bounce shadow-md shadow-red-500/30';
      case 'Pregnant':
        return 'bg-purple-100 text-purple-800 border-purple-300 font-semibold';
      case 'Disability':
        return 'bg-blue-100 text-blue-800 border-blue-300 font-semibold';
      case 'Senior':
        return 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
      case 'Normal':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 font-medium';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs border ${getBadgeStyle()}`}>
      {priority} Priority
    </span>
  );
};
