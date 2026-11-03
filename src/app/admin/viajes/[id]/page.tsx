import { notFound } from 'next/navigation';
import { TripForm, StatusButtons } from '@/components/admin/trips';
import { tripRepo } from '@/trips/deps';

export default async function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
    const repo = tripRepo();
    const trip = await repo.findById((await params).id);
    if (!trip) notFound();
    const { id, slug: _slug, status, ...initial } = trip;
    const clean = Object.fromEntries(Object.entries(initial).filter(([k]) => !['createdAt', 'updatedAt'].includes(k))) as typeof initial;
    return (
        <>
            <h1 className="font-display text-4xl font-bold text-white">{trip.titleEs}</h1>
            <div className="mb-8 mt-4"><StatusButtons id={id} status={status} /></div>
            <TripForm initial={clean} id={id} agencies={await repo.listAgencies()} />
        </>
    );
}
