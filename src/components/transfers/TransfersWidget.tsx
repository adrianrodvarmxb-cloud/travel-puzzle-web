'use client';
import { useEffect, useRef } from 'react';

/**
 * REQ-028: monta el buscador de traslados dentro de su contenedor (el script de Travelpayouts
 * pinta junto a donde se inserta). Se inserta en el navegador para no afectar la hidratación (INC-001).
 */
export function TransfersWidget({ src }: { src: string }) {
    const box = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = box.current;
        if (!el || el.querySelector('script')) return;
        const s = document.createElement('script');
        s.async = true;
        s.src = src;
        s.charset = 'utf-8';
        el.appendChild(s);
    }, [src]);
    return <div ref={box} className="min-h-[320px] w-full" aria-label="Buscador de traslados" />;
}
