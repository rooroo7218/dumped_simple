import React from 'react';
import { ChatMessage } from '../types';
import {
    ChatBubbleLeftRightIcon,
    PaperAirplaneIcon
} from '@heroicons/react/24/outline';

interface CoachHubProps {
    chatMessages: ChatMessage[];
    isChatLoading: boolean;
    chatInput: string;
    setChatInput: (val: string) => void;
    handleSendChatMessage: () => void;
    chatScrollRef: React.RefObject<HTMLDivElement>;
    themeClasses: {
        panel: string;
    };
}

export const CoachHub: React.FC<CoachHubProps> = ({
    chatMessages,
    isChatLoading,
    chatInput,
    setChatInput,
    handleSendChatMessage,
    chatScrollRef,
}) => {
    return (
        <section className="animate-in fade-in max-w-3xl mx-auto space-y-6 pb-20">

            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <ChatBubbleLeftRightIcon className="w-4 h-4 text-slate-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Coach</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Ideas &amp; guidance.</h2>
            </div>

            {/* Chat area */}
            <div className="bg-white/70 border border-slate-200 backdrop-blur-md rounded-3xl shadow-sm flex flex-col h-[55vh] md:h-[600px]">

                {/* Messages */}
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4" style={{ scrollbarWidth: 'none' }}>
                    {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed ${
                                msg.role === 'user'
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-slate-100 text-slate-800'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isChatLoading && (
                        <div className="flex justify-start">
                            <div className="px-4 py-3 rounded-2xl bg-slate-100">
                                <div className="flex gap-1.5 items-center h-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-100" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-200" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="px-4 pb-4 border-t border-slate-100 pt-3 flex gap-2">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                        placeholder="Ask for a suggestion…"
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-300"
                    />
                    <button
                        onClick={handleSendChatMessage}
                        disabled={isChatLoading || !chatInput.trim()}
                        className="px-4 py-2.5 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-40 bg-slate-900 text-white"
                    >
                        <PaperAirplaneIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </section>
    );
};
