import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowPathIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

interface BrainDumpHubProps {
    input: string;
    setInput: (val: string | ((p: string) => string)) => void;
    isProcessing: boolean;
    handleBrainDumpSubmit: () => Promise<void>;
    onNavigateToGrid: () => void;
    startSpeechToText: (onResult: (text: string) => void) => void;
    isListening: boolean;
    isGuest?: boolean;
    thinkingCopy?: string;
}


export const BrainDumpHub: React.FC<BrainDumpHubProps> = ({
    input,
    setInput,
    isProcessing,
    handleBrainDumpSubmit,
    onNavigateToGrid,
    startSpeechToText,
    isListening,
    isGuest = false,
    thinkingCopy,
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [submitBottom, setSubmitBottom] = useState(84); // 16px base + ~68px nav bar height
    const [fadeOpacity, setFadeOpacity] = useState(1);
    const [isFocused, setIsFocused] = useState(false);

    // Track keyboard height via visualViewport
    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;
        const update = () => {
            const keyboardHeight = window.innerHeight - vv.height - vv.offsetTop;
            const isKeyboardOpen = keyboardHeight > 50;
            const baseOffset = window.innerWidth < 768 ? 84 : 16;
            // On mobile, if the keyboard is open, the position:fixed element is already
            // pushed up by the visual viewport resizing. Manual height offsets cause
            // a double-push layout bug. We use a 16px bottom offset when the keyboard is open.
            setSubmitBottom(isKeyboardOpen ? 16 : baseOffset);
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

    // Auto-grow textarea with optimized reflow
    const growTextarea = useCallback(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        
        // Use requestAnimationFrame to avoid blocking the current execution frame
        // and prevent "Forced Reflow" violations during rapid typing.
        requestAnimationFrame(() => {
            if (!ta) return;
            // Only update if we actually need to change height
            const oldHeight = ta.style.height;
            ta.style.height = 'auto';
            const newHeight = `${ta.scrollHeight}px`;
            
            if (oldHeight !== newHeight) {
                ta.style.height = newHeight;
            } else {
                ta.style.height = oldHeight; // Restore if no change
            }
        });
    }, []);

    const micBaseText = useRef('');
    const isSpeechSupported = typeof window !== 'undefined' && (!!(window as any).webkitSpeechRecognition || !!(window as any).SpeechRecognition);

    const handleMicClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isListening) {
            micBaseText.current = input;
        }
        startSpeechToText((transcript) => {
            setInput(micBaseText.current + (micBaseText.current ? ' ' : '') + transcript);
            setTimeout(growTextarea, 50);
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInput(val);
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


    const hasText = input.trim().length > 0;

    return (
        <>

            {/* Full-screen fixed container */}
            <div
                onClick={() => textareaRef.current?.focus()}
                style={{ position: 'fixed', inset: 0, height: '100dvh', overflow: 'hidden', zIndex: 10 }}
            >
                {/* Notebook margin line */}


                {/* Scrollable writing area */}
                <div style={{ height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                    {/* Notebook Header */}
                    <div className="px-8 pt-[calc(env(safe-area-inset-top)+1.25rem)] md:pt-[calc(3.25rem+env(safe-area-inset-top))] pb-2 relative z-20 max-w-4xl mx-auto">
                        <div className="flex items-center gap-2 mb-1">
                            <SparklesIcon className="w-4 h-4 text-sky-400" />
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Dump</span>
                        </div>
                        <div className="mb-2">
                            <div className="text-xl font-medium tracking-tight text-slate-900">
                                What's on your mind?
                            </div>
                        </div>
                    </div>

                    <div style={{ position: 'relative', maxWidth: '56rem', margin: '0 auto', width: '100%' }}>
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={handleChange}
                            placeholder=""
                            rows={1}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="sentences"
                            spellCheck={false}
                            enterKeyHint="enter"
                            maxLength={2000}
                            disabled={isProcessing}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            style={{
                                opacity: fadeOpacity,
                                transition: 'opacity 0.18s ease',
                                width: '100%',
                                minHeight: '20dvh',
                                padding: `0.5rem 32px calc(${submitBottom}px + 100px)`,
                                border: 'none',
                                outline: 'none',
                                resize: 'none',
                                background: 'transparent',
                                fontSize: '17px',
                                lineHeight: '1.75',
                                color: '#1a1a1a',
                                caretColor: '#6366f1',
                                display: 'block',
                                position: 'relative',
                                zIndex: 2,
                            }}
                        />
                        {!input && !isFocused && (
                            <span
                                className="cursor-blink pointer-events-none absolute"
                                style={{ top: '0.5rem', left: '32px', fontSize: '17px', lineHeight: '1.75', color: '#6366f1', zIndex: 3 }}
                            >|</span>
                        )}
                    </div>

                    {input.length > 0 && (
                        <div 
                            className="fixed right-6 text-[11px] font-bold tracking-widest uppercase transition-all duration-300"
                            style={{ 
                                bottom: `calc(${submitBottom}px + 14px)`,
                                color: input.length > 1800 ? '#ef4444' : (input.length > 1500 ? '#f59e0b' : '#94a3b8'),
                                opacity: isProcessing ? 0 : 1,
                                zIndex: 30
                            }}
                        >
                            {input.length} / 2000
                        </div>
                    )}
                </div>
            </div>


            <AnimatePresence>
                {(hasText || isProcessing) && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="fixed z-40 transition-all duration-200 w-full left-0 right-0 px-4 pointer-events-none"
                        style={{
                            bottom: `calc(${submitBottom}px + env(safe-area-inset-bottom))`,
                        }}
                    >
                        <button
                            onClick={handleSubmit}
                            disabled={isProcessing}
                            className="bg-white/85 backdrop-blur-xl border border-black/70 shadow-lg rounded-full flex items-center justify-center min-h-[44px] px-8 py-2 text-[13px] font-semibold text-slate-800 transition-all active:scale-95 relative pointer-events-auto mx-auto w-fit"
                        >
                            {isProcessing
                                ? <ArrowPathIcon className="w-4 h-4 text-slate-400 animate-spin" />
                                : 'Dump it.'
                            }
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* Guest data-loss warning */}
            {isGuest && (
                <div style={{
                    position: 'fixed',
                    top: 'max(70px, calc(env(safe-area-inset-top) + 54px))',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 20,
                    background: 'rgba(245,158,11,0.10)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(245,158,11,0.25)',
                    zIndex: 50,
                    whiteSpace: 'nowrap',
                }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#b45309' }}>
                        just visiting
                    </span>
                </div>
            )}

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
                        ears open...
                    </span>
                </div>
            )}

            {/* Speech to Text Floating Button */}
            {isSpeechSupported && !isProcessing && (
                <div
                    className="fixed z-40 transition-all duration-300 pointer-events-auto"
                    style={{
                        bottom: `calc(${submitBottom}px + env(safe-area-inset-bottom) + 2px)`,
                        right: '24px',
                    }}
                >
                    <button
                        onClick={handleMicClick}
                        className={`w-11 h-11 rounded-full flex items-center justify-center border border-black/70 shadow-lg active:scale-95 transition-all duration-300 ${
                            isListening 
                                ? 'bg-red-500 text-white animate-pulse' 
                                : 'bg-white/90 backdrop-blur-md text-slate-800 hover:bg-slate-50'
                        }`}
                        title={isListening ? "Stop listening" : "Voice dictation"}
                    >
                        {isListening ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 0 3-3v-6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
                            </svg>
                        )}
                    </button>
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(0.85); }
                }
                @keyframes cursor-blink { 0%, 49% { opacity: 1; } 50%, 99% { opacity: 0; } }
                .cursor-blink { animation: cursor-blink 1s step-end infinite; }
            `}</style>
        </>
    );
};

