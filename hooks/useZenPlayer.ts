import { useState, useRef, useEffect } from 'react';

export const TRACKS = [
    { id: 'coderadio',    title: 'lofi beats',            genre: 'coderadio',               streamUrl: 'https://coderadio-admin-v2.freecodecamp.org/listen/coderadio/radio.mp3' },
    { id: 'chillhop',     title: 'chillhop',              genre: 'fluxfm',                  streamUrl: 'https://streams.fluxfm.de/Chillhop/mp3-128/' },
    { id: 'defcon',       title: 'ambient beats',         genre: 'def con',                 streamUrl: 'https://ice1.somafm.com/defcon-256-mp3' },
    { id: 'fluid',        title: 'lofi hip-hop',          genre: 'fluid',                   streamUrl: 'https://ice1.somafm.com/fluid-128-mp3' },
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
