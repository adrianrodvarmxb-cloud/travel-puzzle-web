'use client';

import dynamic from 'next/dynamic';
import { useLanguage } from '@/lib/language-context';
import { Card, CardContent } from '@/components/ui/Card';
import { MapPinIcon } from '@/assets/svg';
import { MeetingPoint } from '@/types';
import { parseCoords } from '@/map/lib/coords';
import type { FichaMapView } from '@/map/lib/city-pin';

const MeetingPointMap = dynamic(() => import('@/components/map/MeetingPointMap').then((m) => m.MeetingPointMap), { ssr: false });

interface TourMeetingPointProps {
    meetingPoint: MeetingPoint;
    /**
     * REQ-10736 (decisión 28): qué pinta el mapa, decidido en el servidor con `fichaMapView` (ZONE_MAP_ENABLED y coordenadas
     * de la ciudad). Sin la prop (ficha de hoy), se usa el punto exacto del tour si lo hay. `null` explícito con un tour sin
     * punto exacto = ni mapa ni botón (nunca un centro inventado).
     */
    fichaMap?: FichaMapView | null;
}

/** Punto de encuentro con mapa y botón "Cómo llegar" (abre Google Maps); sin punto exacto, «Zona aproximada» sin botón. */
export function TourMeetingPoint({ meetingPoint, fichaMap }: TourMeetingPointProps) {
    const { t } = useLanguage();
    const exact = parseCoords(meetingPoint.coordinates);
    // REQ-10736: la vista del servidor manda; sin ella, el comportamiento de siempre (punto exacto o nada).
    const view: FichaMapView | null = fichaMap !== undefined ? fichaMap : exact ? { kind: 'exact', lat: exact.lat, lng: exact.lng, directions: true } : null;
    const directions = view?.kind === 'exact'
        ? `https://www.google.com/maps/dir/?api=1&destination=${view.lat},${view.lng}${meetingPoint.googlePlaceId ? `&destination_place_id=${encodeURIComponent(meetingPoint.googlePlaceId)}` : ''}`
        : null;

    return (
        <Card>
            <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-4">{t('tours.meetingPoint')}</h2>
                <div className="flex items-start gap-2 mb-4">
                    <MapPinIcon className="w-5 h-5 text-[#EAF54F] mt-0.5 shrink-0" />
                    <p className="font-medium">{meetingPoint.title}</p>
                </div>
                {view?.kind === 'exact' && <MeetingPointMap point={{ lat: view.lat, lng: view.lng }} label={meetingPoint.title} />}
                {view?.kind === 'zone' && (
                    <>
                        <MeetingPointMap point={{ lat: view.lat, lng: view.lng }} radiusM={view.radiusM} label={t('tours.approxZone', 'Zona aproximada')} />
                        <p className="mt-3 text-sm text-white/70">
                            {t('tours.approxZone', 'Zona aproximada')}: {t('tours.approxZoneNote', 'el punto exacto se confirma al reservar.')}
                        </p>
                    </>
                )}
                {directions && (
                    <a href={directions} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#008DFF] px-5 py-3 font-semibold text-[#7CC4FF] hover:bg-[#008DFF] hover:text-white">
                        {t('tours.directions', 'Get directions')} →
                    </a>
                )}
            </CardContent>
        </Card>
    );
}
