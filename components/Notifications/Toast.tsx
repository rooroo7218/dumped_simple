import React from 'react';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Toast as ToastType } from '../../hooks/useToast';

interface ToastListProps {
    toasts: ToastType[];
    onDismiss: (id: string) => void;
}

const ICONS = {
    success: <CheckCircleIcon className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />,
    error:   <XCircleIcon className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />,
    info:    <InformationCircleIcon className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />,
};

export const ToastList: React.FC<ToastListProps> = ({ toasts, onDismiss }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-32 inset-x-0 flex flex-col items-center gap-2 z-[700] px-4 pointer-events-none">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className="pointer-events-auto w-full max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300 bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl shadow-lg px-4 py-3 flex items-start gap-3"
                >
                    {ICONS[toast.variant]}
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800 leading-snug">{toast.message}</p>
                        {toast.sub && (
                            <p className="text-[11px] text-slate-500 mt-0.5">{toast.sub}</p>
                        )}
                    </div>
                    <button
                        onClick={() => onDismiss(toast.id)}
                        className="shrink-0 p-0.5 rounded-lg text-slate-400 hover:text-slate-500 transition-colors"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
};
