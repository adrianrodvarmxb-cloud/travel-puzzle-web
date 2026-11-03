import { TripForm, emptyTrip } from '@/components/admin/trips';
import { tripRepo } from '@/trips/deps';

export default async function NewTripPage() {
    return (
        <>
            <h1 className="font-display mb-8 text-4xl font-bold text-white">Nuevo viaje</h1>
            <TripForm initial={emptyTrip} id={null} agencies={await tripRepo().listAgencies()} />
        </>
    );
}
