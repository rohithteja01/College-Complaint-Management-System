import React from 'react';
import { AlertTriangle, Info, CheckCircle, X, Loader2 } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed with this action?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning', // 'warning' | 'danger' | 'info' | 'success'
  loading = false,
}) {
  if (!isOpen) return null;

  const typeConfig = {
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-50 text-amber-700 border-amber-200',
      btnBg: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    danger: {
      icon: AlertTriangle,
      iconBg: 'bg-rose-50 text-rose-700 border-rose-200',
      btnBg: 'bg-rose-600 hover:bg-rose-700 text-white',
    },
    info: {
      icon: Info,
      iconBg: 'bg-blue-50 text-blue-700 border-blue-200',
      btnBg: 'bg-slate-900 hover:bg-slate-800 text-white',
    },
    success: {
      icon: CheckCircle,
      iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
  };

  const current = typeConfig[type] || typeConfig.warning;
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-xl w-[94vw] sm:w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
        <div className="flex items-start space-x-3">
          <div className={`p-2 sm:p-2.5 rounded-xl border flex-shrink-0 ${current.iconBg}`}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">{title}</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors shadow-2xs ${current.btnBg} disabled:opacity-50`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
