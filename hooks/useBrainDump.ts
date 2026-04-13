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
    const [scanDraft, setScanDraft] = useState<MemoryItem | null>(null);
    const [input, setInput] = useState('');
    const [selectedImage, setSelectedImage] = useState<{ data: string, mimeType: string } | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const canvasRef = useRef<HTMLDivElement>(null);
    const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const clearImage = useCallback(() => {
        setSelectedImage(null);
        setImagePreview(null);
    }, []);

    const updateDraftTask = useCallback((taskId: string, updates: Partial<ActionItem>) => {
        setScanDraft(prev => {
            if (!prev) return null;
            const updatedActions = (prev.actions || []).map(a => a.id === taskId ? { ...a, ...updates } : a);
            return { ...prev, actions: updatedActions };
        });
    }, []);

    const commitManual = useCallback(async (memory: MemoryItem) => {
        const tasks = memory.actions || [];
        setMemories(prev => [memory, ...prev]);
        await databaseService.saveMemory(memory);
        showToast(`${tasks.length} item${tasks.length !== 1 ? 's' : ''} captured`, 'success');
        onCommitSuccess();
        if (onProfileUpdate) onProfileUpdate(memory.content);
    }, [setMemories, showToast, onCommitSuccess, onProfileUpdate]);

    const handleCommitScan = useCallback(async () => {
        if (!scanDraft) return;
        await commitManual(scanDraft);
        setScanDraft(null);
        setInput('');
        clearImage();
    }, [scanDraft, commitManual, clearImage]);

    const handleBubbleDragStart = (e: React.MouseEvent, taskId: string) => {
        e.preventDefault();
        const task = scanDraft?.actions?.find(a => a.id === taskId);
        if (!task || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const currentX = (task.x || 0) * (rect.width / 100);
        const currentY = (task.y || 0) * (rect.height / 100);
        setDraggingTaskId(taskId);
        setDragOffset({ x: e.clientX - currentX, y: e.clientY - currentY });
    };

    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        if (!draggingTaskId || !scanDraft || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        let newX = ((e.clientX - dragOffset.x) / rect.width) * 100;
        let newY = ((e.clientY - dragOffset.y) / rect.height) * 100;
        newX = Math.max(5, Math.min(85, newX));
        newY = Math.max(5, Math.min(85, newY));
        updateDraftTask(draggingTaskId, { x: newX, y: newY });
    };

    const handleBrainDumpSubmit = useCallback(async () => {
        if (isProcessing || (!input.trim() && !selectedImage)) {
            return;
        }

        const tempId = crypto.randomUUID();
        const optimisticAction: ActionItem = {
            id: tempId,
            text: input || "Scanning...",
            urgency: 5,
            category: "Processing...",
            effort: "low",
            rationale: "Placeholder",
            completed: false,
            x: 50,
            y: 50
        };

        const currentInput = input;
        const currentImage = selectedImage;

        setInput('');
        clearImage();
        setIsProcessing(true);
        setAiStatus('processing');
        setLastAiError(null);

        setScanDraft(prev => {
            if (prev) {
                return { ...prev, actions: [...(prev.actions || []), optimisticAction] };
            }
            return {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                content: currentInput || "Processing...",
                source: (currentImage ? 'camera' : 'text') as any,
                priority: 'medium',
                tags: [],
                processed: false,
                category: 'General',
                actions: [optimisticAction]
            };
        });

        try {
            const result = await processBrainDump(currentInput, memories, persona, currentImage || undefined);

            const newMemId = crypto.randomUUID();
            let newActions = (result.actions || []).map((a: any) => ({
                ...a,
                id: crypto.randomUUID(),
                memoryId: newMemId,
                completed: false,
                steps: [],
                x: Math.max(10, Math.min(80, 15 + Math.random() * 60)),
                y: Math.max(10, Math.min(80, 20 + Math.random() * 50)),
                isNew: true
            }));

            if (newActions.length === 0) {
                newActions = [{
                    id: crypto.randomUUID(),
                    text: result.summary || currentInput || "Thought captured",
                    urgency: 5,
                    category: result.category || "General",
                    effort: "low",
                    rationale: result.error || "Processed",
                    completed: false,
                    x: 50,
                    y: 50,
                    steps: []
                }];
            }

            const finalMemory: MemoryItem = {
                id: newMemId,
                timestamp: Date.now(),
                content: currentInput || "Thought",
                source: (currentImage ? 'camera' : 'text') as any,
                priority: 'medium',
                tags: [],
                processed: true,
                category: result.category || 'General',
                actions: newActions
            };

            setScanDraft(finalMemory);
            setAiStatus('success');
            setTimeout(() => setAiStatus('idle'), 3000);
        } catch (e: any) {
            console.error("❌ Brain Dump processing failed:", e);
            setAiStatus('error');
            const rawMessage = e.message || "Failed to process.";
            setLastAiError(rawMessage);
            
            const fallbackMemId = crypto.randomUUID();
            const fallbackMemory: MemoryItem = {
                id: fallbackMemId,
                timestamp: Date.now(),
                content: currentInput || "Error during processing",
                source: (currentImage ? 'camera' : 'text') as any,
                priority: 'medium',
                tags: ['error-fallback'],
                processed: false,
                category: 'Inbox',
                actions: [{
                    id: crypto.randomUUID(),
                    text: currentInput || "Draft item",
                    urgency: 10,
                    category: "Inbox",
                    effort: "medium",
                    rationale: `Save attempt failed. Raw text captured.`,
                    completed: false,
                    x: 50,
                    y: 50,
                    steps: []
                }]
            };

            await commitManual(fallbackMemory);
            setScanDraft(null);
        } finally {
            setIsProcessing(false);
        }
    }, [input, selectedImage, isProcessing, memories, persona, clearImage, setScanDraft, setInput, setIsProcessing, commitManual]);

    const handleCanvasMouseUp = () => setDraggingTaskId(null);

    const [isListening, setIsListening] = useState(false);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            const base64Data = base64String.split(',')[1];
            setSelectedImage({ data: base64Data, mimeType: file.type });
            setImagePreview(base64String);
        };
        reader.readAsDataURL(file);
    };

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
        scanDraft,
        setScanDraft,
        input,
        setInput,
        selectedImage,
        setSelectedImage,
        imagePreview,
        setImagePreview,
        isProcessing,
        setIsProcessing,
        canvasRef,
        draggingTaskId,
        handleCommitScan,
        updateDraftTask,
        handleBubbleDragStart,
        handleCanvasMouseMove,
        handleCanvasMouseUp,
        clearImage,
        handleBrainDumpSubmit,
        handleImageSelect,
        startSpeechToText,
        isListening
    };
};

