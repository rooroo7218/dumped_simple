import React, { useState, useRef, useEffect } from 'react';
import {
    PlusIcon,
    UserIcon, PhotoIcon,
    ArrowsPointingOutIcon, ArrowsPointingInIcon,
    ArrowRightStartOnRectangleIcon,
    MusicalNoteIcon,
    Squares2X2Icon,
    FireIcon,
} from '@heroicons/react/24/outline';
import {
    PlayIcon, PauseIcon,
    SpeakerWaveIcon, SpeakerXMarkIcon,
    PlusIcon as PlusIconSolid,
    UserIcon as UserIconSolid,
    Squares2X2Icon as Squares2X2IconSolid,
    FireIcon as FireIconSolid,
} from '@heroicons/react/24/solid';

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
    { id: 'patterns',     icon: Squares2X2Icon,      solidIcon: Squares2X2IconSolid,      label: 'Patterns',   mobileLabel: 'Patterns' },
    { id: 'streak',       icon: FireIcon,             solidIcon: FireIconSolid,             label: 'Streak',     mobileLabel: 'Streak' },
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
    const [isMusicSelectorOpen, setIsMusicSelectorOpen] = useState(false);
    const [isFullscreen,        setIsFullscreen]        = useState(false);
    const musicPopoverRef = useRef<HTMLDivElement>(null);
    const musicButtonRef  = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isMusicSelectorOpen) return;
        const handler = (e: MouseEvent): void => {
            if (musicButtonRef.current?.contains(e.target as Node)) return;
            if (musicPopoverRef.current && !musicPopoverRef.current.contains(e.target as Node)) {
                setIsMusicSelectorOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isMusicSelectorOpen]);
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

    const divider: string = 'h-5 w-px shrink-0 mx-1 bg-white/30';

    const dropdown: string = 'absolute top-full mt-2 right-0 z-[200] shadow-2xl rounded-2xl bg-white border border-slate-200';

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <>

            {/* ── DESKTOP: Single-row fixed header ── */}
            <div className={`hidden md:flex fixed top-0 left-0 right-0 z-40 items-center h-12 px-5 gap-2 transition-all duration-700 ease-in-out ${
                isZenMode ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
            } bg-white/35 backdrop-blur-xl border-b border-white/30`}>

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
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all whitespace-nowrap text-[12px] font-semibold tracking-tight ${
                                    isActive
                                        ? themeClasses.navActive
                                        : 'text-slate-600 hover:bg-slate-100/50 hover:text-slate-900'
                                }`}
                            >
                                <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-500'}`} />
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
                                            <div className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-[8px] py-1 px-1.5 font-medium opacity-0 group-hover:opacity-100 transition-opacity truncate">
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
                                <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200" />
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

            {/* ── MOBILE: Fixed Bottom Bar (hidden on dump tab) ── */}
            <div className={`md:hidden fixed bottom-0 left-0 right-0 z-50 px-2 pb-5 pt-1 backdrop-blur-xl border-t transition-all duration-1000 ease-in-out ${
                isZenMode || activeTab === 'dump' ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
            } bg-white/75 border-white/40`}>



                {/* Track selector popover */}
                {isMusicSelectorOpen && (
                    <div ref={musicPopoverRef} className="absolute bottom-full right-3 mb-2 w-56 p-3 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl">
                            {/* Controls */}
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                                <button onClick={player.togglePlay} className="p-1.5 rounded-full bg-slate-800 text-white active:scale-90 transition-all">
                                    {player.isPlaying ? <PauseIcon className="w-3.5 h-3.5" /> : <PlayIcon className="w-3.5 h-3.5 ml-px" />}
                                </button>
                                <span className="flex-1 text-[10px] font-semibold text-slate-600 truncate">
                                    {player.isPlaying ? player.currentTrack.title : 'Not playing'}
                                </span>
                                <button onClick={player.toggleMute} className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100 transition-all">
                                    {player.isMuted ? <SpeakerXMarkIcon className="w-3.5 h-3.5" /> : <SpeakerWaveIcon className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                            {/* Track list */}
                            <div className="grid grid-cols-2 gap-1">
                                {TRACKS.map((track, idx) => (
                                    <button
                                        key={track.id}
                                        onClick={() => { player.selectTrack(idx); setIsMusicSelectorOpen(false); }}
                                        className={`px-2.5 py-1.5 rounded-xl text-left transition-all ${
                                            idx === player.currentTrackIndex
                                                ? 'bg-slate-800 text-white'
                                                : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        <div className="text-[9px] font-semibold truncate">{track.title}</div>
                                        <div className="text-[7px] opacity-50">{track.genre}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                )}

                {/* Single-row: tabs + music button */}
                <nav className="flex items-center justify-around">
                    {MAIN_TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = isActive ? tab.solidIcon : tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className="flex flex-col items-center gap-1 py-1 flex-1 transition-all active:scale-90"
                            >
                                <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-slate-900' : 'text-slate-500'}`} />
                                <span className={`text-[10px] font-semibold tracking-tight transition-colors ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                                    {tab.mobileLabel}
                                </span>
                            </button>
                        );
                    })}

                    {/* Divider */}
                    <div className="w-px h-6 bg-slate-200/80 shrink-0" />

                    {/* Music button — same structure as tab buttons */}
                    <button
                        ref={musicButtonRef}
                        onClick={() => setIsMusicSelectorOpen(p => !p)}
                        className="flex flex-col items-center gap-1 py-1 flex-1 transition-all active:scale-90"
                    >
                        {player.isPlaying ? (
                            <div className="flex gap-px items-end h-5 w-5 justify-center">
                                <div className="w-[3px] bg-slate-900 rounded-sm animate-music-bar-1" />
                                <div className="w-[3px] bg-slate-900 rounded-sm animate-music-bar-2" />
                                <div className="w-[3px] bg-slate-900 rounded-sm animate-music-bar-3" />
                            </div>
                        ) : (
                            <MusicalNoteIcon className="w-5 h-5 text-slate-500" />
                        )}
                        <span className={`text-[10px] font-semibold tracking-tight ${player.isPlaying ? 'text-slate-900' : 'text-slate-500'}`}>
                            Music
                        </span>
                    </button>
                </nav>
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
