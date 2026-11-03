import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TripForm, StatusButtons } from '@/components/admin/trips';
import { tripRepo } from '@/trips/deps';
import { tripInputSchema } from '@/trips/schemas/trip';

export default async function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
    const repo = tripRepo();
    const trip = await repo.findById((await params).id);
    if (!trip) notFound();
    // Solo los campos del formulario (los viajes v1 se completan con los valores por defecto).
    const parsed = tripInputSchema.safeParse({ ...trip, countries: trip.countries.filter((c) => /^[A-Z]{2}$/.test(c)) });
    const initial = parsed.success ? parsed.data : tripInputSchema.parse({ kind: trip.kind, purchaseMode: trip.purchaseMode, titleEs: trip.titleEs });
    return (
        <>
            <h1 className="font-display text-4xl font-bold text-white">{trip.titleEs}</h1>
            <div className="mb-8 mt-4 flex flex-wrap items-center gap-3">
                <StatusButtons id={trip.id} status={trip.status} />
                <Link href={`/admin/viajes/${trip.id}/traducciones`} className="rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-semibold text-white hover:border-white/50">🌐 Traducciones</Link>
            </div>
            <TripForm initial={initial} id={trip.id} agencies={await repo.listAgencies()} savedCode={trip.code} codeLocked={trip.codeLocked} />
        </>
    );
}
