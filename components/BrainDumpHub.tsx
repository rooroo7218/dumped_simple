import React, { useState } from 'react';
import {
    XMarkIcon,
    MicrophoneIcon,
    LinkIcon,
    PaperAirplaneIcon,
    ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { UserPersona } from '../types';

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
}) => {
    return (
        <div className="flex flex-col h-full max-w-[1400px] mx-auto pt-6">
            <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
                <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
                    {/* Header */}
                    <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight mb-4">
                            What's on your mind?
                        </h1>
                        <p className="text-slate-500 text-lg md:text-xl font-medium max-w-lg mx-auto leading-relaxed">
                            Dump your thoughts, worries, or todos. We'll handle the rest.
                        </p>
                    </div>

                    {/* Input Area */}
                    <div className="w-full max-w-3xl relative animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                        <div className="bg-white/70 backdrop-blur-2xl rounded-[40px] border-2 border-slate-950 p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all hover:shadow-[0_20px_60px_rgba(0,0,0,0.15)] group">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Start typing here..."
                                className="w-full h-40 md:h-56 bg-transparent border-none focus:ring-0 text-xl md:text-2xl text-slate-800 placeholder:text-slate-300 resize-none font-medium leading-relaxed"
                            />
                            
                            <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-100">
                                <div className="flex items-center gap-2">
                                    <label className="p-3 rounded-2xl hover:bg-slate-100 transition-all cursor-pointer text-slate-400 hover:text-slate-900 active:scale-95 group/btn">
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageSelect} />
                                        <LinkIcon className="w-6 h-6" />
                                    </label>
                                    <button
                                        onClick={() => startSpeechToText((res) => setInput(p => p + ' ' + res))}
                                        className={`p-3 rounded-2xl transition-all active:scale-95 flex items-center gap-2 ${
                                            isListening ? 'bg-rose-500 text-white shadow-lg' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'
                                        }`}
                                    >
                                        <MicrophoneIcon className="w-6 h-6" />
                                        {isListening && <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse">Listening...</span>}
                                    </button>
                                </div>

                                <button
                                    onClick={handleBrainDumpSubmit}
                                    disabled={isProcessing || !input.trim()}
                                    className={`px-8 py-4 rounded-[28px] font-bold text-lg transition-all flex items-center gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.1)] ${
                                        isProcessing || !input.trim()
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            : 'bg-slate-950 text-white hover:scale-[1.02] hover:shadow-[0_15px_40px_rgba(0,0,0,0.2)] active:scale-95'
                                    }`}
                                >
                                    {isProcessing ? (
                                        <>
                                            <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Commit to Memory</span>
                                            <PaperAirplaneIcon className="w-5 h-5 -rotate-45 mb-1" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {imagePreview && (
                            <div className="mt-6 animate-in zoom-in-95 duration-300 p-2 bg-white/50 backdrop-blur-md rounded-3xl border-2 border-slate-950 inline-block relative border">
                                <img src={imagePreview} alt="Preview" className="h-32 w-auto rounded-2xl border border-slate-100 object-cover" />
                                <button
                                    onClick={clearImage}
                                    className="absolute -top-3 -right-3 p-1.5 bg-slate-950 text-white rounded-full shadow-lg border-2 border-white hover:scale-110 active:scale-90 transition-all"
                                >
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
