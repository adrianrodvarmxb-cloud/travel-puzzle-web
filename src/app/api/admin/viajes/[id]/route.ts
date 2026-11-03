import { NextResponse } from 'next/server';
import { tripInputSchema } from '@/trips/schemas/trip';
import { saveTrip } from '@/trips/manage';
import { requireAdmin, tripRepo } from '@/trips/deps';

export const dynamic = 'force-dynamic';

/** Edita un viaje. Solo ADMIN. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await requireAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id } = await params;
    const parsed = tripInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Revisa los datos del viaje', details: parsed.error.flatten() }, { status: 400 });
    const r = await saveTrip(id, parsed.data, tripRepo());
    return r.ok ? NextResponse.json({ id: r.trip.id }) : NextResponse.json({ error: r.error }, { status: 409 });
}
