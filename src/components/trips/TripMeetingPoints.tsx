'use client';
/* eslint-disable @next/next/no-img-element */
import { MeetingPointMap } from '@/components/map/MeetingPointMap';
import { mapsUrl } from '@/trips/lib/maps';

interface Point { name: string; address: string; lat: number | null; lng: number | null; instructions: string; photo: string | null }

/** Puntos de encuentro con mapa, foto e indicaciones. */
export function TripMeetingPoints({ points, hotelPickup, endPoint, c }: { points: Point[]; hotelPickup: boolean; endPoint: string; c: { hotel: string; endPoint: string; seeMap: string } }) {
    return (
        <div className="space-y-5">
            {points.map((p, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-white/10 bg-[#121D45]">
                    {p.lat !== null && p.lng !== null && <div className="h-56"><MeetingPointMap point={{ lat: p.lat, lng: p.lng }} label={p.name} /></div>}
                    <div className="flex gap-4 p-4">
                        {p.photo && <img src={p.photo} alt="" className="h-20 w-28 shrink-0 rounded-lg object-cover" />}
                        <div>
                            <p className="font-semibold text-white">{p.name}</p>
                            {p.address && <p className="text-sm text-[#A9B6D6]">{p.address}</p>}
                            {p.instructions && <p className="mt-1 text-sm text-[#D5DCEE]">{p.instructions}</p>}
                            {p.lat !== null && p.lng !== null && <a href={mapsUrl(p.lat, p.lng)} target="_blank" rel="noopener" className="mt-1 inline-block text-sm text-[#7CC4FF] underline">{c.seeMap}</a>}
                        </div>
                    </div>
                </div>
            ))}
            {hotelPickup && <p className="text-sm text-[#D5DCEE]">🏨 {c.hotel}</p>}
            {endPoint && <p className="text-sm text-[#D5DCEE]">🏁 {c.endPoint}: {endPoint}</p>}
        </div>
    );
}
