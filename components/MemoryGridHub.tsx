import React, { useState, useEffect, useCallback } from 'react';
import { MemoryItem } from '../types';
import { MemoryItem } from '../types';

const DISMISSED_KEY = 'dumped_dismissed_tiles';

interface MemoryGridHubProps {
    memories: MemoryItem[];
    setActiveTab: (tab: string) => void;
}

interface TileData {
    id: string;
    text: string;
    count: number;
    lastSeen: number;
}

/**
 * Safely parses various date formats (numbers, numeric strings, ISO strings)
 */
function parseSafeDate(val: any): Date {
    if (!val) return new Date(0);
    // Handle numeric strings like "16813XXXXX"
    if (typeof val === 'string' && /^\d+$/.test(val)) {
        return new Date(parseInt(val, 10));
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date(0) : d;
}

function getSimilarity(a: string, b: string): number {
    // Normalize and filter for meaningful words
    const filter = (text: string) => text.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
    const wordsA = new Set(filter(a));
    const wordsB = new Set(filter(b));

    if (wordsA.size === 0 && wordsB.size === 0) return 1;
    if (wordsA.size === 0 || wordsB.size === 0) return 0;

    let intersection = 0;
    for (const word of wordsA) if (wordsB.has(word)) intersection++;

    return intersection / Math.max(wordsA.size, wordsB.size);
}

function getDismissed(): Set<string> {
    try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]')); } catch { return new Set(); }
}

function dismissTile(key: string) {
    const dismissed = getDismissed();
    dismissed.add(key);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed]));
}

function buildTiles(memories: MemoryItem[]): TileData[] {
    const allTexts: { text: string; timestamp: Date }[] = [];

    // AI-extracted action items from existing memories
    for (const memory of memories) {
        const memDate = parseSafeDate(memory.timestamp);
        for (const action of memory.actions || []) {
            if (!action.completed && action.text?.trim()) {
                allTexts.push({ text: action.text.trim(), timestamp: memDate });
            }
        }
    }

    const groups: { key: string; count: number; canonical: string; lastSeen: Date }[] = [];

    for (const { text, timestamp } of allTexts) {
        const norm = text.toLowerCase().trim();
        let matched = false;

        for (const group of groups) {
            if (getSimilarity(norm, group.key) > 0.6) { // Slightly stricter threshold
                group.count += 1;
                if (timestamp > group.lastSeen) {
                    group.lastSeen = timestamp;
                    group.canonical = text;
                }
                matched = true;
                break;
            }
        }

        if (!matched) {
            groups.push({ key: norm, count: 1, canonical: text, lastSeen: timestamp });
        }
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);

    const dismissed = getDismissed();

    return groups
        .filter(g => g.lastSeen > cutoff && !dismissed.has(g.key))
        .map(g => ({
            id: g.key,
            text: g.canonical,
            count: g.count,
            lastSeen: g.lastSeen.getTime()
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
}

function tileSize(count: number, max: number): 'xl' | 'lg' | 'md' | 'sm' {
    const ratio = max <= 1 ? 0 : (count - 1) / (max - 1);
    if (ratio >= 0.75) return 'xl';
    if (ratio >= 0.5) return 'lg';
    if (ratio >= 0.25) return 'md';
    return 'sm';
}

function tileOpacity(count: number, max: number): number {
    return 0.35 + (count / max) * 0.65;
}

export const MemoryGridHub: React.FC<MemoryGridHubProps> = ({ memories, setActiveTab }) => {
    const [tiles, setTiles] = useState<TileData[]>([]);

    useEffect(() => {
        setTiles(buildTiles(memories));
    }, [memories]);

    const handleDismiss = useCallback((key: string) => {
        dismissTile(key);
        setTiles(prev => prev.filter(t => t.key !== key));
    }, []);

    const maxCount = tiles[0]?.count || 1;

    if (tiles.length === 0) {
        return (
            <div className="animate-in fade-in min-h-[80vh] flex flex-col items-center justify-center max-w-lg mx-auto w-full text-center gap-4">
                <p className="text-slate-500 text-sm">Nothing here yet.</p>
                <p className="text-slate-400 text-xs">Do a dump first — your patterns will appear here.</p>
                <button
                    onClick={() => setActiveTab('dump')}
                    className="mt-2 bg-slate-800 text-white rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-slate-700 transition-colors"
                >
                    Go dump something
                </button>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in max-w-lg mx-auto w-full py-8">

            {/* Header */}
            <div className="mb-5">
                <h2 className="text-slate-800 font-semibold text-xl tracking-tight">What keeps coming up</h2>
                <p className="text-slate-400 text-xs mt-1">Bigger = mentioned more often across your dumps</p>
            </div>

            {/* Tile grid */}
            <div className="grid grid-cols-2 gap-2">
                {tiles.map((tile, i) => {
                    const size = tileSize(tile.count, maxCount);
                    const opacity = tileOpacity(tile.count, maxCount);
                    const isXL = size === 'xl';
                    const textSize = size === 'sm' || size === 'md' ? 'text-xs' : 'text-sm';

                    return (
                        <div
                            key={i}
                            style={{ opacity }}
                            className={`relative bg-white rounded-2xl border border-slate-200/80 p-3 flex flex-col gap-1.5 ${isXL ? 'col-span-2 py-4' : ''}`}
                        >
                            <button
                                onClick={() => handleDismiss(tile.key)}
                                className="absolute top-2 right-2 text-slate-300 hover:text-slate-500 transition-colors p-0.5 rounded-full"
                                aria-label="Dismiss"
                            >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                            </button>

                            <p className={`font-medium text-slate-800 leading-snug pr-4 ${textSize}`}>
                                {tile.text}
                            </p>

                            <span className="inline-block rounded-full px-2 py-0.5 w-fit text-indigo-700 bg-indigo-50 text-[10px] font-semibold">
                                {tile.count}×
                            </span>

                            {isXL && tile.count >= 4 && (
                                <p className="text-[10px] text-slate-400 italic mt-1 border-t border-slate-100 pt-2 leading-snug">
                                    This keeps showing up. What's making it hard to start?
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            <p className="text-center text-slate-300 text-[10px] mt-5">
                Things not seen in 14 days fade away
            </p>
        </div>
    );
};
