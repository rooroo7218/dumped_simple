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
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [submitBottom, setSubmitBottom] = useState(84); // 16px base + ~68px nav bar height
    const [fadeOpacity, setFadeOpacity] = useState(1);
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


    const hasText = input.trim().length > 0;

    return (
        <>

            {/* Full-screen fixed container */}
            <div
                onClick={() => textareaRef.current?.focus()}
                style={{ position: 'fixed', inset: 0, height: '100dvh', overflow: 'hidden', zIndex: 10 }}
            >
                {/* Scrollable writing area */}
                <div style={{ height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
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
                        enterKeyHint="done"
                        maxLength={2000}
                        disabled={isProcessing}
                        style={{
                            opacity: fadeOpacity,
                            transition: 'opacity 0.18s ease',
                            width: '100%',
                            minHeight: '20dvh',
                            padding: `calc(3rem + env(safe-area-inset-top)) 20px calc(${submitBottom}px + 100px)`,
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

