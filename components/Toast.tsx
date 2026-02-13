'use client';

import { useStore } from '@/lib/store';

export default function Toast() {
  const { toasts, removeToast } = useStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <div 
          key={toast.id}
          className={`flex items-center gap-3 p-4 rounded-xl shadow-lg backdrop-blur-md animate-slide-in ${
            toast.type === 'success' ? 'bg-emerald-500/95 text-white' :
            toast.type === 'error' ? 'bg-red-500/95 text-white' :
            'bg-gray-800/95 text-white'
          }`}
        >
          <span className="text-xl">
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
          </span>
          <p className="flex-1 text-sm font-medium">{toast.message}</p>
          <button 
            onClick={() => removeToast(toast.id)}
            className="opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
