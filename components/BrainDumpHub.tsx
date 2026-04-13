import React, { useState, useEffect } from 'react';
import {
    XMarkIcon,
    MicrophoneIcon,
    LinkIcon,
    PaperAirplaneIcon,
    ArrowPathIcon,
    CheckIcon,
    PlusIcon,
} from '@heroicons/react/24/outline';
import { MemoryItem, ActionItem, UserPersona } from '../types';

interface BrainDumpHubProps {
    input: string;
    setInput: (val: string | ((prev: string) => string)) => void;
    isProcessing: boolean;
    handleBrainDumpSubmit: () => Promise<void>;
    startSpeechToText: (onResult: (text: string) => void) => void;
    isListening: boolean;
    handleImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    imagePreview: string | null;
    clearImage: () => void;
    persona: UserPersona;
    
    // Draft flow props
    scanDraft: MemoryItem | null;
    setScanDraft: React.Dispatch<React.SetStateAction<MemoryItem | null>>;
    updateDraftTask: (taskId: string, updates: Partial<ActionItem>) => void;
    handleCommitScan: () => void;
    handleBubbleDragStart: (e: React.MouseEvent, taskId: string) => void;
    handleCanvasMouseMove: (e: React.MouseEvent) => void;
    handleCanvasMouseUp: () => void;
    canvasRef: React.RefObject<HTMLDivElement>;
}

