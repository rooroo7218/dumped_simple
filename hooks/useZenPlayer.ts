import { useState, useRef, useEffect } from 'react';

export const TRACKS = [
    { id: 'coderadio',    title: 'lofi coderadio',        genre: 'lofi · jazzy beats',      streamUrl: 'https://coderadio-admin-v2.freecodecamp.org/listen/coderadio/radio.mp3' },
    { id: 'nightride',    title: 'nightride fm',          genre: 'synthwave · retro',       streamUrl: 'https://stream.nightride.fm/nightride.mp3' },
    { id: 'chillhop',     title: 'fluxfm chillhop',       genre: 'chillhop · study beats',  streamUrl: 'https://streams.fluxfm.de/Chillhop/mp3-128/' },
    { id: 'defcon',       title: 'def con',               genre: 'ambient · beats',         streamUrl: 'https://ice1.somafm.com/defcon-256-mp3' },
    { id: 'fluid',        title: 'fluid',                 genre: 'lofi · hip-hop beats',    streamUrl: 'https://ice1.somafm.com/fluid-128-mp3' },
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
