import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserPersona, RhythmCategory, RhythmCalendarData } from '../types';
import { 
    TrashIcon, 
    PlusIcon, 
    SparklesIcon, 
    ClockIcon,
    ArrowPathIcon,
    CheckIcon,
    PencilIcon,
    CalendarIcon
} from '@heroicons/react/24/outline';
import { PlayIcon } from '@heroicons/react/24/solid';

// Curated modern Zen color palette for user-defined categories
const PRESET_COLORS = [
    '#c7d2fe', // Soft Indigo (Sleep/Rest)
    '#bae6fd', // Soft Blue (Work/Focus)
    '#a7f3d0', // Soft Emerald (Growth/Health)
    '#fecdd3', // Soft Rose (Family/Love)
    '#fed7aa', // Soft Peach (Hobbies/Leisure)
    '#f5d0fe', // Soft Lilac (Mindfulness/Spirit)
    '#99f6e4', // Soft Teal (Creativity/Projects)
    '#ffedd5', // Soft Coral (Activity/Energy)
    '#c5f2f7', // Soft Cyan (Study/Reading)
    '#fbcfe8', // Soft Pink (Social/Play)
    '#ddd6fe', // Soft Violet (Journaling)
    '#cbd5e1', // Soft Slate (Admin/Chores)
];

const DAYS_OF_WEEK = [
    { label: 'Monday', short: 'Mon' },
    { label: 'Tuesday', short: 'Tue' },
    { label: 'Wednesday', short: 'Wed' },
    { label: 'Thursday', short: 'Thu' },
    { label: 'Friday', short: 'Fri' },
    { label: 'Saturday', short: 'Sat' },
    { label: 'Sunday', short: 'Sun' },
];

const DEFAULT_CATEGORIES: RhythmCategory[] = [
    { id: 'sleep', label: 'Sleep', color: '#c7d2fe' },
    { id: 'work', label: 'Work', color: '#bae6fd' },
    { id: 'personal', label: 'Personal Time', color: '#a7f3d0' },
    { id: 'family', label: 'Family', color: '#fecdd3' },
];

// Migration map for old non-pastel colors to new pastel colors
const COLOR_MIGRATION_MAP: Record<string, string> = {
    '#6366f1': '#c7d2fe', // Indigo -> Soft Indigo
    '#3b82f6': '#bae6fd', // Blue -> Soft Blue
    '#10b981': '#a7f3d0', // Emerald -> Soft Emerald
    '#e11d48': '#fecdd3', // Rose -> Soft Rose
    '#f59e0b': '#fed7aa', // Amber -> Soft Peach
    '#a855f7': '#f5d0fe', // Purple -> Soft Lilac
    '#14b8a6': '#99f6e4', // Teal -> Soft Teal
    '#f97316': '#ffedd5', // Orange -> Soft Coral
    '#06b6d4': '#c5f2f7', // Cyan -> Soft Cyan
    '#ec4899': '#fbcfe8', // Pink -> Soft Pink
    '#8b5cf6': '#ddd6fe', // Violet -> Soft Violet
    '#64748b': '#cbd5e1', // Slate -> Soft Slate
};

interface RhythmCalendarProps {
    persona: UserPersona;
    onUpdatePersona: (updates: Partial<UserPersona>) => void;
}