export const BrainDumpHub: React.FC<BrainDumpHubProps> = ({
    input,
    setInput,
    isProcessing,
    handleBrainDumpSubmit,
    startSpeechToText,
    isListening,
    handleImageSelect,
    imagePreview,
    clearImage,
    persona,
    
    scanDraft,
    setScanDraft,
    updateDraftTask,
    handleCommitScan,
    handleBubbleDragStart,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    canvasRef,
}) => {
    const [thinkingMsg, setThinkingMsg] = useState('Organizing thoughts...');
    
    useEffect(() => {
        if (isProcessing) {
            const msgs = ['Scanning context...', 'Identifying patterns...', 'Extracting actions...', 'Decluttering mind...'];
            let i = 0;
            const interval = setInterval(() => {
                setThinkingMsg(msgs[i % msgs.length]);
                i++;
            }, 2500);
            return () => clearInterval(interval);
        }
    }, [isProcessing]);

    const hasContent = input.trim() || imagePreview || scanDraft;

    return (
        <section 
            className="relative h-[85vh] w-full flex flex-col items-center select-none overflow-hidden"
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
        >
            {/* ── Canvas Area: Floating Draft Bubbles ── */}
            <div 
                ref={canvasRef}
                className="absolute inset-x-0 top-0 bottom-32 z-0 pointer-events-auto"
            >
                {!hasContent && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-100 animate-in fade-in transition-all duration-1000">
                        <div className="text-center max-w-lg px-6">
                            <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight mb-4">
                                What's on your mind?
                            </h1>
                            <p className="text-slate-500 text-lg md:text-xl font-medium leading-relaxed">
                                Dump your thoughts, worries, or todos. We'll handle the rest.
                            </p>
                        </div>
                    </div>
                )}

                {/* Scan Draft Results (Bubbles) */}
                {scanDraft && (
                    <div className="absolute inset-0 z-10">
                        {/* Summary Header */}
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 animate-in slide-in-from-top-4 fade-in duration-500">
                            <div className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl px-6 py-3 shadow-2xl flex flex-col items-center gap-1 min-w-[300px]">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">AI Detected Patterns</span>
                                <h3 className="text-slate-800 font-bold text-base truncate max-w-[400px]">
                                    {scanDraft.content.substring(0, 40)}{scanDraft.content.length > 40 ? '...' : ''}
                                </h3>
                                <div className="flex items-center gap-4 mt-2 pt-2 border-t border-slate-100 w-full justify-center">
                                    <button 
                                        onClick={() => setScanDraft(null)}
                                        className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleCommitScan}
                                        className="bg-slate-950 text-white px-5 py-1.5 rounded-full text-[12px] font-bold hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-1.5"
                                    >
                                        <CheckIcon className="w-4 h-4" /> Save all
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Floating Task Cards */}
                        {scanDraft.actions?.map((task) => (
                            <div
                                key={task.id}
                                onMouseDown={(e) => handleBubbleDragStart(e, task.id)}
                                style={{ 
                                    left: `${task.x ?? 50}%`, 
                                    top: `${task.y ?? 50}%`,
                                    transition: draggingTaskId === task.id ? 'none' : 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                }}
                                className={`absolute group cursor-grab active:cursor-grabbing z-10 w-64 md:w-72 animate-in zoom-in-50 fade-in duration-500`}
                            >
                                <div className="bg-white border border-white/20 shadow-2xl rounded-[24px] p-5 backdrop-blur-md bg-white/95 flex flex-col gap-3 group-hover:scale-105 transition-all">
                                    <div className="flex items-center justify-between">
                                        <div className="bg-slate-100 px-2 py-1 rounded-lg">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">{task.category}</span>
                                        </div>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setScanDraft(prev => {
                                                    if (!prev) return null;
                                                    return { ...prev, actions: (prev.actions || []).filter(a => a.id !== task.id) };
                                                });
                                            }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-rose-50 text-rose-400"
                                        >
                                            <XMarkIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <textarea
                                        value={task.text}
                                        onChange={(e) => updateDraftTask(task.id, { text: e.target.value })}
                                        rows={2}
                                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-semibold text-slate-800 resize-none leading-snug"
                                    />
                                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-50">
                                        <div className={`h-1.5 rounded-full w-1/3 ${task.urgency > 7 ? 'bg-amber-400' : 'bg-slate-200'}`} />
                                        <span className="text-[10px] font-bold text-slate-400">
                                            {task.urgency > 7 ? 'High Priority' : 'Regular'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Input Bar Area (Fixed bottom center) ── */}
            <div className="fixed bottom-20 md:bottom-10 inset-x-0 z-50 px-4 md:px-0 flex justify-center">
                <div className="w-full max-w-2xl flex flex-col gap-3">
                    
                    {/* Thinking / Processing indicator */}
                    {isProcessing && (
                        <div className="pl-6 animate-pulse">
                            <span className="text-[13px] font-black uppercase tracking-widest text-slate-900 drop-shadow-sm">
                                {thinkingMsg}
                            </span>
                        </div>
                    )}

                    <div className="bg-white/70 backdrop-blur-2xl border border-white/20 rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] flex flex-col transition-all group focus-within:shadow-[0_20px_70px_-15px_rgba(0,0,0,0.2)]">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                    e.preventDefault();
                                    handleBrainDumpSubmit();
                                }
                            }}
                            placeholder={isProcessing ? 'AI is scanning...' : 'Deep breath... dump your mind here (⌘+Enter to send)'}
                            className="w-full bg-transparent border-none focus:ring-0 resize-none font-medium text-lg text-slate-800 placeholder:text-slate-300 px-6 pt-6 pb-2 leading-relaxed"
                            rows={3}
                            disabled={isProcessing}
                        />

                        <div className="flex items-center justify-between px-5 pb-5 pt-1">
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => startSpeechToText((res) => setInput(p => p + ' ' + res))}
                                    disabled={isProcessing}
                                    className={`p-2.5 rounded-2xl transition-all active:scale-95 ${
                                        isListening ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                                >
                                    <MicrophoneIcon className="w-5.5 h-5.5" />
                                </button>
                                <label className="p-2.5 rounded-2xl cursor-pointer text-slate-400 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all">
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageSelect} disabled={isProcessing} />
                                    <LinkIcon className="w-5.5 h-5.5" />
                                </label>
                            </div>

                            <button
                                onClick={handleBrainDumpSubmit}
                                disabled={isProcessing || !input.trim()}
                                className={`h-11 px-6 rounded-2xl font-bold flex items-center gap-2.5 transition-all shadow-lg ${
                                    isProcessing || !input.trim()
                                        ? 'bg-slate-100 text-slate-300'
                                        : 'bg-slate-950 text-white hover:bg-slate-800 active:scale-95'
                                }`}
                            >
                                {isProcessing ? (
                                    <ArrowPathIcon className="w-4 h-4 animate-spin text-white" />
                                ) : (
                                    <>
                                        <span>Dump it</span>
                                        <PaperAirplaneIcon className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Image Preview Overlay */}
            {imagePreview && (
                <div className="fixed bottom-48 md:bottom-40 inset-x-0 z-40 flex justify-center">
                    <div className="relative animate-in slide-in-from-bottom-5">
                        <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 shadow-2xl">
                            <img src={imagePreview} alt="Preview" className="h-24 w-auto rounded-xl object-cover" />
                        </div>
                        <button
                            onClick={clearImage}
                            className="absolute -top-2.5 -right-2.5 bg-slate-950 text-white rounded-full p-1 border-2 border-white shadow-lg hover:scale-110 active:scale-90 transition-all"
                        >
                            <XMarkIcon className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
};
