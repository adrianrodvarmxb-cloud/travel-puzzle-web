'use client';
import { useEffect } from 'react';
import { TransfersWidget } from '@/components/transfers/TransfersWidget';

/**
 * REQ-120: panel con nuestro estilo que contiene el buscador de traslados (Kiwitaxi).
 * Solo se abre al tocar «Agregar traslado» o «Buscar traslado»; nunca es una sección suelta.
 */
export function TransferPanel({ src, chargedBy, onClose }: { src: string; chargedBy: string; onClose: () => void }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (
        <div role="dialog" aria-modal="true" aria-labelledby="panel-traslado" className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 md:items-center" onClick={onClose}>
            <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-[#0A1330] p-4 md:max-w-2xl md:rounded-2xl md:p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p id="panel-traslado" className="text-lg font-semibold text-white">Agrega tu traslado</p>
                        <p className="text-sm text-slate-300">{chargedBy} · precios en dólares (USD)</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Cerrar" className="min-h-11 min-w-11 rounded-full text-2xl leading-none text-white hover:bg-white/10">×</button>
                </div>
                <div className="mt-4 rounded-xl bg-white p-2 md:p-4">
                    <TransfersWidget src={src} />
                </div>
            </div>
        </div>
    );
}
