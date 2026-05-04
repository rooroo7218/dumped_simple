import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckIcon } from '@heroicons/react/24/outline';

export const CookieNotice: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const accepted = localStorage.getItem('dumped_cookies_accepted');
        if (!accepted) {
            const timer = setTimeout(() => setIsVisible(true), 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('dumped_cookies_accepted', 'true');
        setIsVisible(false);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:max-w-sm z-[100] pointer-events-none"
                >
                    <div className="bg-white/80 backdrop-blur-2xl border border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-3xl p-6 pointer-events-auto relative overflow-hidden">
                        {/* Decorative background glow */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 blur-[80px]" />
                        
                        <div className="relative">
                            <h3 className="text-[15px] font-bold text-slate-900 tracking-tight mb-2 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                This head uses cookies
                            </h3>
                            <p className="text-[13px] leading-[1.6] text-slate-500 font-medium mb-5">
                                We use them to keep you signed in and remember your preferences. No weird stuff, just the essentials for a smooth experience.
                            </p>
                            
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleAccept}
                                    className="flex-1 bg-slate-950 text-white text-[12px] font-bold py-3 px-6 rounded-2xl hover:bg-indigo-600 active:scale-95 transition-all shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2"
                                >
                                    <CheckIcon className="w-4 h-4" />
                                    Sounds good
                                </button>
                                <a 
                                    href="/privacy.html" 
                                    target="_blank" 
                                    className="text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors px-2"
                                >
                                    Privacy
                                </a>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
