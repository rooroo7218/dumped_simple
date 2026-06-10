import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
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
    
    // Formatting for notebook aesthetic
    const [dateTime] = useState(() => {
        const now = new Date();
        return {
            date: now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        };
    });

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
                    <div className="px-8 pt-12 pb-2 relative z-20 max-w-4xl mx-auto">
                        <div className="flex justify-between items-baseline mb-2">
                            <div className="text-[11px] font-bold tracking-tight text-slate-400 uppercase">
                                {dateTime.date}
                            </div>
                            <div className="text-[11px] font-bold tracking-tight text-slate-400 uppercase">
                                {dateTime.time}
                            </div>
                        </div>
                        <div className="h-[1px] w-full bg-slate-900/5" />
                    </div>

                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleChange}
                        placeholder="phew... let it all out."
                        rows={1}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="sentences"
                        spellCheck={false}
                        enterKeyHint="enter"
                        maxLength={2000}
                        disabled={isProcessing}
                        style={{
                            opacity: fadeOpacity,
                            transition: 'opacity 0.18s ease',
                            width: '100%',
                            maxWidth: '56rem', // max-w-4xl equivalent
                            margin: '0 auto',
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

            {/* Processing Banner — UI consistent with TilesHub */}
            <AnimatePresence>
                {isProcessing && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="fixed top-8 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-md z-[60]"
                    >
                        <div className="bg-white/70 backdrop-blur-2xl border border-white/40 rounded-[22px] px-6 py-4 flex items-center gap-4 shadow-xl shadow-indigo-500/5 overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent animate-pulse" />
                            <div className="relative flex items-center justify-center shrink-0">
                                <ArrowPathIcon className="w-5 h-5 text-indigo-500 animate-[spin_2s_linear_infinite]" />
                                <div className="absolute inset-0 w-5 h-5 bg-indigo-500/20 blur-xl animate-pulse" />
                            </div>
                            
                            <div className="flex flex-col gap-0.5 relative">
                                <span className="text-[14px] font-bold text-slate-900 tracking-tight leading-none min-h-[1.2em]">
                                    {thinkingCopy || 'Processing...'}
                                </span>
                                <span className="text-[10px] font-medium text-slate-400 tracking-wide uppercase">AI is carefully arranging your items</span>
                            </div>

                            <div className="ml-auto flex items-center gap-1 relative">
                                {[0, 1, 2].map(i => (
                                    <div 
                                        key={i} 
                                        className="w-1.5 h-1.5 rounded-full bg-indigo-500/30"
                                        style={{ animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite` }}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                        <div className="bg-white/85 backdrop-blur-xl border-2 border-black shadow-2xl rounded-full flex items-center justify-center min-h-[44px] w-fit mx-auto overflow-hidden pointer-events-auto relative">
                            <button
                                onClick={handleSubmit}
                                disabled={isProcessing}
                                className="flex-1 flex items-center justify-start pl-6 pr-16 py-2 rounded-full text-[13px] font-semibold text-slate-800 transition-all active:scale-95 relative"
                            >
                                {!isProcessing && (
                                    <img 
                                        src="/phew-logo.svg" 
                                        alt="" 
                                        className="absolute right-[-4px] w-12 h-12 flex-shrink-0"
                                        style={{ 
                                            imageRendering: '-webkit-optimize-contrast' as any,
                                            top: '50%',
                                            transform: 'translateY(-50%) translate3d(0, 0, 0)',
                                            filter: 'brightness(1.02) contrast(1.1) drop-shadow(0 0 0.2px rgba(0,0,0,0.5))'
                                        }}
                                    />
                                )}
                                {isProcessing
                                    ? <ArrowPathIcon className="w-4 h-4 text-slate-400 animate-spin" />
                                    : 'put it all down'
                                }
                            </button>
                        </div>
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
                        Guest mode — data is stored locally only
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
                        Listening…
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
                        className={`w-11 h-11 rounded-full flex items-center justify-center border-2 border-slate-950 shadow-lg active:scale-95 transition-all duration-300 ${
                            isListening 
                                ? 'bg-red-500 border-red-600 text-white animate-pulse' 
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

