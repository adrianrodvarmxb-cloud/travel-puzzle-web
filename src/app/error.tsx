'use client';
import { ErrorScreen } from '@/components/common/ErrorScreen';

/** REQ-028 — si una página falla, se muestra la pantalla Travel Puzzle, no "Application error". */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return <ErrorScreen error={error} reset={reset} source="page" />;
}
