import { useState, useCallback } from 'react';

interface ConfirmState {
    message: string;
    sub?: string;
    resolve: (value: boolean) => void;
}

export function useConfirm() {
    const [state, setState] = useState<ConfirmState | null>(null);

    const confirm = useCallback((message: string, sub?: string): Promise<boolean> => {
        return new Promise((resolve) => {
            setState({ message, sub, resolve });
        });
    }, []);

    const handleConfirm = useCallback(() => {
        state?.resolve(true);
        setState(null);
    }, [state]);

    const handleCancel = useCallback(() => {
        state?.resolve(false);
        setState(null);
    }, [state]);

    return { confirmState: state, confirm, handleConfirm, handleCancel };
}
