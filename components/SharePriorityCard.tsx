import React, { useState } from 'react';
import { ActionItem } from '../types';
import { XMarkIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';

interface SharePriorityCardProps {
    task: ActionItem;
    onClose: () => void;
}

export const SharePriorityCard: React.FC<SharePriorityCardProps> = ({ task, onClose }) => {
    const [copied, setCopied] = useState(false);

    const shareText = `My AI told me to: "${task.text}"${task.rationale ? `\n\n${task.rationale}` : ''}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(shareText).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-sm" onClick={e => e.stopPropagation()}>

                {/* The shareable card */}
                <div id="share-card" className="relative p-8 rounded-3xl overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', border: '2px solid rgba(255,255,255,0.1)' }}>

                    {/* Background texture dots */}
                    <div className="absolute inset-0 opacity-5" style={{
                        backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                    }} />

                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">
                            My AI told me to
                        </p>
                        <p className="text-xl font-bold text-white leading-snug mb-6">
                            "{task.text}"
                        </p>
                        {task.rationale && (
                            <p className="text-[13px] text-amber-300/80 leading-relaxed mb-6 italic">
                                {task.rationale}
                            </p>
                        )}
                        <div className="flex items-center justify-between">
                            {task.category && (
                                <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-white/10 text-white/60">
                                    {task.category}
                                </span>
                            )}
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-auto">
                                dumped.app
                            </span>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3 mt-4">
                    <button
                        onClick={handleCopy}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all bg-white text-slate-800 hover:bg-slate-50 border-2 border-slate-950 shadow-sm"
                    >
                        {copied ? (
                            <><CheckIcon className="w-4 h-4 text-emerald-500" /> Copied!</>
                        ) : (
                            <><ClipboardDocumentIcon className="w-4 h-4" /> Copy text</>
                        )}
                    </button>
                    <p className="text-[11px] text-slate-400 flex-1 text-center leading-snug">
                        Screenshot the card above to share
                    </p>
                    <button onClick={onClose} className="p-2.5 rounded-full bg-white/80 border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
