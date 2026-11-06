'use client';
import { useEffect } from 'react';
import { reportClientError } from '@/ops/reportClientError';

/** REQ-221 — escucha errores no atrapados del navegador (window y promesas) y los reporta. No pinta nada. */
export function ClientErrorListener() {
    useEffect(() => {
        const onError = (e: ErrorEvent) => reportClientError(e.error ?? e.message, 'window');
        const onRejection = (e: PromiseRejectionEvent) => reportClientError(e.reason, 'promise');
        window.addEventListener('error', onError);
        window.addEventListener('unhandledrejection', onRejection);
        return () => {
            window.removeEventListener('error', onError);
            window.removeEventListener('unhandledrejection', onRejection);
        };
    }, []);
    return null;
}
