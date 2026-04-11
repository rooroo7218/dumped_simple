import React, { useState, useEffect, useRef } from 'react';
import { MemoryItem } from '../types';
import { processBrainDump } from '../services/geminiService';

interface SimpleDumpHubProps {
    memories: MemoryItem[];
    setActiveTab: (tab: string) => void;
}

export const SIMPLE_KEY = 'dumped_simple_entries';

export interface SimpleEntry {
    id: string;
    content: string;
    timestamp: string;
    lines: string[];
}

export const SimpleDumpHub: React.FC<SimpleDumpHubProps> = ({ memories, setActiveTab }) => {
    const [text, setText] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    // Stats from existing AI-extracted memories
    const dumpDays = new Set(
        memories.map(m => new Date(m.timestamp).toDateString())
    ).size;
    const totalItems = memories.reduce((acc, m) => acc + (m.actions?.length || 0), 0);

    async function handleSubmit() {
        if (!text.trim()) return;

        setIsProcessing(true);

        let lines: string[] = [];
        try {
            const result = await processBrainDump(text.trim(), [], {} as any);
            const actions = result.actions || [];
            lines = actions.length > 0
                ? actions.map((a: any) => a.text).filter(Boolean)
                : text.trim().split('\n').filter(Boolean);
        } catch {
            lines = text.trim().split('\n').filter(Boolean);
        }

        const existing: SimpleEntry[] = (() => {
            try { return JSON.parse(localStorage.getItem(SIMPLE_KEY) || '[]'); } catch { return []; }
        })();

        existing.push({
            id: crypto.randomUUID(),
            content: text.trim(),
            timestamp: new Date().toISOString(),
            lines,
        });

        localStorage.setItem(SIMPLE_KEY, JSON.stringify(existing));
        setIsProcessing(false);
        setSubmitted(true);
        setText('');

        setTimeout(() => {
            setSubmitted(false);
            setActiveTab('memory-grid');
        }, 800);
    }

    return (
        <div className="animate-in fade-in min-h-[80vh] flex flex-col max-w-lg mx-auto w-full py-8">

            {/* Brand */}
            <div className="text-slate-800 font-semibold text-lg mb-6 tracking-tight">
                Dumped.
            </div>

            {/* Textarea */}
            <div className="flex-1 flex flex-col">
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder={"Just keep going. Nothing is too small.\n\nOne thing per line."}
                    className="flex-1 w-full bg-white/70 border border-white/90 rounded-2xl p-4 text-slate-800 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-slate-200 placeholder:text-slate-400 min-h-[300px]"
                    onKeyDown={e => {
                        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit();
                    }}
                />

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={!text.trim() || submitted || isProcessing}
                    className={`mt-4 w-full rounded-full py-3 text-sm font-semibold transition-all duration-200 ${
                        submitted
                            ? 'bg-emerald-500 text-white scale-[0.98]'
                            : isProcessing
                            ? 'bg-slate-400 text-white cursor-wait'
                            : text.trim()
                            ? 'bg-slate-800 text-white hover:bg-slate-700 hover:scale-[1.01] active:scale-[0.99]'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                >
                    {submitted ? 'Done ✓' : isProcessing ? 'Breaking it down...' : 'Put it all down'}
                </button>

                <p className="text-center text-slate-400 text-xs mt-3">
                    {dumpDays > 0
                        ? `Day ${dumpDays} · ${totalItems} things put down so far`
                        : 'Start your first dump'}
                </p>
                <p className="text-center text-slate-300 text-[10px] mt-1">
                    ⌘ + Enter to submit
                </p>
            </div>
        </div>
    );
};
