import React, { useState, useCallback } from 'react';
import { MemoryItem, ActionItem, UserPersona } from '../types';
import { processBrainDumpV3 } from '../services/geminiService';
import { databaseService } from '../services/databaseService';

const THINKING_COPY = [
  'flibbergasting the thoughts...',
  'untangling the spaghetti...',
  'rummaging around in there...',
  'squinting at this really hard...',
  'wrangling your brain dump...',
  'chewing on it...',
  'having a good think...',
  'sorting the pile...',
  'piecing it together...',
  'making sense of the chaos...',
];

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
    const [thinkingCopy, setThinkingCopy] = useState('');
    const recognitionRef = React.useRef<any>(null);

    React.useEffect(() => {
        let interval: any;
        if (isProcessing) {
            setThinkingCopy(THINKING_COPY[Math.floor(Math.random() * THINKING_COPY.length)]);
            interval = setInterval(() => {
                setThinkingCopy(prev => {
                    let next = prev;
                    while (next === prev) {
                        next = THINKING_COPY[Math.floor(Math.random() * THINKING_COPY.length)];
                    }
                    return next;
                });
            }, 2500);
        } else {
            setThinkingCopy('');
        }
        return () => clearInterval(interval);
    }, [isProcessing]);

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
            setThinkingCopy('');
        }
    }, [input, isProcessing, onCommitSuccess, setAiStatus, setLastAiError]);


    const [isListening, setIsListening] = useState(false);

    const startSpeechToText = (onResult: (text: string) => void) => {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        if (!SpeechRecognition) return;

        if (isListening) {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {
                    console.warn("Error stopping recognition:", e);
                }
            }
            setIsListening(false);
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';
            
            let finalTranscript = '';

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onend = () => {
                setIsListening(false);
                recognitionRef.current = null;
            };

            recognition.onerror = (event: any) => {
                console.error("Speech recognition error:", event.error);
                setIsListening(false);
                recognitionRef.current = null;
                if (event.error === 'not-allowed') {
                    showToast("Microphone permission denied. Please allow microphone access in settings.", "error");
                }
            };

            recognition.onresult = (event: any) => {
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript + ' ';
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                onResult(finalTranscript + interimTranscript);
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (err) {
            console.error("Failed to start speech recognition:", err);
            setIsListening(false);
            recognitionRef.current = null;
        }
    };

    return {
        input,
        setInput,
        isProcessing,
        handleBrainDumpSubmit,
        startSpeechToText,
        isListening,
        thinkingCopy
    };
};


