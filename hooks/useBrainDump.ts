import React, { useState, useCallback } from 'react';
import { MemoryItem, ActionItem, UserPersona } from '../types';
import { processBrainDump, processBrainDumpV3 } from '../services/geminiService';
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

        // 1. CLEAR + NAVIGATE IMMEDIATELY — don't make user wait for AI
        setInput('');
        setAiStatus('processing');
        setLastAiError(null);
        onCommitSuccess(); // navigate to grid now

        setIsProcessing(true);
        try {
            // 2. SAVE RAW DUMP
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
            const result = await processBrainDumpV3(
                currentInput,
                uncompletedItems.map(i => ({ id: i.id, label: i.label }))
            );

            // 5. PROCESS RESULTS (Assign/Create)
            await databaseService.processDumpResult(dumpId, result.results);

            setAiStatus('success');
            setTimeout(() => setAiStatus('idle'), 3000);

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


