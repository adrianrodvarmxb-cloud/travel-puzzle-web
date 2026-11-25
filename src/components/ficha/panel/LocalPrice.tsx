'use client';
import { useEffect, useState } from 'react';

/**
 * REQ-10874 · Precio en la moneda del visitante, fuera del HTML en caché (ola 9, decisión 32). El servidor pinta el
 * precio en la moneda del proveedor (igual para todos, porque el borde guarda la página 5 minutos, REQ-3318); con
 * `LOCAL_CURRENCY_ENABLED` el panel trae `localUrl` y este componente, ya en el navegador, pide `/api/precio-local`
 * (ahí el borde sabe el país) y reemplaza el texto. Si la ruta falla, no responde o está apagada, se queda el texto
 * del servidor: nunca un precio vacío ni inventado. Sin `Intl` ni fechas al pintar (INC-001): el texto llega hecho.
 */
export function LocalPrice({ text, localUrl }: { text: string; localUrl: string | null | undefined }) {
    const [shown, setShown] = useState(text);
    useEffect(() => {
        if (!localUrl) return;
        const ctrl = new AbortController();
        fetch(localUrl, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
            .then((r) => (r.ok ? r.json() : null))
            .then((j: { text?: unknown } | null) => { if (j && typeof j.text === 'string' && j.text) setShown(j.text); })
            .catch(() => {});
        return () => ctrl.abort();
    }, [localUrl]);
    return <span data-precio-local={localUrl ? (shown === text ? 'servidor' : 'visitante') : undefined}>{shown}</span>;
}
