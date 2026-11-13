import { NextResponse } from 'next/server';
import { requestInputSchema } from '@/trips/schemas/request';
import { startDirectBuy } from '@/trips/direct-buy';
import { buyDeps, directBuyEnabled } from '@/trips/direct-buy-deps';

export const dynamic = 'force-dynamic';

/** REQ-3533: «Reservar y pagar» desde la ficha: cobro automático del total, sin aprobación. */
export async function POST(request: Request) {
    if (!directBuyEnabled()) return NextResponse.json({ error: 'No disponible' }, { status: 404 });
    const parsed = requestInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success || parsed.data.kind !== 'reserva') {
        const first = parsed.success ? null : parsed.error.issues[0];
        return NextResponse.json({ error: first?.path.includes('website') ? 'No se pudo enviar' : first?.message && !first.message.startsWith('Invalid') ? first.message : 'Revisa los datos del formulario' }, { status: 400 });
    }
    const r = await startDirectBuy(parsed.data, buyDeps());
    if (r.ok) return NextResponse.json({ url: r.url, ref: r.ref });
    return NextResponse.json({ error: r.error }, { status: r.code === 'stripe_error' || r.code === 'no_fx' ? 503 : 409 });
}
