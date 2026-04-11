
import React from 'react';
import { MemoryItem } from '../types';

interface MemoryCardProps {
  memory: MemoryItem;
}

const MemoryCard: React.FC<MemoryCardProps> = ({ memory }) => {
  const priorityStyles = {
    high: 'bg-rose-50 text-rose-600 border-rose-200',
    medium: 'bg-orange-50 text-orange-600 border-orange-200',
    low: 'bg-emerald-50 text-emerald-600 border-emerald-200'
  };

  return (
    <div className="glass-panel bento-card p-6 mb-5 relative group bg-white/80">
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-2">
          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${priorityStyles[memory.priority]}`}>
            {memory.priority}
          </span>
          <span className="text-[10px] bg-slate-100 text-slate-500 font-black uppercase tracking-widest px-3 py-1 rounded-full border border-slate-200">
            {memory.category}
          </span>
        </div>
        <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
          {new Date(memory.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </span>
      </div>
      <p className="text-slate-800 text-lg font-medium leading-tight mb-6">
        {memory.content}
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        {memory.tags.map(tag => (
          <span key={tag} className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
            #{tag}
          </span>
        ))}
        {memory.mood && (
          <span className="text-[11px] font-bold text-slate-500 px-3 py-1 rounded-lg border border-slate-100 ml-auto uppercase tracking-tighter">
            mood: {memory.mood}
          </span>
        )}
      </div>
    </div>
  );
};

export default MemoryCard;
