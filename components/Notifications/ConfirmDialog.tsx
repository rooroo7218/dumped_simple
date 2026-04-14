import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ConfirmDialogProps {
    message: string;
    sub?: string;
    onConfirm: () => void;
    onCancel: () => void;
    destructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    message,
    sub,
    onConfirm,
    onCancel,
    destructive = false,
}) => {
    return (
        <div className="fixed inset-0 z-[800] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Dialog */}
            <div className="relative w-full max-w-sm animate-in zoom-in-95 fade-in duration-200 bg-white/95 backdrop-blur-md border-2 border-slate-200 rounded-2xl shadow-xl p-6">
                {destructive && (
                    <div className="flex justify-center mb-4">
                        <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                            <ExclamationTriangleIcon className="w-5 h-5 text-rose-500" />
                        </div>
                    </div>
                )}

                <h3 className="text-[15px] font-semibold text-slate-800 text-center leading-snug">
                    {message}
                </h3>

                {sub && (
                    <p className="mt-1.5 text-[12px] text-slate-400 text-center leading-relaxed">
                        {sub}
                    </p>
                )}

                <div className="flex gap-2 mt-5">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2.5 text-[13px] font-semibold rounded-xl border-2 border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-2.5 text-[13px] font-semibold rounded-xl transition-colors ${
                            destructive
                                ? 'bg-rose-500 text-white hover:bg-rose-600'
                                : 'bg-slate-900 text-white hover:bg-slate-700'
                        }`}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};
