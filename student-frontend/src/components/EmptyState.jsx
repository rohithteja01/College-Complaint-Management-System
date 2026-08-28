import React from 'react';
import { Inbox, FileText, Search, PlusCircle, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There are no items to display matching your criteria.',
  actionText = null,
  actionLink = null,
  onActionClick = null,
  secondaryText = null,
  onSecondaryClick = null,
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center shadow-2xs">
      <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center mb-3.5 border border-slate-200/60">
        <Icon className="w-6 h-6 stroke-[1.75]" />
      </div>
      <h3 className="text-sm sm:text-base font-bold text-slate-900">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
        {description}
      </p>

      {(actionText || secondaryText) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {actionText && actionLink && (
            <Link
              to={actionLink}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{actionText}</span>
            </Link>
          )}

          {actionText && onActionClick && !actionLink && (
            <button
              onClick={onActionClick}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{actionText}</span>
            </button>
          )}

          {secondaryText && onSecondaryClick && (
            <button
              onClick={onSecondaryClick}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{secondaryText}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
