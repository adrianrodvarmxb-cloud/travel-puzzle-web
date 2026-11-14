import { NextResponse } from 'next/server';
import { requestInputSchema } from '@/trips/schemas/request';
import { submitRequest } from '@/trips/requests';
import { anyTripsVisible, requestDeps } from '@/trips/public-load';
import { startRequestHold } from '@/payments/hold';
import { holdDeps } from '@/payments/deps';

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
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 409 });
    // REQ-3482: con STRIPE_HOLD_ENABLED la solicitud sigue al checkout con la tarjeta en retención; apagada, todo igual que hoy.
    const hold = await startRequestHold(r.ref, holdDeps());
    return NextResponse.json(hold ? { ref: r.ref, checkoutUrl: hold.url } : { ref: r.ref });
}
