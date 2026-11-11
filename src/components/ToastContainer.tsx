import React from 'react';
import { ToastItem } from '../types/studyflow';

interface ToastContainerProps {
  toasts: ToastItem[];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none">
      {toasts.map((toast) => {
        let dotColor = 'bg-indigo-500';
        if (toast.type === 'success') dotColor = 'bg-emerald-500';
        if (toast.type === 'warning') dotColor = 'bg-amber-500';
        if (toast.type === 'error') dotColor = 'bg-rose-500';

        return (
          <div
            key={toast.id}
            className="p-3 rounded-xl bg-slate-900 border border-slate-700 shadow-xl text-xs font-medium text-slate-200 flex items-center space-x-2.5 pointer-events-auto fade-in max-w-sm"
          >
            <span className={`w-2 h-2 rounded-full ${dotColor} flex-shrink-0`} />
            <span className="flex-1">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
};

