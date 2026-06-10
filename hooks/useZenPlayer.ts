import { useState, useRef, useEffect } from 'react';

export const TRACKS = [
    { id: 'sleepingpill', title: 'ambient sleeping pill', genre: 'deep ambient',            streamUrl: 'http://radio.stereoscenic.com/asp-s' },
    { id: 'rp_mellow',    title: 'radio paradise mellow', genre: 'acoustic · chillout',     streamUrl: 'https://stream.radioparadise.com/mellow-128' },
    { id: 'jazz24',       title: 'jazz24',                genre: 'classic jazz',            streamUrl: 'https://jazz24.live-streams.astound.com/jazz24-mp3-128' },
    { id: 'fip',          title: 'fip radio',             genre: 'eclectic · groove',       streamUrl: 'http://direct.fipradio.fr/live/fip-midfi.mp3' },
    { id: 'kexp',         title: 'kexp seattle',          genre: 'indie · electronic',      streamUrl: 'https://kexp-mp3-128.streamguys1.com/kexp128.mp3' },
    { id: 'nts',          title: 'nts radio',             genre: 'underground beats',       streamUrl: 'https://stream-relay-geo.ntslive.net/stream' },
    { id: 'wsm',          title: 'wsm radio',             genre: 'americana · roots',       streamUrl: 'https://wsm.streamguys1.com/wsm-mp3' },
    { id: 'coderadio',    title: 'lofi coderadio',        genre: 'lofi · jazzy beats',      streamUrl: 'https://coderadio-admin-v2.freecodecamp.org/listen/coderadio/radio.mp3' },
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
