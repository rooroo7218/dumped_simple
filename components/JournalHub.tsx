import React, { useState } from 'react';
import { DiaryEntry, MemoryItem } from '../types';
import {
    MicrophoneIcon,
    TrashIcon,
    SparklesIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import './mascots/mascot-animations.css';

// Mood SVG imports
import moodJoyfulSvg from './mascots/mood-joyful.svg';
import moodPeacefulSvg from './mascots/mood-peaceful.svg';
import moodTiredSvg from './mascots/mood-tired.svg';
import moodAnxiousSvg from './mascots/mood-anxious.svg';
import moodFrustratedSvg from './mascots/mood-frustrated.svg';
import moodElatedSvg from './mascots/mood-elated.svg';

interface JournalHubProps {
    diaryInput: string;
    setDiaryInput: (val: string) => void;
    diaryMood: string;
    setDiaryMood: (val: string) => void;
    handleClearAllDiary: () => void;
    handleSaveDiary: () => void;
    handleDeleteDiaryEntry: (id: string, e: React.MouseEvent) => void;
    diaryEntries: DiaryEntry[];
    memories: MemoryItem[];
    startSpeechToText: (onResult: (text: string) => void) => void;
    isListening: boolean;
    themeClasses: {
        panel: string;
    };
}

const MOODS = [
    { id: 'joy',        svgSrc: moodJoyfulSvg,     label: 'Joyful',      color: 'text-yellow-500', bg: 'bg-yellow-50',  border: 'border-yellow-200',  anim: 'dumped-anim-heartbeat' },
    { id: 'peace',      svgSrc: moodPeacefulSvg,   label: 'Peaceful',    color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', anim: 'dumped-anim-heartbeat' },
    { id: 'tired',      svgSrc: moodTiredSvg,       label: 'Tired',       color: 'text-slate-500',  bg: 'bg-slate-50',   border: 'border-slate-200',   anim: 'dumped-anim-squish' },
    { id: 'anxious',    svgSrc: moodAnxiousSvg,     label: 'Anxious',     color: 'text-orange-500', bg: 'bg-orange-50',  border: 'border-orange-200',  anim: 'dumped-anim-wiggle' },
    { id: 'frustrated', svgSrc: moodFrustratedSvg,  label: 'Frustrated',  color: 'text-rose-500',   bg: 'bg-rose-50',    border: 'border-rose-200',    anim: 'dumped-anim-jelly' },
    { id: 'elated',     svgSrc: moodElatedSvg,      label: 'Elated',      color: 'text-purple-500', bg: 'bg-purple-50',  border: 'border-purple-200',  anim: 'dumped-anim-pop' },
];

const sectionLabel = 'text-[11px] font-semibold uppercase tracking-widest text-slate-500';

export const JournalHub: React.FC<JournalHubProps> = ({
    diaryInput,
    setDiaryInput,
    diaryMood,
    setDiaryMood,
    handleClearAllDiary,
    handleSaveDiary,
    handleDeleteDiaryEntry,
    diaryEntries,
    memories,
    startSpeechToText,
    isListening,
}) => {
    const cardBase = 'bg-white/70 border-2 border-slate-950 backdrop-blur-md shadow-sm';
    const [searchQuery, setSearchQuery] = useState('');

    // 3.4 — Journal callback: find last entry's mood and tasks completed that day
    const lastEntry = diaryEntries[0];
    const journalCallback = (() => {
        if (!lastEntry) return null;
        const entryDate = new Date(lastEntry.timestamp);
        const dayStart = new Date(entryDate); dayStart.setHours(0, 0, 0, 0);
        const dayEnd   = new Date(entryDate); dayEnd.setHours(23, 59, 59, 999);
        const clearedThatDay = memories.flatMap(m => m.actions ?? [])
            .filter(a => a.completed && a.completedAt && a.completedAt >= dayStart.getTime() && a.completedAt <= dayEnd.getTime()).length;
        const moodLabel = MOODS.find(m => m.id === lastEntry.mood)?.label ?? lastEntry.mood;
        const daysAgo = Math.floor((Date.now() - lastEntry.timestamp) / 86400000);
        if (daysAgo > 14) return null;
        const when = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`;
        return { moodLabel, clearedThatDay, when };
    })();

    // 3.13 — filtered entries
    const filteredEntries = searchQuery.trim()
        ? diaryEntries.filter(e =>
            e.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            MOODS.find(m => m.id === e.mood)?.label.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : diaryEntries;

    return (
        <section className="max-w-7xl mx-auto space-y-8">
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <SparklesIcon className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Journals</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Not everything in life is a to do.</h2>
            </div>

            {/* 3.4 — Journal callback */}
            {journalCallback && (
                <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-[13px] text-slate-500 font-medium animate-in fade-in duration-500">
                    <SparklesIcon className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                        Last time you felt <span className="font-semibold text-slate-700">{journalCallback.moodLabel}</span> ({journalCallback.when})
                        {journalCallback.clearedThatDay > 0
                            ? <> — you cleared <span className="font-semibold text-emerald-600">{journalCallback.clearedThatDay} task{journalCallback.clearedThatDay !== 1 ? 's' : ''}</span> that day.</>
                            : <> — keep writing, it helps.</>}
                    </span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

                {/* ── Left: Entry composer ── */}
                <div className={`p-7 rounded-3xl flex flex-col gap-6 ${cardBase}`}>

                    {/* Mood picker — 3.3 SVG mascots */}
                    <div className="space-y-3">
                        <span className={sectionLabel}>How are you feeling?</span>
                        <div className="flex flex-wrap gap-2">
                            {MOODS.map(mood => {
                                const isSelected = diaryMood === mood.id;
                                return (
                                    <button
                                        key={mood.id}
                                        onClick={() => setDiaryMood(mood.id)}
                                        className={`flex items-center gap-2 px-3.5 py-2 rounded-full border transition-all text-sm font-medium ${
                                            isSelected
                                                ? 'bg-slate-800 border-slate-800 text-white shadow-sm'
                                                : `${mood.bg} ${mood.border} ${mood.color} hover:scale-[1.03]`
                                        }`}
                                    >
                                        {mood.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Textarea */}
                    <div className="relative flex-1">
                        <span className={`${sectionLabel} block mb-2`}>What's on your mind?</span>
                        <textarea
                            value={diaryInput}
                            onChange={(e) => setDiaryInput(e.target.value)}
                            placeholder="Write freely…"
                            className="w-full min-h-[160px] md:min-h-[260px] p-5 rounded-2xl text-base text-slate-700 leading-relaxed resize-none focus:outline-none focus:ring-2 transition-all bg-white/50 border border-slate-200/60 focus:ring-slate-300/50 placeholder:text-slate-400"
                        />
                        <button
                            onClick={() => startSpeechToText(t => setDiaryInput(p => p + (p ? ' ' : '') + t))}
                            className={`absolute bottom-4 right-4 w-10 h-10 flex items-center justify-center rounded-full transition-all ${
                                isListening
                                    ? 'bg-rose-500 text-white animate-pulse shadow-lg'
                                    : 'bg-white/80 border border-slate-200 text-slate-500 hover:bg-white shadow-sm'
                            }`}
                            title={isListening ? 'Listening…' : 'Dictate'}
                        >
                            <MicrophoneIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={handleClearAllDiary}
                            className="text-xs font-medium text-rose-400 hover:text-rose-600 transition-colors"
                        >
                            Clear all entries
                        </button>
                        <button
                            onClick={handleSaveDiary}
                            className="px-7 py-3 rounded-full text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm bg-slate-800 text-white hover:bg-slate-700"
                        >
                            Save entry
                        </button>
                    </div>
                </div>

                {/* ── Right: Previous entries ── */}
                <div className="space-y-4">
                    {/* 3.13 — search */}
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search entries…"
                            className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-sm bg-white/60 border border-slate-200 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                        />
                    </div>

                    <div className="space-y-3 max-h-[300px] md:max-h-[600px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
                        {filteredEntries.length === 0 && searchQuery && (
                            <p className="text-sm text-slate-400 italic py-4 text-center">No entries match "{searchQuery}"</p>
                        )}
                        {filteredEntries.map(entry => {
                            const mood = MOODS.find(m => m.id === entry.mood);

                            return (
                                <div
                                    key={entry.id}
                                    className="relative p-5 rounded-2xl group transition-all hover:scale-[1.01] bg-white/70 border border-slate-200 backdrop-blur-md"
                                >
                                    {/* Delete */}
                                    <button
                                        onClick={(e) => handleDeleteDiaryEntry(entry.id, e)}
                                        className="absolute -top-2 -right-2 w-7 h-7 bg-rose-500 text-white flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className={`flex items-center gap-1.5 ${mood?.color ?? 'text-slate-500'}`}>
                                            {mood ? (
                                                <img src={mood.svgSrc} alt={mood.label} className="w-5 h-5 object-contain" />
                                            ) : null}
                                            <span className="text-xs font-semibold capitalize">{mood?.label ?? 'Neutral'}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-500">
                                            {new Date(entry.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            {' '}
                                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <p className="text-sm text-slate-700 leading-relaxed line-clamp-4">
                                        {entry.content}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
};
