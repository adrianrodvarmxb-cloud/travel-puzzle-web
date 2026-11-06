import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/trips/deps';
import { createPaymentLink } from '@/payments/service';
import { linkDeps, stripeEnabled } from '@/payments/deps';
import { PAYMENT_KINDS } from '@/payments/lib/checkout';

export const dynamic = 'force-dynamic';

const MESSAGE: Record<string, string> = {
    not_found: 'La solicitud no existe.',
    no_fx: 'No hay tipo de cambio de Banxico en este momento; intenta en unos minutos o captura en pesos.',
    invalid_amount: 'El monto debe ser de al menos $10 MXN.',
    stripe_error: 'Stripe no pudo crear el enlace. Intenta de nuevo.',
};

/** Crea (o reenvía) el enlace de pago de una solicitud. Solo ADMIN. REQ-159, REQ-115, REQ-116, REQ-118. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!stripeEnabled()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (!(await requireAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const parsed = z
        .object({ amount: z.number().positive().max(10_000_000), currency: z.enum(['MXN', 'USD', 'EUR']), kind: z.enum(PAYMENT_KINDS) })
        .safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    const result = await createPaymentLink({ requestId: (await params).id, ...parsed.data }, linkDeps());
    if (!result.ok) return NextResponse.json({ error: result.code, message: MESSAGE[result.code] ?? 'Error' }, { status: result.code === 'not_found' ? 404 : result.code === 'stripe_error' ? 502 : 400 });
    return NextResponse.json(result);
}
