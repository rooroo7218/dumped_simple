import React from 'react';
import { AuroraBackground } from './ui/aurora-background';

interface LoginScreenProps {
    signInWithGoogle: () => void;
    signInWithApple: () => void;
    handleBypassLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ signInWithGoogle, signInWithApple, handleBypassLogin }) => {
    // Removed isLocal restriction to allow public Tester Mode

    return (
        <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-white p-6">
            <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-0 text-center">
                {/* ── Brand Logo ── */}
                <div className="mb-0">
                    <img 
                        src="/phew-logo.svg" 
                        alt="Logo" 
                        className="w-32 h-32 object-contain"
                        style={{ imageRendering: '-webkit-optimize-contrast' as any }}
                    />
                </div>

                <div className="flex flex-col items-center gap-2">
                    <h1 className="text-[17px] font-bold tracking-tight text-slate-800">
                        phew.
                    </h1>
                </div>

                <div className="w-full space-y-3 mt-24">
                    {/* Google sign in */}
                    <button
                        onClick={signInWithGoogle}
                        className="w-full max-w-[280px] py-3.5 px-8 flex items-center justify-center gap-3 rounded-2xl border-2 border-slate-950 bg-white text-slate-950 text-[14px] font-bold shadow-sm hover:bg-slate-50 transition-all active:scale-[0.98] mx-auto"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        continue with google.
                    </button>

                    {/* Apple Sign In */}
                    <button
                        onClick={signInWithApple}
                        className="w-full max-w-[280px] py-3.5 px-8 flex items-center justify-center gap-3 rounded-2xl border-2 border-slate-950 bg-slate-950 text-white text-[14px] font-bold shadow-sm hover:bg-slate-900 transition-all active:scale-[0.98] mx-auto"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.05 20.28c-.96.95-2.21 1.72-3.72 1.72-1.46 0-2.31-.83-3.61-.83-1.32 0-2.31.81-3.61.81-1.4 0-2.88-1.02-3.89-2.38-2.12-2.85-2.12-7.29 0-10.13 1.06-1.42 2.6-2.31 4-2.31 1.32 0 2.21.72 3.51.72s2.21-.72 3.52-.72c1.23 0 2.5.64 3.4 1.55-2.73 1.52-2.28 5.75.5 7.15-.55 1.57-1.37 3.19-2.21 4.29l.11.13zm-3.56-15.65c0-1.81 1.48-3.41 3.25-3.63.19 2.13-1.39 3.99-3.25 3.63z" />
                        </svg>
                        continue with apple.
                    </button>

                    <button
                        onClick={handleBypassLogin}
                        className="w-full py-3 px-6 rounded-2xl text-slate-400 text-[11px] font-bold uppercase tracking-[0.2em] hover:text-slate-600 transition-all font-sans"
                    >
                        continue as guest.
                    </button>
                </div>

                {/* ── Footer ── */}
                <div className="mt-24 flex items-center justify-center gap-8 w-full border-t border-slate-100 pt-8">
                    <a href="/privacy.html" target="_blank" className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-colors">Privacy Policy</a>
                    <a href="/terms.html" target="_blank" className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-colors">Terms of Service</a>
                </div>
            </div>
        </div>
    );
};
