import React, { useState } from 'react';
import { UserPersona, UserProfile } from '../../types';
import { BACKGROUND_SCENES } from '../AuthenticatedApp';
import { PhotoIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon, ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline';

interface HeaderProps {
    themeClasses: any;
    user: UserProfile;
    handleSignOut: () => void;
    isMenuOpen: boolean;
    setIsMenuOpen: (val: boolean) => void;
    persona: UserPersona;
    updateBrutalistBackground: (bg: string) => void;
    isZenMode: boolean;
}

export const Header: React.FC<HeaderProps> = ({
    themeClasses,
    user,
    handleSignOut,
    isMenuOpen,
    setIsMenuOpen,
    persona,
    updateBrutalistBackground,
    isZenMode,
}) => {
    const [isSceneryOpen, setIsSceneryOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                setIsFullscreen(true);
            }).catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    React.useEffect(() => {
        const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    return (
        <header className={`sticky top-0 z-50 transition-all duration-1000 ease-in-out ${isZenMode ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'} px-4 md:px-10 py-3 ${themeClasses.header} backdrop-blur-3xl flex items-center justify-between`}>

            {/* ── Wordmark ── */}
            <h1 className="text-[17px] font-bold tracking-tight text-slate-800">
                Dumped.
            </h1>

            {/* ── Right controls ── */}
            <div className="flex items-center gap-2">

                {/* Scenery picker */}
                <div className="relative">
                    <button
                        onClick={() => setIsSceneryOpen(!isSceneryOpen)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all hover:scale-[1.02] active:scale-95 bg-white/40 backdrop-blur-md border border-white/40 text-slate-600 shadow-sm hover:bg-white/60"
                    >
                        <PhotoIcon className="w-3.5 h-3.5" />
                        Scenery
                    </button>

                    {isSceneryOpen && (
                        <div className="absolute top-full right-0 mt-3 w-72 max-h-[400px] overflow-y-auto p-4 z-[100] shadow-2xl rounded-2xl bg-white/70 border border-white/40 backdrop-blur-2xl">
                            <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 pb-2 border-b text-slate-500 border-slate-100">
                                Select scenery
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {BACKGROUND_SCENES.map((scene) => (
                                    <button
                                        key={scene.id}
                                        onClick={() => {
                                            updateBrutalistBackground(scene.id);
                                            setIsSceneryOpen(false);
                                        }}
                                        className={`group relative aspect-video rounded-xl overflow-hidden hover:scale-[1.04] transition-all duration-200 ${
                                            persona.brutalistBackground === scene.id
                                                ? 'ring-2 ring-slate-800 ring-offset-1'
                                                : 'border border-slate-100'
                                        }`}
                                    >
                                        {scene.url ? (
                                            <img src={scene.url} alt={scene.name} className="w-full h-full object-cover" />
                                        ) : scene.preview ? (
                                            <div className="w-full h-full" style={{ background: scene.preview }} />
                                        ) : (
                                            <div className="w-full h-full bg-slate-50 flex items-center justify-center text-[8px] font-medium text-slate-500">Default</div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 bg-slate-950/70 text-white text-[8px] py-1 px-1.5 font-medium opacity-0 group-hover:opacity-100 transition-opacity truncate">
                                            {scene.name}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Fullscreen */}
                <button
                    onClick={toggleFullScreen}
                    title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    className="p-1.5 rounded-xl transition-all active:scale-95 bg-white/40 backdrop-blur-md border border-white/40 text-slate-500 shadow-sm hover:bg-white/60"
                >
                    {isFullscreen
                        ? <ArrowsPointingInIcon className="w-4 h-4" />
                        : <ArrowsPointingOutIcon className="w-4 h-4" />
                    }
                </button>

                {/* Avatar + logout */}
                <div className="relative">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full transition-all hover:bg-black/5 active:scale-95"
                    >
                        {user.picture ? (
                            <img
                                src={user.picture}
                                alt={user.name}
                                className="w-7 h-7 rounded-full object-cover border border-slate-200"
                            />
                        ) : (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold bg-slate-100 text-slate-600">
                                {user.name?.charAt(0).toUpperCase() ?? 'U'}
                            </div>
                        )}
                        <span className="text-[12px] font-medium hidden sm:block text-slate-600">
                            {user.name?.split(' ')[0]}
                        </span>
                    </button>

                    {isMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 z-[100] min-w-[140px] rounded-2xl shadow-xl overflow-hidden bg-white border border-slate-100">
                            <div className="px-4 py-2.5 border-b border-slate-50">
                                <p className="text-[11px] font-semibold text-slate-700 truncate">{user.name}</p>
                                <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                            </div>
                            <button
                                onClick={() => { setIsMenuOpen(false); handleSignOut(); }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px] font-medium text-rose-500 hover:bg-rose-50 transition-colors"
                            >
                                <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
                                Sign out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
