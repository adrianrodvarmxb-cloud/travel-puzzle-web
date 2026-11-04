'use client';
import { useEffect, useState } from 'react';
import { errorScreenText } from '@/ops/lib/clientError';
import { reportClientError } from '@/ops/reportClientError';

const WHATSAPP = '5215536490320';

function readLang(): string | undefined {
    try {
        return document.cookie.split('; ').find((c) => c.startsWith('preferredLanguage='))?.split('=')[1];
    } catch {
        return undefined;
    }
}

/**
 * REQ-028 — pantalla de error con cara Travel Puzzle (en lugar de "Application error").
 * Usa solo estilos en línea para funcionar aunque falle el resto de la app (global-error).
 */
export function ErrorScreen({ error, reset, source }: { error: Error & { digest?: string }; reset: () => void; source: string }) {
    const [lang, setLang] = useState<string | undefined>(undefined);
    useEffect(() => {
        setLang(readLang());
        reportClientError(error, source, error.digest);
    }, [error, source]);
    const t = errorScreenText(lang);
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A1330', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ maxWidth: 420, width: '100%', textAlign: 'center', color: '#fff' }}>
                <p style={{ fontSize: 12, letterSpacing: '0.2em', color: '#9AAEE0', textTransform: 'uppercase', margin: 0 }}>Travel Puzzle</p>
                <h1 style={{ fontSize: 24, fontWeight: 700, margin: '8px 0 0' }}>{t.title}</h1>
                <p style={{ fontSize: 14, color: '#C9D6F5', marginTop: 12 }}>{t.body}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
                    <button onClick={reset} style={{ background: '#C12909', color: '#fff', border: 0, borderRadius: 12, padding: '12px 20px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>{t.retry}</button>
                    <a href="/" style={{ border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 12, padding: '12px 20px', fontWeight: 600, textDecoration: 'none' }}>{t.home}</a>
                </div>
                <a href={`https://wa.me/${WHATSAPP}`} style={{ display: 'inline-block', marginTop: 20, fontSize: 14, color: '#C9D6F5' }}>{t.help}</a>
            </div>
        </div>
    );
}
