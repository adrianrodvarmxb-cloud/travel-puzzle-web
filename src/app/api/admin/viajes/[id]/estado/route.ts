import { NextResponse } from 'next/server';
import { tripStatusSchema } from '@/trips/schemas/trip';
import { setTripStatus } from '@/trips/manage';
import { requireAdmin, tripRepo } from '@/trips/deps';

export const dynamic = 'force-dynamic';

/** Publica, oculta o regresa a borrador un viaje (nunca se borra). Solo ADMIN. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await requireAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id } = await params;
    const parsed = tripStatusSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    const r = await setTripStatus(id, parsed.data.status, tripRepo());
    return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: 409 });
}
