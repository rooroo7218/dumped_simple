import { useState, useRef, useEffect } from 'react';

export const TRACKS = [
    { id: 'groovesalad',  title: 'Groove Salad',    genre: 'Ambient · Downtempo',   streamUrl: 'https://ice1.somafm.com/groovesalad-256-mp3' },
    { id: 'dronezone',    title: 'Drone Zone',       genre: 'Deep Ambient',           streamUrl: 'https://ice1.somafm.com/dronezone-256-mp3' },
    { id: 'spacestation', title: 'Space Station',    genre: 'Space Ambient',          streamUrl: 'https://ice2.somafm.com/spacestation-128-mp3' },
    { id: 'illstreet',    title: 'Cocktail Lounge',  genre: 'Lounge · Jazz',          streamUrl: 'https://ice1.somafm.com/illstreet-128-mp3' },
    { id: 'cliqhop',      title: 'Cliq Hop',         genre: 'Beats · Electronic',     streamUrl: 'https://ice2.somafm.com/cliqhop-256-mp3' },
    { id: 'bootliquor',   title: 'Boot Liquor',      genre: 'Americana · Roots',      streamUrl: 'https://ice1.somafm.com/bootliquor-256-mp3' },
    { id: 'secretagent',  title: 'Secret Agent',     genre: 'Jazz · Cinematic',       streamUrl: 'https://ice4.somafm.com/secretagent-128-mp3' },
    { id: 'lush',         title: 'Lush',             genre: 'Chillout · Grooves',     streamUrl: 'https://ice1.somafm.com/lush-128-mp3' },
];

export interface ZenPlayerState {
    isPlaying: boolean;
    isMuted: boolean;
    currentTrackIndex: number;
    currentTrack: typeof TRACKS[0];
    togglePlay: () => void;
    toggleMute: () => void;
    selectTrack: (idx: number) => void;
}

export function useZenPlayer(): ZenPlayerState {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioRef.current = new Audio();
        audioRef.current.preload = 'none';
        return () => {
            audioRef.current?.pause();
            audioRef.current = null;
        };
    }, []);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isPlaying) {
            audio.src = TRACKS[currentTrackIndex].streamUrl;
            audio.muted = isMuted;
            audio.play().catch(() => setIsPlaying(false));
        } else {
            audio.pause();
            audio.src = '';
        }
    }, [isPlaying, currentTrackIndex]);

    useEffect(() => {
        if (audioRef.current) audioRef.current.muted = isMuted;
    }, [isMuted]);

    return {
        isPlaying,
        isMuted,
        currentTrackIndex,
        currentTrack: TRACKS[currentTrackIndex],
        togglePlay:  () => setIsPlaying(p => !p),
        toggleMute:  () => setIsMuted(p => !p),
        selectTrack: (idx: number) => { setCurrentTrackIndex(idx); setIsPlaying(true); },
    };
}
