import React, { useState, useRef, useEffect } from 'react';
import {
    PlusIcon,
    UserIcon, PhotoIcon,
    ArrowsPointingOutIcon, ArrowsPointingInIcon,
    ArrowRightStartOnRectangleIcon,
    MusicalNoteIcon,
    Squares2X2Icon,
} from '@heroicons/react/24/outline';
import {
    PlayIcon, PauseIcon,
    SpeakerWaveIcon, SpeakerXMarkIcon,
    PlusIcon as PlusIconSolid,
    UserIcon as UserIconSolid,
    Squares2X2Icon as Squares2X2IconSolid,
} from '@heroicons/react/24/solid';

const CircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
    </svg>
);

import { UserProfile, UserPersona } from '../../types';
import { ZenPlayerState, TRACKS } from '../../hooks/useZenPlayer';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BackgroundScene {
    id: string;
    name: string;
    url?: string;
    preview?: string;
}

interface NavigationProps {
    activeTab: string;
    setActiveTab: (tab: any) => void;
    themeClasses: any;
    isZenMode: boolean;
    isCollapsed: boolean;
    setIsCollapsed: (val: boolean) => void;
    user: UserProfile;
    handleSignOut: () => void;
    persona: UserPersona;
    updateBrutalistBackground: (bg: string) => void;
    backgroundScenes: BackgroundScene[];
    player: ZenPlayerState;
    syncStatus?: 'idle' | 'saving' | 'saved' | 'local-only';
}

// ─── Nav tabs (no dev/hidden tabs) ───────────────────────────────────────────

