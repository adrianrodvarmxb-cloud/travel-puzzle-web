import { NextResponse } from 'next/server';
import { requestInputSchema } from '@/trips/schemas/request';
import { submitRequest } from '@/trips/requests';
import { anyTripsVisible, requestDeps } from '@/trips/public-load';

export const dynamic = 'force-dynamic';

/** Solicitud de cotización desde la ficha del viaje (gate M). */
export async function POST(request: Request) {
    if (!anyTripsVisible()) return NextResponse.json({ error: 'No disponible' }, { status: 404 });
    const parsed = requestInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        const first = parsed.error.issues[0];
        return NextResponse.json({ error: first?.path.includes('website') ? 'No se pudo enviar' : first?.message && !first.message.startsWith('Invalid') ? first.message : 'Revisa los datos del formulario' }, { status: 400 });
    }
    const r = await submitRequest(parsed.data, await requestDeps());
    return r.ok ? NextResponse.json({ ref: r.ref }) : NextResponse.json({ error: r.error }, { status: 409 });
}
