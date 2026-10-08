import React from 'react';

export const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction, secondaryActionLabel, onSecondaryAction }) => {
  return (
    <div className="bg-white rounded-3xl p-10 sm:p-12 border border-slate-200 text-center space-y-4 shadow-xs">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto border border-teal-100 shadow-inner">
          <Icon className="w-8 h-8 stroke-[1.75]" />
        </div>
      )}
      <div className="max-w-md mx-auto space-y-1.5">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      </div>
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/20 transition-all hover:scale-105"
            >
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
