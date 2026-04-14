import React, { useState, useEffect, useRef } from 'react';
import {
    MusicalNoteIcon,
    SpeakerWaveIcon,
    SpeakerXMarkIcon,
    PlayIcon,
    PauseIcon
} from '@heroicons/react/24/solid';
import { TRACKS, ZenPlayerState } from '../hooks/useZenPlayer';

interface ZenPlayerProps {
    player: ZenPlayerState;
}

export const ZenPlayer: React.FC<ZenPlayerProps> = ({ player }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const { isPlaying, isMuted, currentTrackIndex, currentTrack, togglePlay, toggleMute, selectTrack } = player;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsExpanded(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <>
            {/* Audio — always rendered regardless of screen size */}
            <div className="hidden">
                {isPlaying && (
                    <iframe
                        width="0"
                        height="0"
                        src={`https://www.youtube.com/embed/${currentTrack.id}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0`}
                        title="Zen Player"
                        allow="autoplay"
                    />
                )}
            </div>

            {/* Desktop UI — hidden on mobile */}
            <div
                ref={containerRef}
                className="hidden md:flex fixed bottom-6 left-6 z-[250] flex-col items-start gap-3"
            >
                {/* Selector Popover */}
                {isExpanded && (
                    <div className="w-64 mb-2 p-4 animate-in slide-in-from-bottom-4 fade-in duration-300 bg-white/70 backdrop-blur-md border-2 border-white/20 rounded-[28px] shadow-2xl">
                        <h4 className="text-[11px] font-medium uppercase tracking-wider mb-4 opacity-50 text-[#1a1a1a]">Select Your Vibe</h4>
                        <div className="space-y-2">
                            {TRACKS.map((track, idx) => (
                                <button
                                    key={track.id}
                                    onClick={() => { selectTrack(idx); setIsExpanded(false); }}
                                    className={`w-full flex items-center justify-between p-3 transition-all group rounded-2xl ${currentTrackIndex === idx ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                >
                                    <div className="text-left">
                                        <div className="text-[10px] font-medium uppercase tracking-tight">{track.title}</div>
                                        <div className={`text-[8px] font-medium uppercase opacity-50 ${currentTrackIndex === idx ? 'opacity-70' : ''}`}>{track.genre}</div>
                                    </div>
                                    {currentTrackIndex === idx && isPlaying && (
                                        <div className="flex gap-0.5 items-end h-3">
                                            <div className="w-0.5 bg-current animate-music-bar-1" />
                                            <div className="w-0.5 bg-current animate-music-bar-2" />
                                            <div className="w-0.5 bg-current animate-music-bar-3" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main Controller Bubble */}
                <div className={`flex items-center gap-2 p-2 transition-all ${isExpanded ? 'scale-105' : 'hover:scale-105'} bg-white/70 backdrop-blur-md border-2 border-white/20 rounded-full shadow-xl`}>
                    {isPlaying && (
                        <div className="px-3 py-1 flex flex-col overflow-hidden max-w-[120px]">
                            <span className="text-[8px] font-medium uppercase truncate text-[#1a1a1a]">{currentTrack.title}</span>
                            <span className="text-[6px] font-medium uppercase opacity-40 whitespace-nowrap text-[#1a1a1a]">Now Playing</span>
                        </div>
                    )}

                    <div className="flex items-center gap-1">
                        <button onClick={togglePlay} className="p-2.5 rounded-full transition-all active:scale-90 bg-slate-950 text-white hover:bg-slate-700">
                            {isPlaying ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4 ml-0.5" />}
                        </button>
                        <button onClick={toggleMute} className="p-2 rounded-full transition-all text-slate-400 hover:text-black hover:bg-slate-50">
                            {isMuted ? <SpeakerXMarkIcon className="w-4 h-4" /> : <SpeakerWaveIcon className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 rounded-full transition-all text-slate-400 hover:text-black hover:bg-slate-50">
                            <MusicalNoteIcon className={`w-4 h-4 ${isPlaying && !isMuted ? 'opacity-100' : 'opacity-60'}`} />
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes music-bar-1 { 0%, 100% { height: 4px; } 50% { height: 12px; } }
                @keyframes music-bar-2 { 0%, 100% { height: 8px; } 50% { height: 4px; } }
                @keyframes music-bar-3 { 0%, 100% { height: 6px; } 50% { height: 10px; } }
                .animate-music-bar-1 { animation: music-bar-1 0.8s ease-in-out infinite; }
                .animate-music-bar-2 { animation: music-bar-2 0.7s ease-in-out infinite; }
                .animate-music-bar-3 { animation: music-bar-3 0.9s ease-in-out infinite; }
            `}</style>
        </>
    );
};
