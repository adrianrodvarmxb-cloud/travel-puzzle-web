import { NextResponse } from 'next/server';
import { z } from 'zod';
import { purchaseDeps } from '@/octo/deps';
import { cancelPurchase } from '@/octo/purchase';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({ ref: z.string().trim().min(5).max(40), email: z.string().trim().email().max(160) });

const MESSAGES = {
    disabled: { status: 404, error: 'No disponible.' },
    not_found: { status: 404, error: 'No encontramos una compra con ese folio y correo.' },
    not_cancellable: { status: 409, error: 'Esta compra ya no se puede cancelar en línea. Escríbenos y te ayudamos.' },
    error: { status: 502, error: 'No pudimos cancelar en este momento. Intenta de nuevo o escríbenos.' },
} as const;

/** REQ-3421: el cliente cancela su compra directa de Big Bus (folio + correo). */
export async function POST(request: Request) {
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Escribe tu folio y tu correo.' }, { status: 400 });
    const r = await cancelPurchase(parsed.data, purchaseDeps());
    if (r === 'cancelled') return NextResponse.json({ ok: true });
    const m = MESSAGES[r];
    return NextResponse.json({ error: m.error }, { status: m.status });
}
