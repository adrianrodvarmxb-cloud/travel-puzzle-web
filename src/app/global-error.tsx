'use client';
import { ErrorScreen } from '@/components/common/ErrorScreen';

/** REQ-028 — si falla el layout raíz, igual se muestra la pantalla Travel Puzzle. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <html lang="es">
            <body style={{ margin: 0 }}>
                <ErrorScreen error={error} reset={reset} source="global" />
            </body>
        </html>
    );
}
