import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowPathIcon, Squares2X2Icon, MicrophoneIcon, PhotoIcon, StopIcon } from '@heroicons/react/24/outline';
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
    const [submitBottom, setSubmitBottom] = useState(16);
    const [fadeOpacity, setFadeOpacity] = useState(1);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Track keyboard height via visualViewport
    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;
        const update = () => {
            const keyboardHeight = window.innerHeight - vv.height - vv.offsetTop;
            setSubmitBottom(Math.max(keyboardHeight, 0) + 16);
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
        width: 48,
        height: 48,
        borderRadius: 24,
        background: active ? 'rgba(239,68,68,0.12)' : 'rgba(0,0,0,0.055)',
        backdropFilter: 'blur(12px)',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'background 0.2s',
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
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
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
                            padding: '72px 28px 180px',
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

                {/* Bottom action bar — mic + upload + submit */}
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'fixed',
                        left: '20px',
                        right: '20px',
                        bottom: `calc(${submitBottom}px + env(safe-area-inset-bottom))`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        zIndex: 40,
                    }}
                >
                    {/* Mic button */}
                    <button
                        onClick={handleMic}
                        disabled={isProcessing}
                        style={toolBtn(isListening)}
                        aria-label={isListening ? 'Stop listening' : 'Start voice input'}
                    >
                        {isListening
                            ? <StopIcon style={{ width: 18, height: 18, color: '#ef4444' }} />
                            : <MicrophoneIcon style={{ width: 18, height: 18, color: '#94a3b8' }} />
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
                            ? <ArrowPathIcon style={{ width: 18, height: 18, color: '#94a3b8', animation: 'spin 1s linear infinite' }} />
                            : <PhotoIcon style={{ width: 18, height: 18, color: '#94a3b8' }} />
                        }
                    </button>

                    {/* Submit button — grows to fill remaining space, hides when empty */}
                    <button
                        onClick={handleSubmit}
                        disabled={isProcessing || !hasText}
                        style={{
                            flex: 1,
                            height: 48,
                            borderRadius: 24,
                            background: 'rgba(0,0,0,0.055)',
                            backdropFilter: 'blur(12px)',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: hasText ? 1 : 0,
                            pointerEvents: hasText ? 'auto' : 'none',
                            transition: 'opacity 0.25s ease',
                        }}
                    >
                        {isProcessing
                            ? <ArrowPathIcon style={{ width: 16, height: 16, color: '#94a3b8', animation: 'spin 1s linear infinite' }} />
                            : <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', letterSpacing: '0.02em' }}>
                                put it all down
                            </span>
                        }
                    </button>
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
                textarea::placeholder { color: rgba(0,0,0,0.2); }
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
