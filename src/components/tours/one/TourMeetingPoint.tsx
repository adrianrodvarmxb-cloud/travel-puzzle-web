'use client';

import dynamic from 'next/dynamic';
import { useLanguage } from '@/lib/language-context';
import { Card, CardContent } from '@/components/ui/Card';
import { MapPinIcon } from '@/assets/svg';
import { MeetingPoint } from '@/types';
import { parseCoords } from '@/map/lib/coords';

const MeetingPointMap = dynamic(() => import('@/components/map/MeetingPointMap').then((m) => m.MeetingPointMap), { ssr: false });

interface TourMeetingPointProps {
    meetingPoint: MeetingPoint;
}

/** Punto de encuentro con mapa y botón "Cómo llegar" (abre Google Maps). */
export function TourMeetingPoint({ meetingPoint }: TourMeetingPointProps) {
    const { t } = useLanguage();
    const point = parseCoords(meetingPoint.coordinates);
    const directions = point
        ? `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}${meetingPoint.googlePlaceId ? `&destination_place_id=${encodeURIComponent(meetingPoint.googlePlaceId)}` : ''}`
        : null;

    return (
        <Card>
            <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-4">{t('tours.meetingPoint')}</h2>
                <div className="flex items-start gap-2 mb-4">
                    <MapPinIcon className="w-5 h-5 text-[#EAF54F] mt-0.5 shrink-0" />
                    <p className="font-medium">{meetingPoint.title}</p>
                </div>
                {point && <MeetingPointMap point={point} label={meetingPoint.title} />}
                {directions && (
                    <a href={directions} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#008DFF] px-5 py-3 font-semibold text-[#7CC4FF] hover:bg-[#008DFF] hover:text-white">
                        {t('tours.directions', 'Get directions')} →
                    </a>
                )}
            </CardContent>
        </Card>
    );
}
