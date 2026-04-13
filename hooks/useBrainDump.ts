import React, { useState, useRef, useCallback } from 'react';
import { MemoryItem, ActionItem, UserPersona } from '../types';
import { processBrainDump } from '../services/geminiService';
import { databaseService } from '../services/databaseService';

export const useBrainDump = (
    memories: MemoryItem[],
    persona: UserPersona,
    setMemories: React.Dispatch<React.SetStateAction<MemoryItem[]>>,
    onCommitSuccess: () => void,
    setAiStatus: (status: 'idle' | 'processing' | 'error' | 'success') => void,
    setLastAiError: (error: string | null) => void,
    showToast: (message: string, variant?: 'success' | 'info' | 'error', sub?: string) => void,
    onProfileUpdate?: (content: string) => void
) => {
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleBrainDumpSubmit = useCallback(async () => {
        if (isProcessing || !input.trim()) return;

        const currentInput = input;
        const dumpId = crypto.randomUUID();
        const timestamp = Date.now();

        // 1. CLEAR IMMEDIATELY (v3 Ritual)
        setInput('');
        setIsProcessing(true);
        setAiStatus('processing');
        setLastAiError(null);

        try {
            // 2. SAVE RAW DUMP FIRST
            const rawDump: MemoryItem = {
                id: dumpId,
                timestamp,
                content: currentInput,
                source: 'text',
                priority: 'medium',
                tags: [],
                processed: false,
                category: 'General'
            };
            await databaseService.saveMemory(rawDump);

            // 3. FETCH ACTIVE ITEMS FOR CONTEXT
            const activeItems = await databaseService.loadItems();
            const uncompletedItems = activeItems.filter(i => !i.isCompleted);

            // 4. CALL AI FOR DEDUPLICATION
            const response = await fetch('/api/gemini/brain-dump', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    input: currentInput,
                    activeItems: uncompletedItems
                })
            });

            if (!response.ok) throw new Error('AI processing failed');
            const result = await response.json();

            // 5. PROCESS RESULTS (Assign/Create)
            await databaseService.processDumpResult(dumpId, result.results);

            setAiStatus('success');
            setTimeout(() => setAiStatus('idle'), 3000);
            
            // Notify UI to refresh (e.g. MemoryGrid)
            onCommitSuccess();

        } catch (e: any) {
            console.error("❌ Brain Dump processing failed:", e);
            setAiStatus('error');
            setLastAiError(e.message || "Failed to process brain dump.");
        } finally {
            setIsProcessing(false);
        }
    }, [input, isProcessing, onCommitSuccess, setAiStatus, setLastAiError]);


    const [isListening, setIsListening] = useState(false);

    const startSpeechToText = (onResult: (text: string) => void) => {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        if (!SpeechRecognition) return;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            onResult(transcript);
        };
        recognition.start();
    };

    return {
        input,
        setInput,
        isProcessing,
        handleBrainDumpSubmit,
        startSpeechToText,
        isListening
    };
};