const MAIN_TABS = [
    { id: 'dump',         icon: PlusIcon,            solidIcon: PlusIconSolid,            label: 'Dump',       mobileLabel: 'Dump' },
    { id: 'patterns',     icon: Squares2X2Icon,      solidIcon: Squares2X2IconSolid,      label: 'Tiles',      mobileLabel: 'Tiles' },
    { id: 'streak',       icon: CircleIcon,          solidIcon: CircleIcon,               label: 'Pattern',    mobileLabel: 'Pattern' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const Navigation: React.FC<NavigationProps> = ({
    activeTab, setActiveTab, themeClasses, isZenMode,
    isCollapsed, setIsCollapsed, user, handleSignOut, persona,
    updateBrutalistBackground, backgroundScenes, player,
    syncStatus = 'idle',
}) => {
    const [isSceneryOpen,       setIsSceneryOpen]       = useState(false);
    const [isUserMenuOpen,      setIsUserMenuOpen]      = useState(false);
    const [isMobileMenuOpen,    setIsMobileMenuOpen]    = useState(false);
    const [isFullscreen,        setIsFullscreen]        = useState(false);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const mobileButtonRef  = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isMobileMenuOpen) return;
        const handler = (e: MouseEvent): void => {
            if (mobileButtonRef.current?.contains(e.target as Node)) return;
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
                setIsMobileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isMobileMenuOpen]);
    const toggleFullScreen = (): void => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen()
                .then(() => setIsFullscreen(true))
                .catch(() => {});
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    React.useEffect(() => {
        const onFsChange = (): void => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    const closeAll = (): void => {
        setIsSceneryOpen(false);
        setIsUserMenuOpen(false);
    };

    // ── Shared styles ────────────────────────────────────────────────────────

    const ctrlBtn: string = 'p-1.5 rounded-xl transition-all active:scale-90 text-slate-500 hover:bg-white/50';

    const divider: string = 'h-5 w-[2px] shrink-0 mx-1 bg-white/30';

    const dropdown: string = 'absolute top-full mt-2 right-0 z-[200] shadow-2xl rounded-2xl bg-white border-2 border-slate-200';

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <>

            {/* ── DESKTOP: Single-row fixed header ── */}
            <div className={`hidden md:flex fixed top-0 left-0 right-0 z-40 items-center px-5 gap-2 transition-all duration-700 ease-in-out ${
                isZenMode ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
            } bg-white/90 backdrop-blur-md border-b-2 border-slate-950/70`} style={{ height: 'calc(3rem + env(safe-area-inset-top))', paddingTop: 'env(safe-area-inset-top)' }}>

                {/* Brand */}
                <span className="text-[15px] font-bold tracking-tight select-none shrink-0 text-slate-800 mr-1">
                    Dumped.
                </span>

                <div className={divider} />

                {/* Tabs */}
                <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar ml-2">
                    {MAIN_TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = isActive ? tab.solidIcon : tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all whitespace-nowrap text-[12px] font-medium tracking-tight ${
                                    isActive
                                        ? 'bg-[#1a1a1a] text-white shadow-lg'
                                        : 'text-slate-600 hover:bg-slate-100/50 hover:text-[#1a1a1a]'
                                }`}
                            >
                                <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Spacer */}
                <div className="flex-1" />

                {/* ── Sync status indicator ── */}
                {syncStatus === 'saving' && (
                    <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1 mr-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                        Saving…
                    </span>
                )}
                {syncStatus === 'saved' && (
                    <span className="text-[10px] font-medium text-emerald-500 flex items-center gap-1 mr-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Saved
                    </span>
                )}
                {syncStatus === 'local-only' && (
                    <span className="text-[10px] font-medium text-amber-500 flex items-center gap-1 mr-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Local only
                    </span>
                )}



                <div className={divider} />

                {/* ── Right controls ── */}
                <div className="flex items-center gap-1">

                    {/* Scenery */}
                    <div className="relative">
                        <button onClick={() => { setIsSceneryOpen(!isSceneryOpen); setIsUserMenuOpen(false); }} title="Scenery" className={ctrlBtn}>
                            <PhotoIcon className="w-4 h-4" />
                        </button>
                        {isSceneryOpen && (
                            <div className={`${dropdown} w-72 max-h-[400px] overflow-y-auto p-4`}>
                                <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 pb-2 border-b text-slate-600 border-slate-100">
                                    Select scenery
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    {backgroundScenes.map((scene) => (
                                        <button
                                            key={scene.id}
                                            onClick={() => { updateBrutalistBackground(scene.id); setIsSceneryOpen(false); }}
                                            className={`group relative aspect-video rounded-xl overflow-hidden hover:scale-[1.04] transition-all duration-200 ${
                                                persona.brutalistBackground === scene.id
                                                    ? 'ring-2 ring-slate-800 ring-offset-1'
                                                    : 'border-2 border-slate-100'
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
                    <button onClick={toggleFullScreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} className={ctrlBtn}>
                        {isFullscreen ? <ArrowsPointingInIcon className="w-4 h-4" /> : <ArrowsPointingOutIcon className="w-4 h-4" />}
                    </button>

                    <div className={divider} />

                    {/* User */}
                    <div className="relative">
                        <button
                            onClick={() => { setIsUserMenuOpen(!isUserMenuOpen); setIsSceneryOpen(false); }}
                            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl transition-all hover:bg-black/5 active:scale-95"
                        >
                            {user.picture ? (
                                <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full object-cover shrink-0 border-2 border-slate-200" />
                            ) : (
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 bg-slate-100 text-slate-600">
                                    {user.name?.charAt(0).toUpperCase() ?? 'U'}
                                </div>
                            )}
                            <span className="text-[12px] font-medium hidden sm:block text-slate-600">
                                {user.name?.split(' ')[0]}
                            </span>
                        </button>

                        {isUserMenuOpen && (
                            <div className={`${dropdown} min-w-[160px]`}>
                                <div className="px-4 py-2.5 border-b border-slate-50">
                                    <p className="text-[11px] font-semibold text-slate-700 truncate">{user.name}</p>
                                    <p className="text-[10px] text-slate-600 truncate">{user.email}</p>
                                </div>
                                <button
                                    onClick={() => { setIsUserMenuOpen(false); handleSignOut(); }}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px] font-medium text-rose-500 hover:bg-rose-50 transition-colors"
                                >
                                    <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
                                    Sign out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── MOBILE: Floating Bottom Bar ── */}
            <div className={`md:hidden fixed z-[90] transition-all duration-1000 ease-in-out w-fit mx-auto ${
                isZenMode ? 'translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
            }`} style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))', left: '1rem', right: '1rem' }}>
                <div className="bg-white/85 backdrop-blur-xl border border-black/70 shadow-2xl rounded-full px-3 py-[6px] flex items-center justify-between max-w-[320px] mx-auto">



                {/* Mobile Menu Popover */}
                {isMobileMenuOpen && (
                    <div ref={mobileMenuRef} className="absolute bottom-[calc(100%+16px)] right-0 mb-2 w-64 p-4 rounded-3xl bg-white/95 backdrop-blur-xl border border-black/70 shadow-2xl max-h-[75vh] flex flex-col gap-4 z-50 overflow-y-auto no-scrollbar">
                        
                        {/* 1. User Profile */}
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                {user.picture ? (
                                    <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full object-cover border-2 border-slate-200" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-slate-100 text-slate-600">
                                        {user.name?.charAt(0).toUpperCase() ?? 'U'}
                                    </div>
                                )}
                                <div className="flex flex-col flex-1 overflow-hidden">
                                    <span className="text-[13px] font-semibold text-slate-800 truncate">{user.name}</span>
                                    <span className="text-[11px] text-slate-500 truncate">{user.email}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => { setIsMobileMenuOpen(false); handleSignOut(); }}
                                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[12px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors active:scale-95"
                            >
                                <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                        
                        <div className="h-[2px] w-full bg-slate-100" />

                        {/* 2. Scenery */}
                        <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Background</span>
                            <div className="grid grid-cols-2 gap-2">
                                {backgroundScenes.map((scene) => (
                                    <button
                                        key={scene.id}
                                        onClick={() => { updateBrutalistBackground(scene.id); setIsMobileMenuOpen(false); }}
                                        className={`group relative aspect-video rounded-xl overflow-hidden hover:scale-[1.04] transition-all duration-200 ${
                                            persona.brutalistBackground === scene.id
                                                ? 'ring-2 ring-slate-800 ring-offset-1'
                                                : 'border-2 border-slate-100'
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

                        <div className="h-[2px] w-full bg-slate-100" />

                        {/* 3. Music */}
                        <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Music</span>
                            <div className="flex items-center gap-2 mb-1 pb-2 border-b border-slate-50">
                                <button onClick={player.togglePlay} className="p-1.5 rounded-full bg-slate-800 text-white active:scale-90 transition-all">
                                    {player.isPlaying ? <PauseIcon className="w-3.5 h-3.5" /> : <PlayIcon className="w-3.5 h-3.5 ml-px" />}
                                </button>
                                <span className="flex-1 text-[11px] font-semibold text-slate-600 truncate">
                                    {player.isPlaying ? player.currentTrack.title : 'Not playing'}
                                </span>
                                <button onClick={player.toggleMute} className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100 transition-all">
                                    {player.isMuted ? <SpeakerXMarkIcon className="w-3.5 h-3.5" /> : <SpeakerWaveIcon className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                                {TRACKS.map((track, idx) => (
                                    <button
                                        key={track.id}
                                        onClick={() => { player.selectTrack(idx); setIsMobileMenuOpen(false); }}
                                        className={`px-3 py-2 rounded-xl text-left transition-all ${
                                            idx === player.currentTrackIndex
                                                ? 'bg-slate-800 text-white'
                                                : 'text-slate-600 bg-slate-50 hover:bg-slate-100'
                                        }`}
                                    >
                                        <div className="text-[10px] font-semibold truncate">{track.title}</div>
                                        <div className="text-[8px] opacity-60 mt-0.5">{track.genre}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>
                )}

                {/* Single-row: tabs + music button */}
                <nav className="flex items-center justify-between w-full">
                    {MAIN_TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = isActive ? tab.solidIcon : tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center justify-center transition-all active:scale-90 rounded-full h-[40px] ${isActive ? 'bg-slate-900 w-[64px] shadow-sm' : 'w-[40px]'}`}
                            >
                                <Icon className={`w-[22px] h-[22px] transition-colors ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-600'}`} />
                            </button>
                        );
                    })}

                    {/* Divider */}
                    <div className="w-[2px] h-6 bg-slate-200/80 shrink-0 mx-1" />

                    {/* Menu button */}
                    <button
                        ref={mobileButtonRef}
                        onClick={() => setIsMobileMenuOpen(p => !p)}
                        className="flex items-center justify-center p-2 transition-all active:scale-90"
                    >
                        {player.isPlaying ? (
                            <div className="flex gap-[1.5px] items-end h-[22px] w-[22px] justify-center">
                                <div className="w-[3px] bg-slate-900 rounded-sm animate-music-bar-1" />
                                <div className="w-[3px] bg-slate-900 rounded-sm animate-music-bar-2" />
                                <div className="w-[3px] bg-slate-900 rounded-sm animate-music-bar-3" />
                            </div>
                        ) : (
                            <UserIcon className="w-[22px] h-[22px] text-slate-500" />
                        )}
                    </button>
                </nav>
                </div>
            </div>

            <style>{`
                @keyframes music-bar-1 { 0%, 100% { height: 4px; } 50% { height: 14px; } }
                @keyframes music-bar-2 { 0%, 100% { height: 10px; } 50% { height: 5px; } }
                @keyframes music-bar-3 { 0%, 100% { height: 7px; } 50% { height: 14px; } }
                .animate-music-bar-1 { animation: music-bar-1 0.8s ease-in-out infinite; }
                .animate-music-bar-2 { animation: music-bar-2 0.7s ease-in-out infinite; }
                .animate-music-bar-3 { animation: music-bar-3 0.9s ease-in-out infinite; }
            `}</style>
        </>
    );
};
