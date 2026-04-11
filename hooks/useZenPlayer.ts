import { useState } from 'react';

export const TRACKS = [
    { id: 'jfKfPfyJRdk', title: 'Lofi Girl',      genre: 'Lofi Hip Hop' },
    { id: 'hIH1joP9_FU', title: 'Deep Focus',      genre: 'Instrumental' },
    { id: 'TtkFsfOP9QI', title: 'Peaceful Piano',  genre: 'Classical' },
    { id: 'fNjQBXADm44', title: 'Nature Sounds',   genre: 'Rain & Forest' },
    { id: 'Dx5qFachd3A', title: 'Coffee House',    genre: 'Smooth Jazz' },
    { id: 'vYIYIVmOo3Q', title: 'Study Radio',     genre: 'Lofi Beats' },
    { id: 'jXAEIWcGXwE', title: 'Chill Radio',     genre: 'Lofi Beats' },
    { id: 'blAFxjhg62k', title: 'Focus Radio',     genre: 'Ambient' },
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
