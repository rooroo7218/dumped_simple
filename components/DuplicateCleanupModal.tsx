import React, { useState } from 'react';
import { ActionItem, DuplicateGroup } from '../types';
import {
    XMarkIcon,
    ArrowPathRoundedSquareIcon,
    TrashIcon,
    CheckCircleIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';

interface DuplicateCleanupModalProps {
    groups: DuplicateGroup[];
    onClose: () => void;
    onResolve: (groupId: string, masterTaskId: string, taskIdsToDelete: string[]) => void;
}

export const DuplicateCleanupModal: React.FC<DuplicateCleanupModalProps> = ({
    groups,
    onClose,
    onResolve,
}) => {
    const [activeGroups, setActiveGroups] = useState(groups);

    const handleResolveGroup = (groupId: string, masterTaskId: string) => {
        const group = activeGroups.find(g => g.id === groupId);
        if (!group) return;

        const taskIdsToDelete = group.tasks
            .filter(t => t.id !== masterTaskId)
            .map(t => t.id);

        onResolve(groupId, masterTaskId, taskIdsToDelete);
        setActiveGroups(prev => prev.filter(g => g.id !== groupId));
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/40 animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden bg-white border-2 border-slate-950 rounded-[28px] shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <ArrowPathRoundedSquareIcon className="w-5 h-5 text-slate-500" />
                        <h2 className="text-[15px] font-semibold text-slate-800">Duplicate Tasks</h2>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            {activeGroups.length} group{activeGroups.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6" style={{ scrollbarWidth: 'none' }}>

                    {/* Hint */}
                    <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
                        <SparklesIcon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <p className="text-[12px] text-slate-500 leading-relaxed">
                            These tasks look similar. Pick the version you want to keep — the others will be removed.
                        </p>
                    </div>

                    {activeGroups.length === 0 ? (
                        <div className="py-16 text-center space-y-3">
                            <CheckCircleIcon className="w-12 h-12 mx-auto text-emerald-400" />
                            <p className="text-[15px] font-semibold text-slate-800">All cleaned up</p>
                            <p className="text-[12px] text-slate-400">No more duplicates found.</p>
                            <button
                                onClick={onClose}
                                className="mt-4 px-5 py-2.5 text-[13px] font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-700 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {activeGroups.map((group) => (
                                <div key={group.id}>
                                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3 px-1">
                                        {group.reason}
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {group.tasks.map((task) => (
                                            <div
                                                key={task.id}
                                                onClick={() => handleResolveGroup(group.id, task.id)}
                                                className="group relative flex flex-col gap-3 p-4 rounded-2xl border cursor-pointer transition-all bg-white border-slate-200 hover:border-slate-950 hover:shadow-sm active:scale-[0.98]"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-[13px] font-semibold text-slate-800 leading-snug flex-1">{task.text}</p>
                                                    <div className="shrink-0 w-5 h-5 rounded-full border-2 border-slate-200 group-hover:border-slate-950 group-hover:bg-slate-950 flex items-center justify-center transition-all">
                                                        <CheckCircleIcon className="w-3 h-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                                        {task.category}
                                                    </span>
                                                    {(task.alignmentScore || 0) > 0 && (
                                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                                            Align {task.alignmentScore}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] font-medium text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Keep this one →
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="shrink-0 px-6 py-3 border-t border-slate-100">
                    <p className="text-[11px] text-slate-400 text-center">
                        Tap a task to keep it. The others in the group will be removed.
                    </p>
                </div>
            </div>
        </div>
    );
};
