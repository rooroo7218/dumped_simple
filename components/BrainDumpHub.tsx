import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowPathIcon, Squares2X2Icon, MicrophoneIcon, PhotoIcon, StopIcon, PlusIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { extractImageText } from '../services/geminiService';

interface BrainDumpHubProps {
    input: string;
    setInput: (val: string | ((p: string) => string)) => void;
    isProcessing: boolean;
    handleBrainDumpSubmit: () => Promise<void>;
    onNavigateToGrid: () => void;
    startSpeechToText: (onResult: (text: string) => void) => void;
    isListening: boolean;
}

export const BrainDumpHub: React.FC<BrainDumpHubProps> = ({
    input,
    setInput,
    isProcessing,
    handleBrainDumpSubmit,
    onNavigateToGrid,
    startSpeechToText,
    isListening,
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [submitBottom, setSubmitBottom] = useState(84); // 16px base + ~68px nav bar height
    const [fadeOpacity, setFadeOpacity] = useState(1);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isManualOpen, setIsManualOpen] = useState(false);

    // Track keyboard height via visualViewport
    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;
        const update = () => {
            const keyboardHeight = window.innerHeight - vv.height - vv.offsetTop;
            // On mobile, if keyboard is UP, nav bar might be hidden or we might want different spacing.
            // But for safety, we push it up.
            const baseOffset = window.innerWidth < 768 ? 84 : 16;
            setSubmitBottom(Math.max(keyboardHeight, 0) + baseOffset);
        };
        vv.addEventListener('resize', update);
        vv.addEventListener('scroll', update);
        update();
        return () => {
            vv.removeEventListener('resize', update);
            vv.removeEventListener('scroll', update);
        };
    }, []);

    // Auto-focus on mount
    useEffect(() => {
        const t = setTimeout(() => textareaRef.current?.focus(), 100);
        return () => clearTimeout(t);
    }, []);

    // Auto-grow textarea
    const growTextarea = useCallback(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = `${ta.scrollHeight}px`;
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        growTextarea();
    };

    // Submit with fade-out/in
    const handleSubmit = async () => {
        if (!input.trim() || isProcessing) return;
        setFadeOpacity(0);
        await new Promise(r => setTimeout(r, 180));
        handleBrainDumpSubmit();
        setFadeOpacity(1);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        textareaRef.current?.focus();
    };

    // Mic — appends transcript to existing input
    const handleMic = () => {
        startSpeechToText((transcript) => {
            setInput(prev => prev ? `${prev}\n${transcript}` : transcript);
            setTimeout(growTextarea, 50);
        });
    };

    // Image upload → OCR → append to input
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = ''; // reset so same file can be re-selected

        setIsAnalyzing(true);
        try {
            const base64 = await fileToBase64(file);
            const extracted = await extractImageText(base64, file.type);
            if (extracted) {
                setInput(prev => prev ? `${prev}\n\n${extracted}` : extracted);
                setTimeout(growTextarea, 50);
                textareaRef.current?.focus();
            }
        } catch (err) {
            console.error('Image analysis failed:', err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const hasText = input.trim().length > 0;

    // Shared tool button style
    const toolBtn = (active = false): React.CSSProperties => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        background: active ? 'rgba(239,68,68,0.10)' : 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'background 0.2s',
        border: 'none',
    });

    return (
        <>
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,image/heic,image/heif,.pdf"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />

            {/* Full-screen fixed container */}
            <div
                onClick={() => textareaRef.current?.focus()}
                style={{ position: 'fixed', inset: 0, height: '100dvh', overflow: 'hidden' }}
            >
                {/* Grid icon — top right */}
                <button
                    onClick={(e) => { e.stopPropagation(); onNavigateToGrid(); }}
                    className="absolute right-4 z-30 flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-black/[0.05] hover:bg-black/[0.09] backdrop-blur-sm transition-all active:scale-95"
                    style={{ top: 'max(16px, env(safe-area-inset-top))' }}
                    aria-label="Open grid"
                >
                    <Squares2X2Icon className="w-4 h-4 text-slate-500" />
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#1a1a1a' }}>
                        My Grid
                    </span>
                </button>

                {/* Scrollable writing area */}
                <div style={{ height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleChange}
                        placeholder="Just keep going. Nothing is too small."
                        rows={1}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="sentences"
                        spellCheck={false}
                        enterKeyHint="done"
                        disabled={isProcessing}
                        style={{
                            opacity: fadeOpacity,
                            transition: 'opacity 0.18s ease',
                            width: '100%',
                            minHeight: '100dvh',
                            padding: 'calc(72px + env(safe-area-inset-top)) 28px calc(180px + env(safe-area-inset-bottom))',
                            border: 'none',
                            outline: 'none',
                            resize: 'none',
                            background: 'transparent',
                            fontSize: '17px',
                            lineHeight: '1.75',
                            color: '#1a1a1a',
                            caretColor: '#6366f1',
                            display: 'block',
                        }}
                    />
                </div>

                {/* Bottom action bar — horizontal pill tools */}
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="fixed z-40 transition-all duration-300 w-full left-0 right-0 px-4"
                    style={{
                        bottom: `calc(${submitBottom}px + env(safe-area-inset-bottom))`,
                    }}
                >
                    <div className="bg-white/85 backdrop-blur-xl border-2 border-black shadow-2xl rounded-full px-1.5 py-1 flex items-center justify-center gap-0.5 min-h-[42px] w-fit mx-auto overflow-hidden transition-all duration-300">
                        <AnimatePresence mode="wait">
                            {!hasText ? (
                                <motion.div
                                    key="tools"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="flex items-center"
                                >
                                    {/* Mic button */}
                                    <button
                                        onClick={handleMic}
                                        disabled={isProcessing}
                                        style={toolBtn(isListening)}
                                        aria-label={isListening ? 'Stop listening' : 'Start voice input'}
                                    >
                                        {isListening
                                            ? <StopIcon style={{ width: 19, height: 19, color: '#ef4444' }} />
                                            : <MicrophoneIcon style={{ width: 19, height: 19, color: '#94a3b8' }} />
                                        }
                                    </button>

                                    {/* Upload / scan button */}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isProcessing || isAnalyzing}
                                        style={toolBtn(isAnalyzing)}
                                        aria-label="Scan image or checklist"
                                    >
                                        {isAnalyzing
                                            ? <ArrowPathIcon style={{ width: 19, height: 19, color: '#94a3b8', animation: 'spin 1s linear infinite' }} />
                                            : <PhotoIcon style={{ width: 19, height: 19, color: '#94a3b8' }} />
                                        }
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.button
                                    key="submit"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    onClick={handleSubmit}
                                    disabled={isProcessing}
                                    className="flex-1 flex items-center justify-center px-6 py-2 rounded-full text-[13px] font-semibold text-slate-800 transition-all active:scale-95"
                                >
                                    {isProcessing
                                        ? <ArrowPathIcon style={{ width: 16, height: 16, color: '#94a3b8', animation: 'spin 1s linear infinite' }} />
                                        : 'put it all down'
                                    }
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Listening indicator */}
                {isListening && (
                    <div style={{
                        position: 'fixed',
                        top: 'max(70px, calc(env(safe-area-inset-top) + 54px))',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 16px',
                        borderRadius: 20,
                        background: 'rgba(239,68,68,0.08)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(239,68,68,0.15)',
                        zIndex: 50,
                    }}>
                        <span style={{
                            width: 7, height: 7, borderRadius: '50%', background: '#ef4444',
                            animation: 'pulse 1.2s ease-in-out infinite'
                        }} />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444' }}>
                            Listening…
                        </span>
                    </div>
                )}

                {/* Analyzing indicator */}
                {isAnalyzing && (
                    <div style={{
                        position: 'fixed',
                        top: 'max(70px, calc(env(safe-area-inset-top) + 54px))',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 16px',
                        borderRadius: 20,
                        background: 'rgba(99,102,241,0.08)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(99,102,241,0.15)',
                        zIndex: 50,
                    }}>
                        <ArrowPathIcon style={{ width: 13, height: 13, color: '#6366f1', animation: 'spin 1s linear infinite' }} />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#6366f1' }}>
                            Reading image…
                        </span>
                    </div>
                )}
            </div>

            <style>{`
                textarea::placeholder { color: rgba(0,0,0,0.4); }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(0.85); }
                }
            `}</style>
        </>
    );
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Strip the "data:image/png;base64," prefix
            resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
