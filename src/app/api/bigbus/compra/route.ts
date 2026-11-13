import { NextResponse } from 'next/server';
import { purchaseInputSchema } from '@/octo/lib/purchase';
import { purchaseErrorMessage } from '@/octo/lib/public-view';
import { purchaseDeps } from '@/octo/deps';
import { startPurchase } from '@/octo/purchase';

export const dynamic = 'force-dynamic';

/** REQ-3418, REQ-3423: aparta en Big Bus y devuelve el enlace de Stripe. Sin bandera responde 404. */
export async function POST(request: Request) {
    const body = await request.json().catch(() => null);
    const parsed = purchaseInputSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Revisa tus datos: nombre, correo, teléfono y aviso de privacidad.' }, { status: 400 });
    const r = await startPurchase(parsed.data, purchaseDeps());
    if (r.ok) return NextResponse.json({ url: r.url, ref: r.ref });
    const m = purchaseErrorMessage(r.code);
    return NextResponse.json({ error: m.message, code: r.code }, { status: m.status });
}