export const RhythmCalendar: React.FC<RhythmCalendarProps> = ({ persona, onUpdatePersona }) => {
    // ─── State initialization ───
    const calendarData = persona.rhythmCalendar || { grid: {}, categories: DEFAULT_CATEGORIES };
    const { grid, categories: rawCategories } = calendarData;

    // Apply client-side color migration immediately on render
    const categories = React.useMemo(() => {
        return rawCategories.map(cat => {
            const lowerColor = cat.color.toLowerCase();
            if (COLOR_MIGRATION_MAP[lowerColor]) {
                return { ...cat, color: COLOR_MIGRATION_MAP[lowerColor] };
            }
            return cat;
        });
    }, [rawCategories]);

    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('sleep'); // Default to sleep
    const [isEditingCategories, setIsEditingCategories] = useState<boolean>(false);
    const [newCategoryLabel, setNewCategoryLabel] = useState<string>('');
    const [newCategoryColor, setNewCategoryColor] = useState<string>(PRESET_COLORS[0]);
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editingCategoryLabel, setEditingCategoryLabel] = useState<string>('');
    const [editingCategoryColor, setEditingCategoryColor] = useState<string>('');

    // Tooltip hover state
    const [hoveredCell, setHoveredCell] = useState<{ dayIdx: number; hourIdx: number; x: number; y: number } | null>(null);

    // Click-and-drag painting mechanics
    const isDrawingRef = useRef<boolean>(false);
    const [isDrawingState, setIsDrawingState] = useState<boolean>(false); // for UI indicators

    // Update the rhythm calendar in parent persona state
    const saveCalendarData = useCallback((nextGrid: Record<string, string>, nextCategories: RhythmCategory[]) => {
        onUpdatePersona({
            rhythmCalendar: {
                grid: nextGrid,
                categories: nextCategories
            }
        });
    }, [onUpdatePersona]);

    // Auto-save migrated categories with pastel colors to database/localStorage
    useEffect(() => {
        const hasOldColors = rawCategories.some(cat => {
            const lowerColor = cat.color.toLowerCase();
            return !!COLOR_MIGRATION_MAP[lowerColor];
        });
        if (hasOldColors) {
            saveCalendarData(grid, categories);
        }
    }, [rawCategories, categories, grid, saveCalendarData]);

    // Handle global mouse up to stop painting
    useEffect(() => {
        const handleMouseUp = () => {
            isDrawingRef.current = false;
            setIsDrawingState(false);
        };
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchend', handleMouseUp);
        return () => {
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, []);

    // Format hours for display
    const formatHour = (h: number) => {
        if (h === 0) return '12 AM';
        if (h === 12) return '12 PM';
        return h > 12 ? `${h - 12} PM` : `${h} AM`;
    };

    const formatHourShort = (h: number) => {
        if (h === 0) return '12a';
        if (h === 12) return '12p';
        return h > 12 ? `${h - 12}p` : `${h}a`;
    };


    // Cell painting actions
    const paintCell = useCallback((dayIdx: number, hourIdx: number) => {
        const cellKey = `${dayIdx}-${hourIdx}`;
        const nextGrid = { ...grid };

        if (selectedCategoryId === 'eraser') {
            delete nextGrid[cellKey];
        } else {
            nextGrid[cellKey] = selectedCategoryId;
        }

        saveCalendarData(nextGrid, categories);
    }, [grid, categories, selectedCategoryId, saveCalendarData]);

    const handleCellMouseDown = (dayIdx: number, hourIdx: number, e: React.MouseEvent) => {
        e.preventDefault();
        isDrawingRef.current = true;
        setIsDrawingState(true);
        paintCell(dayIdx, hourIdx);
    };

    const handleCellMouseEnter = (dayIdx: number, hourIdx: number, e: React.MouseEvent) => {
        if (isDrawingRef.current) {
            paintCell(dayIdx, hourIdx);
        }

        // Show Tooltip
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const containerRect = (e.currentTarget.closest('.calendar-grid-container') as HTMLElement)?.getBoundingClientRect();
        
        setHoveredCell({
            dayIdx,
            hourIdx,
            x: rect.left - (containerRect?.left || 0) + rect.width / 2,
            y: rect.top - (containerRect?.top || 0) - 45
        });
    };

    const handleCellMouseLeave = () => {
        setHoveredCell(null);
    };

    // Touch device drag support
    const handleTouchStart = (dayIdx: number, hourIdx: number, e: React.TouchEvent) => {
        isDrawingRef.current = true;
        setIsDrawingState(true);
        paintCell(dayIdx, hourIdx);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDrawingRef.current) return;
        const touch = e.touches[0];
        // Read element from coordinate points
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target) {
            const cellId = target.getAttribute('data-cell-id');
            if (cellId) {
                const [dStr, hStr] = cellId.split('-');
                const dayIdx = parseInt(dStr, 10);
                const hourIdx = parseInt(hStr, 10);
                if (!isNaN(dayIdx) && !isNaN(hourIdx)) {
                    paintCell(dayIdx, hourIdx);
                }
            }
        }
    };

    // Category additions
    const handleAddCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryLabel.trim()) return;

        const nextId = `cat-${Date.now()}`;
        const nextCategories = [
            ...categories,
            { id: nextId, label: newCategoryLabel.trim(), color: newCategoryColor }
        ];

        setNewCategoryLabel('');
        // Cycle colors
        const currentIdx = PRESET_COLORS.indexOf(newCategoryColor);
        setNewCategoryColor(PRESET_COLORS[(currentIdx + 1) % PRESET_COLORS.length]);

        saveCalendarData(grid, nextCategories);
        setSelectedCategoryId(nextId);
    };

    // Category deletions
    const handleDeleteCategory = (catId: string) => {
        if (categories.length <= 1) {
            alert("You must keep at least one category to paint the calendar.");
            return;
        }

        const confirmed = window.confirm(`Are you sure you want to delete this category? All hours painted with this category will be cleared.`);
        if (!confirmed) return;

        const nextCategories = categories.filter(c => c.id !== catId);
        // Clear cells painted with the deleted category
        const nextGrid = { ...grid };
        Object.keys(nextGrid).forEach(key => {
            if (nextGrid[key] === catId) {
                delete nextGrid[key];
            }
        });

        if (selectedCategoryId === catId) {
            setSelectedCategoryId(nextCategories[0]?.id || 'eraser');
        }

        saveCalendarData(nextGrid, nextCategories);
    };

    // Category editing
    const startEditingCategory = (cat: RhythmCategory) => {
        setEditingCategoryId(cat.id);
        setEditingCategoryLabel(cat.label);
        setEditingCategoryColor(cat.color);
    };

    const handleSaveEditCategory = () => {
        if (!editingCategoryId || !editingCategoryLabel.trim()) return;

        const nextCategories = categories.map(c => {
            if (c.id === editingCategoryId) {
                return { ...c, label: editingCategoryLabel.trim(), color: editingCategoryColor };
            }
            return c;
        });

        setEditingCategoryId(null);
        saveCalendarData(grid, nextCategories);
    };

    // Apply Presets
    const applyPreset = (presetType: 'office' | 'zen' | 'clear') => {
        const hasData = Object.keys(grid).length > 0;
        if (hasData && presetType !== 'clear') {
            const confirmed = window.confirm("Applying a preset will overwrite your current calendar grid. Do you want to proceed?");
            if (!confirmed) return;
        }

        const nextGrid: Record<string, string> = {};

        if (presetType === 'clear') {
            const confirmed = window.confirm("Are you sure you want to clear your entire weekly grid?");
            if (!confirmed) return;
            saveCalendarData({}, categories);
            return;
        }

        // Helper to check if a day is weekend
        const isWeekend = (dayIdx: number) => dayIdx === 5 || dayIdx === 6; // Sat, Sun

        if (presetType === 'office') {
            // Monday to Sunday: Sleep 11 PM to 7 AM
            // Mon to Fri: Work 9 AM to 5 PM
            // Sat/Sun: Personal / Family
            for (let day = 0; day < 7; day++) {
                // Sleep
                for (let hr = 0; hr < 7; hr++) nextGrid[`${day}-${hr}`] = 'sleep';
                nextGrid[`${day}-23`] = 'sleep';

                if (!isWeekend(day)) {
                    // Work
                    for (let hr = 9; hr < 17; hr++) nextGrid[`${day}-${hr}`] = 'work';
                    // Personal & Family fallbacks
                    nextGrid[`${day}-7`] = 'personal';
                    nextGrid[`${day}-8`] = 'personal';
                    for (let hr = 17; hr < 20; hr++) nextGrid[`${day}-${hr}`] = 'family';
                    for (let hr = 20; hr < 23; hr++) nextGrid[`${day}-${hr}`] = 'personal';
                } else {
                    // Weekend
                    for (let hr = 7; hr < 10; hr++) nextGrid[`${day}-${hr}`] = 'personal';
                    for (let hr = 10; hr < 18; hr++) nextGrid[`${day}-${hr}`] = 'family';
                    for (let hr = 18; hr < 23; hr++) nextGrid[`${day}-${hr}`] = 'personal';
                }
            }
        } else if (presetType === 'zen') {
            // Highly balanced routine
            for (let day = 0; day < 7; day++) {
                // Sleep 10 PM to 6 AM (8 hours)
                for (let hr = 0; hr < 6; hr++) nextGrid[`${day}-${hr}`] = 'sleep';
                nextGrid[`${day}-22`] = 'sleep';
                nextGrid[`${day}-23`] = 'sleep';

                // Morning routine / Personal
                nextGrid[`${day}-6`] = 'personal';
                nextGrid[`${day}-7`] = 'personal';

                if (!isWeekend(day)) {
                    // Work 8 AM to 4 PM
                    for (let hr = 8; hr < 16; hr++) nextGrid[`${day}-${hr}`] = 'work';
                    // Evening transition
                    nextGrid[`${day}-16`] = 'personal';
                    nextGrid[`${day}-17`] = 'personal';
                    // Family/Social time
                    for (let hr = 18; hr < 21; hr++) nextGrid[`${day}-${hr}`] = 'family';
                    // Wind down
                    nextGrid[`${day}-21`] = 'personal';
                } else {
                    // Free Flow Weekend
                    for (let hr = 8; hr < 12; hr++) nextGrid[`${day}-${hr}`] = 'personal';
                    for (let hr = 12; hr < 19; hr++) nextGrid[`${day}-${hr}`] = 'family';
                    for (let hr = 19; hr < 22; hr++) nextGrid[`${day}-${hr}`] = 'personal';
                }
            }
        }

        saveCalendarData(nextGrid, categories);
    };

    // Calculate Statistics
    const totalHours = 168; // 24 * 7
    const categoryStats = categories.map(cat => {
        const hours = Object.values(grid).filter(v => v === cat.id).length;
        const percentage = ((hours / totalHours) * 100).toFixed(1);
        return {
            ...cat,
            hours,
            percentage: parseFloat(percentage)
        };
    });

    const unallocatedHours = totalHours - categoryStats.reduce((acc, curr) => acc + curr.hours, 0);
    const unallocatedPercentage = parseFloat(((unallocatedHours / totalHours) * 100).toFixed(1));

    // Dynamic Zen Insight Generation
    const getZenInsight = () => {
        const sleepHours = categoryStats.find(s => s.id === 'sleep')?.hours || 0;
        const workHours = categoryStats.find(s => s.id === 'work')?.hours || 0;
        const personalHours = categoryStats.find(s => s.id === 'personal')?.hours || 0;
        const familyHours = categoryStats.find(s => s.id === 'family')?.hours || 0;

        if (Object.keys(grid).length === 0) {
            return "Your canvas is clean! Choose an activity color below and paint your hours to map out your ideal weekly flow.";
        }

        if (sleepHours < 42) {
            return "🌙 Rest alert: You've allocated less than 6 hours of sleep per night. Prioritizing rest is key to maintaining high energy.";
        }

        if (workHours > 50) {
            return "⚡ Intensity warning: Work represents over 50 hours of your week. Consider drawing firm boundaries to avoid mental burnout.";
        }

        if (personalHours >= 20 && sleepHours >= 49 && workHours <= 45) {
            return "✨ Exquisite balance! You have designed a beautifully harmonious week with ample space for work, rest, and personal growth.";
        }

        if (familyHours > 30) {
            return "❤️ Connection rich: You are dedicating a massive portion of your week to loved ones. Make sure you still leave a small window just for yourself.";
        }

        return "🌱 Flow in progress: Your routine is taking shape! Aim for a balance where sleep is ~33% (56h) and work stays under 25% (42h).";
    };

    return (
        <div className="max-w-3xl mx-auto w-full pb-24 animate-in fade-in duration-700">
            {/* Header section matching TilesHub premium layout */}
            <div className="mb-5 mx-1 pb-3 border-b border-slate-100/60 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <ClockIcon className="w-4 h-4 text-indigo-400" />
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Weekly Rhythm</span>
                    </div>
                    <h2 className="text-xl font-medium tracking-tight text-slate-900">Your routine, visualised.</h2>
                    <p className="text-xs text-slate-600 mt-1 max-w-xl">
                        Map out your weekly flow of work, sleep, family, and hobbies. Drag your mouse or finger over the grid below to paint color blocks and align your actual time with your values.
                    </p>
                </div>

                {/* Preset Actions */}
                <div className="flex flex-wrap gap-2 self-start md:self-end">
                    <button 
                        onClick={() => applyPreset('office')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/50 border border-slate-200 text-[11px] font-medium text-slate-700 hover:bg-white/80 active:scale-95 transition-all shadow-sm"
                        title="Populate 9-to-5 Workday Preset"
                    >
                        <SparklesIcon className="w-3.5 h-3.5 text-indigo-500" />
                        <span>9-to-5 Preset</span>
                    </button>
                    <button 
                        onClick={() => applyPreset('zen')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/50 border border-slate-200 text-[11px] font-medium text-slate-700 hover:bg-white/80 active:scale-95 transition-all shadow-sm"
                        title="Populate Balanced Zen Routine Preset"
                    >
                        <CalendarIcon className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Zen Preset</span>
                    </button>
                    <button 
                        onClick={() => applyPreset('clear')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50/50 border border-rose-200 text-[11px] font-medium text-rose-600 hover:bg-rose-100/50 active:scale-95 transition-all"
                        title="Clear Grid"
                    >
                        <ArrowPathIcon className="w-3.5 h-3.5" />
                        <span>Clear All</span>
                    </button>
                </div>
            </div>

            {/* Visualizer canvas */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                        {isDrawingState ? '🖌️ Painting Flow...' : '✨ Paint Canvas (Drag to Color)'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                        Double click / Eraser mode to clear cells
                    </span>
                </div>

                <div className="relative calendar-grid-container w-full">
                    {/* Hover Tooltip (Absolute relative to grid container) */}
                    {hoveredCell && (
                        <div 
                            className="absolute pointer-events-none z-50 bg-slate-950 text-white rounded-lg px-2.5 py-1.5 text-[10px] font-medium leading-tight shadow-xl flex flex-col items-center gap-0.5 -translate-x-1/2 transition-all duration-75"
                            style={{ 
                                left: `${hoveredCell.x}px`, 
                                top: `${hoveredCell.y}px` 
                            }}
                        >
                            <span className="text-white/60 font-semibold">{DAYS_OF_WEEK[hoveredCell.dayIdx].label}</span>
                            <span className="font-bold text-[11px]">{formatHour(hoveredCell.hourIdx)} - {formatHour((hoveredCell.hourIdx + 1) % 24)}</span>
                            {grid[`${hoveredCell.dayIdx}-${hoveredCell.hourIdx}`] ? (
                                <div className="flex items-center gap-1 mt-1 font-bold">
                                    <div 
                                        className="w-2 h-2 rounded-full" 
                                        style={{ backgroundColor: categories.find(c => c.id === grid[`${hoveredCell.dayIdx}-${hoveredCell.hourIdx}`])?.color }} 
                                    />
                                    <span className="text-white">
                                        {categories.find(c => c.id === grid[`${hoveredCell.dayIdx}-${hoveredCell.hourIdx}`])?.label}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-white/40 italic mt-0.5">Free / Unplanned</span>
                            )}
                            {/* Arrow */}
                            <div className="w-1.5 h-1.5 bg-slate-950 rotate-45 absolute bottom-[-3px] left-1/2 -translate-x-1/2" />
                        </div>
                    )}

                    <div className="grid grid-cols-[2.5rem_repeat(7,_1fr)] gap-[2px] w-full select-none items-center">
                        {/* TOP HEADER */}
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight flex items-center justify-end pr-1.5 h-8">
                            Hour
                        </div>
                        {DAYS_OF_WEEK.map((day) => (
                            <div 
                                key={day.short} 
                                className="text-[11px] font-bold text-slate-600 tracking-tight flex items-center justify-center h-8"
                                title={day.label}
                            >
                                <span className="hidden sm:inline">{day.label}</span>
                                <span className="inline sm:hidden">{day.short}</span>
                            </div>
                        ))}

                        {/* Hour rows flat list */}
                        {Array.from({ length: 24 }).map((_, hourIdx) => (
                            <React.Fragment key={hourIdx}>
                                {/* Hour Label */}
                                <div className="text-[10px] font-bold text-slate-450 tracking-tight pr-1.5 flex items-center justify-end h-full">
                                    {formatHourShort(hourIdx)}
                                </div>

                                {/* 7 Day cells */}
                                {DAYS_OF_WEEK.map((day, dayIdx) => {
                                    const cellKey = `${dayIdx}-${hourIdx}`;
                                    const categoryId = grid[cellKey];
                                    const category = categories.find(c => c.id === categoryId);

                                    return (
                                        <div
                                            key={dayIdx}
                                            data-cell-id={cellKey}
                                            onMouseDown={(e) => handleCellMouseDown(dayIdx, hourIdx, e)}
                                            onMouseEnter={(e) => handleCellMouseEnter(dayIdx, hourIdx, e)}
                                            onMouseLeave={handleCellMouseLeave}
                                            onTouchStart={(e) => handleTouchStart(dayIdx, hourIdx, e)}
                                            onTouchMove={handleTouchMove}
                                            onDoubleClick={() => {
                                                const nextGrid = { ...grid };
                                                delete nextGrid[cellKey];
                                                saveCalendarData(nextGrid, categories);
                                            }}
                                            className={`
                                                aspect-square w-full rounded-[3px] border cursor-crosshair transition-all duration-150 relative overflow-hidden
                                                ${category 
                                                    ? 'border-transparent shadow-sm hover:ring-2 hover:ring-slate-900/10' 
                                                    : 'border-slate-300/30 bg-slate-500/[0.04] hover:bg-slate-500/[0.1] hover:border-slate-300/60'
                                                }
                                            `}
                                            style={{
                                                backgroundColor: category ? category.color : undefined,
                                                backgroundImage: category ? 'linear-gradient(rgba(255,255,255,0.06), rgba(0,0,0,0.04))' : undefined
                                            }}
                                        >
                                            {category && (
                                                <div className="absolute inset-[1px] rounded-[2px] border border-white/20 pointer-events-none" />
                                            )}
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* ─── LEGEND & PAINT CHOOSER ─── */}
                <div className="flex flex-col md:flex-row gap-6 pt-6 border-t border-slate-100">
                    
                    {/* Legend select area */}
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100/60 pb-2">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Select Paint Color</span>
                            <button
                                onClick={() => setIsEditingCategories(!isEditingCategories)}
                                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-500 hover:text-indigo-600 transition-colors"
                            >
                                <PencilIcon className="w-3.5 h-3.5" />
                                <span>{isEditingCategories ? 'Done Customizing' : 'Customize Activities'}</span>
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {categories.map((cat) => {
                                const isSelected = selectedCategoryId === cat.id;
                                return (
                                    <div key={cat.id} className="relative group">
                                        <div
                                            onClick={() => {
                                                if (!isEditingCategories) {
                                                    setSelectedCategoryId(cat.id);
                                                }
                                            }}
                                            className={`
                                                flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-350 border
                                                ${isSelected && !isEditingCategories
                                                    ? 'bg-slate-900 border-slate-900 text-white shadow-md scale-102 ring-2 ring-slate-800 ring-offset-2'
                                                    : 'bg-white/50 border-slate-200 hover:bg-white/80 hover:border-slate-300 text-slate-700'
                                                }
                                                ${isEditingCategories ? 'cursor-default' : 'cursor-pointer active:scale-95'}
                                            `}
                                            role="button"
                                            tabIndex={isEditingCategories ? -1 : 0}
                                            onKeyDown={(e) => {
                                                if (!isEditingCategories && (e.key === 'Enter' || e.key === ' ')) {
                                                    e.preventDefault();
                                                    setSelectedCategoryId(cat.id);
                                                }
                                            }}
                                        >
                                            <div 
                                                className="w-3.5 h-3.5 rounded-full border border-white/10 shrink-0 transition-transform duration-300"
                                                style={{ backgroundColor: cat.color }}
                                            />
                                            {isEditingCategories && editingCategoryId === cat.id ? (
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="text"
                                                        value={editingCategoryLabel}
                                                        onChange={(e) => setEditingCategoryLabel(e.target.value)}
                                                        className="px-1.5 py-0.5 border border-slate-200 rounded text-xs w-24 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-400 font-medium"
                                                        placeholder="Activity Name"
                                                        autoFocus
                                                    />
                                                    <div className="flex items-center gap-1">
                                                        <input 
                                                            type="color" 
                                                            value={editingCategoryColor}
                                                            onChange={(e) => setEditingCategoryColor(e.target.value)}
                                                            className="w-5 h-5 cursor-pointer border-none bg-transparent rounded"
                                                        />
                                                        <button 
                                                            onClick={handleSaveEditCategory}
                                                            className="p-0.5 bg-emerald-500 text-white rounded hover:bg-emerald-600"
                                                            title="Save"
                                                        >
                                                            <CheckIcon className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs font-semibold select-none">{cat.label}</span>
                                            )}

                                            {/* Action buttons during edit mode */}
                                            {isEditingCategories && editingCategoryId !== cat.id && (
                                                <div className="flex items-center gap-1 pl-1 ml-1 border-l border-slate-200">
                                                    <button
                                                        onClick={() => startEditingCategory(cat)}
                                                        className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded transition-colors"
                                                        title="Edit"
                                                    >
                                                        <PencilIcon className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCategory(cat.id)}
                                                        className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded transition-colors"
                                                        title="Delete Category"
                                                    >
                                                        <TrashIcon className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Eraser Button */}
                            {!isEditingCategories && (
                                <button
                                    onClick={() => setSelectedCategoryId('eraser')}
                                    className={`
                                        flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 border
                                        ${selectedCategoryId === 'eraser'
                                            ? 'bg-rose-950 border-rose-950 text-white shadow-md ring-2 ring-rose-900 ring-offset-2'
                                            : 'bg-white/50 border-slate-200 text-slate-700 hover:bg-rose-50/20 hover:border-rose-100'
                                        }
                                        active:scale-95 cursor-pointer
                                    `}
                                    title="Erase painted tiles"
                                >
                                    <span className="text-sm shrink-0">🧽</span>
                                    <span className="text-xs font-bold select-none">Eraser</span>
                                </button>
                            )}

                            {/* Add custom activity category */}
                            {isEditingCategories && (
                                <form onSubmit={handleAddCategory} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={newCategoryLabel}
                                        onChange={(e) => setNewCategoryLabel(e.target.value)}
                                        placeholder="New activity (e.g. Gym)"
                                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs w-36 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 shadow-inner font-medium"
                                        maxLength={18}
                                    />
                                    <div className="flex items-center gap-1.5">
                                        <input 
                                            type="color" 
                                            value={newCategoryColor}
                                            onChange={(e) => setNewCategoryColor(e.target.value)}
                                            className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 shrink-0 p-0.5 bg-white"
                                            title="Choose color"
                                        />
                                        <button
                                            type="submit"
                                            className="p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 active:scale-95 transition-all shadow-md shrink-0 flex items-center justify-center"
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Weekly Allocations Metrics & Statistics (Glass Card) */}
                    <div className="w-full md:w-80 bg-white/40 backdrop-blur-md border border-slate-200/60 rounded-[20px] p-5 space-y-4 shadow-sm self-start">
                        <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Time Allocation Insight</span>
                            <p className="text-[11px] text-slate-600 font-semibold mt-1 leading-relaxed italic">
                                "{getZenInsight()}"
                            </p>
                        </div>

                        {/* Breakdown stat bars */}
                        <div className="space-y-3 border-t border-slate-100/80 pt-3">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Weekly Breakdown</span>
                            
                            <div className="space-y-2.5 max-h-[190px] overflow-y-auto no-scrollbar pr-0.5">
                                {categoryStats.map((stat) => (
                                    <div key={stat.id} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stat.color }} />
                                                <span className="truncate max-w-[120px]">{stat.label}</span>
                                            </div>
                                            <span className="text-[11px] text-slate-500">
                                                <strong className="text-slate-850 font-bold">{stat.hours}h</strong> ({stat.percentage}%)
                                            </span>
                                        </div>
                                        {/* Premium Progress Bar */}
                                        <div className="w-full h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full rounded-full transition-all duration-700 ease-out"
                                                style={{ 
                                                    width: `${stat.percentage}%`,
                                                    backgroundColor: stat.color 
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}

                                {/* Unallocated Balance Stat */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-slate-200 shrink-0" />
                                            <span>Unplanned / Free</span>
                                        </div>
                                        <span className="text-[11px] text-slate-500">
                                            <strong className="text-slate-750 font-bold">{unallocatedHours}h</strong> ({unallocatedPercentage}%)
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-slate-200 rounded-full transition-all duration-700 ease-out"
                                            style={{ width: `${unallocatedPercentage}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom CSS for grid scroll styling */}
            <style>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};
