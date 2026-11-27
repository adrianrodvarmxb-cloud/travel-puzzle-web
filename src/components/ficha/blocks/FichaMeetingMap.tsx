'use client';
import dynamic from 'next/dynamic';
import type { MeetingView } from '@/ficha/lib/practical-view';

const MeetingPointMap = dynamic(() => import('@/components/map/MeetingPointMap').then((m) => m.MeetingPointMap), { ssr: false });

/**
 * REQ-10860 · Mapa del bloque 11 para la plantilla única: punto exacto → pin; zona → círculo de «Zona aproximada»
 * (decisión 28, REQ-10736). Recibe la vista ya decidida en el servidor (`meetingView`); con solo texto no pinta nada.
 * Es el mismo mapa de cliente de la ficha de hoy (`MeetingPointMap`), cargado sin SSR.
 */
export function FichaMeetingMap({ view, label }: { view: MeetingView | null; label: string }) {
    if (!view || view.kind === 'text') return null;
    return (
        <div data-mapa={view.kind} className="mb-4 h-56 overflow-hidden rounded-xl">
            <MeetingPointMap point={{ lat: view.lat, lng: view.lng }} label={view.title ?? label} radiusM={view.kind === 'zone' ? view.radiusM : undefined} />
        </div>
    );
}
