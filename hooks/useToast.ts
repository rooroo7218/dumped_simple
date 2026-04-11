import { useState, useCallback } from 'react';

export type ToastVariant = 'success' | 'info' | 'error';

export interface Toast {
    id: string;
    message: string;
    sub?: string;
    variant: ToastVariant;
}

export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, variant: ToastVariant = 'info', sub?: string) => {
        const id = crypto.randomUUID();
        setToasts(prev => [...prev, { id, message, sub, variant }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return { toasts, showToast, dismissToast };
}
