import Link from 'next/link';
import { tripRepo } from '@/trips/deps';
import { KIND_LABEL, STATUS_LABEL, type TripKind, type TripStatus } from '@/trips/lib/trip';

/** Lista de viajes (los ocultos también: nunca se borran). */
export default async function TripsAdminPage() {
    const trips = await tripRepo().list();
    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="font-display text-4xl font-bold text-white">Viajes</h1>
                <Link href="/admin/viajes/nuevo" className="rounded-full bg-[#008DFF] px-5 py-2.5 text-sm font-bold text-white">+ Nuevo viaje</Link>
            </div>
            <p className="mt-2 text-sm text-[#A9B6D6]">Propios y de agencias. Todavía no se muestran en el sitio público.</p>
            <ul className="mt-8 space-y-3">
                {trips.length === 0 && <li className="text-[#A9B6D6]">Aún no hay viajes.</li>}
                {trips.map((t) => (
                    <li key={t.id}>
                        <Link href={`/admin/viajes/${t.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 hover:border-white/30">
                            <span>
                                <span className="block font-semibold text-white">{t.titleEs}</span>
                                <span className="font-data text-[11px] uppercase tracking-wider text-[#7F8DB0]">
                                    {t.code} · {KIND_LABEL[t.kind as TripKind] ?? t.kind} · {t.agencyName ?? 'Travel Puzzle'}{t.countries.length ? ` · ${t.countries.join(', ')}` : ''}
                                </span>
                            </span>
                            <span className="font-data rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-wider text-[#D5DCEE]">{STATUS_LABEL[t.status as TripStatus] ?? t.status}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </>
    );
}
