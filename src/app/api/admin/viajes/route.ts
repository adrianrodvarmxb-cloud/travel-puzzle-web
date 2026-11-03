import { NextResponse } from 'next/server';
import { tripInputSchema } from '@/trips/schemas/trip';
import { saveTrip } from '@/trips/manage';
import { requireAdmin, tripRepo } from '@/trips/deps';

export const dynamic = 'force-dynamic';

/** Crea un viaje (queda en borrador). Solo ADMIN. */
export async function POST(request: Request) {
    if (!(await requireAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const parsed = tripInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Revisa los datos del viaje', details: parsed.error.flatten() }, { status: 400 });
    const r = await saveTrip(null, parsed.data, tripRepo());
    return r.ok ? NextResponse.json({ id: r.trip.id }) : NextResponse.json({ error: r.error }, { status: 409 });
}
