import React from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { ActionItem, ExternalEvent, MemoryItem } from '../types';

interface CalendarHubProps {
    unscheduledTasks: ActionItem[];
    allActiveTasks: ActionItem[];
    externalEvents: ExternalEvent[];
    memories: MemoryItem[];
    setSelectedTask: (task: { memoryId: string; task: ActionItem } | null) => void;
    syncCalendar: () => void;
    onDragStartTask: (e: React.DragEvent, taskId: string) => void;
    onDropOnCalendar: (e: React.DragEvent, timestamp: number) => void;
    getDayLabel: (index: number) => { name: string; date: number; timestamp: number };
    DAYS: string[];
    HOURS: number[];
    themeClasses: any;
}

export const CalendarHub: React.FC<CalendarHubProps> = ({
    unscheduledTasks,
    allActiveTasks,
    externalEvents,
    memories,
    setSelectedTask,
    syncCalendar,
    onDragStartTask,
    onDropOnCalendar,
    getDayLabel,
    DAYS,
    HOURS,
}) => {
    return (
        <section className="animate-in fade-in space-y-6 max-w-[1900px] mx-auto pb-20">

            {/* Toolbar */}
            <div className="flex justify-end pb-4 border-b border-slate-200">
                <button
                    onClick={syncCalendar}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
                >
                    <ArrowPathIcon className="w-3.5 h-3.5" />
                    Sync External
                </button>
            </div>

            <div className="flex flex-col lg:grid lg:grid-cols-[320px_1fr] gap-6 items-start">

                {/* Unscheduled sidebar */}
                <div className="w-full bg-white/70 border border-slate-200 backdrop-blur-md rounded-3xl shadow-sm h-[780px] flex flex-col p-6 gap-4 shrink-0">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Waiting Queue</span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            {unscheduledTasks.length}
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ scrollbarWidth: 'none' }}>
                        {unscheduledTasks.map((task) => (
                            <div
                                key={task.id}
                                draggable
                                onDragStart={(e) => onDragStartTask(e, task.id)}
                                className="p-3.5 rounded-2xl border border-slate-200 bg-white cursor-grab active:cursor-grabbing transition-all hover:border-slate-400 hover:shadow-sm"
                            >
                                <p className="text-[12px] font-semibold text-slate-800 leading-snug mb-1.5">{task.text}</p>
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
                                    {task.category}
                                </span>
                            </div>
                        ))}
                        {unscheduledTasks.length === 0 && (
                            <div className="h-full flex items-center justify-center">
                                <p className="text-sm text-slate-300">All tasks scheduled</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Weekly grid */}
                <div className="flex-1 w-full overflow-x-auto border border-slate-200 rounded-3xl bg-white shadow-sm">
                    <div className="min-w-[1200px] flex flex-col h-[780px] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

                        {/* Header row */}
                        <div className="grid grid-cols-[100px_repeat(7,1fr)] sticky top-0 z-20 bg-slate-800 text-white rounded-t-3xl overflow-hidden">
                            <div className="h-16 flex items-center justify-center text-[10px] font-medium uppercase tracking-widest opacity-40 border-r border-white/10" />
                            {DAYS.map((day, i) => (
                                <div key={day} className="h-16 flex flex-col items-center justify-center border-r border-white/10">
                                    <span className="text-[10px] font-medium uppercase tracking-widest opacity-40 mb-0.5">{day}</span>
                                    <span className="text-xl font-semibold">{getDayLabel(i).date}</span>
                                </div>
                            ))}
                        </div>

                        {/* Time grid */}
                        <div className="relative flex-1 grid grid-cols-[100px_repeat(7,1fr)]">
                            {/* Time column */}
                            <div className="border-r border-slate-100">
                                {HOURS.map(hour => (
                                    <div key={hour} className="h-24 border-b border-slate-50 flex items-center justify-center">
                                        <span className="text-[10px] font-medium text-slate-300">{hour}:00</span>
                                    </div>
                                ))}
                            </div>

                            {/* Day columns */}
                            {DAYS.map((_, dayIndex) => {
                                const dayTimestamp = getDayLabel(dayIndex).timestamp;
                                return (
                                    <div key={dayIndex} className="relative border-r border-slate-100 last:border-r-0">
                                        {HOURS.map(hour => (
                                            <div
                                                key={hour}
                                                onDragOver={(e) => e.preventDefault()}
                                                onDrop={(e) => onDropOnCalendar(e, dayTimestamp + hour * 3600000)}
                                                className="h-24 border-b border-slate-50 hover:bg-indigo-50/30 transition-colors"
                                            />
                                        ))}

                                        {/* Scheduled tasks */}
                                        {allActiveTasks
                                            .filter(t => t.scheduledTime && t.scheduledTime >= dayTimestamp && t.scheduledTime < dayTimestamp + 24 * 3600000)
                                            .map(task => {
                                                const h = new Date(task.scheduledTime!).getHours();
                                                const mId = memories.find(m => m.actions?.some(a => a.id === task.id))?.id || '';
                                                return (
                                                    <div
                                                        key={task.id}
                                                        onClick={() => setSelectedTask({ memoryId: mId, task })}
                                                        className="absolute left-1.5 right-1.5 p-2.5 rounded-xl border border-slate-200 bg-white shadow-sm cursor-pointer hover:border-slate-400 hover:shadow transition-all z-10"
                                                        style={{ top: `${(h - 7) * 96}px`, height: '80px' }}
                                                    >
                                                        <p className="text-[11px] font-semibold text-slate-800 leading-snug line-clamp-2">{task.text}</p>
                                                    </div>
                                                );
                                            })
                                        }

                                        {/* External events */}
                                        {externalEvents
                                            .filter(e => e.start >= dayTimestamp && e.start < dayTimestamp + 24 * 3600000)
                                            .map(evt => {
                                                const h = new Date(evt.start).getHours();
                                                const durationHours = (evt.end - evt.start) / 3600000;
                                                return (
                                                    <div
                                                        key={evt.id}
                                                        className="absolute left-1.5 right-1.5 p-2 rounded-xl opacity-30 pointer-events-none border border-dashed border-slate-300 bg-slate-100"
                                                        style={{ top: `${(h - 7) * 96}px`, height: `${durationHours * 96}px`, zIndex: 5 }}
                                                    >
                                                        <p className="text-[9px] font-medium text-slate-600 leading-tight italic">{evt.summary}</p>
                                                    </div>
                                                );
                                            })
                                        }
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
