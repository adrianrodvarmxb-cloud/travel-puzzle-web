import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/trips/deps';
import { getPrisma } from '@/lib/prisma';
import { settleHold } from '@/payments/settle';
import { settleDeps } from '@/payments/deps';

export const dynamic = 'force-dynamic';

const MESSAGE: Record<string, string> = {
    not_held: 'Esta solicitud no tiene una tarjeta retenida.',
    invalid: 'Datos inválidos.',
    stripe_error: 'Stripe no pudo completar la operación. Intenta de nuevo.',
};

/** Respaldo en el gestor: cobrar o liberar lo retenido. Solo ADMIN, que cuenta como OK del PO. REQ-3483. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const deps = settleDeps();
    if (!deps.enabled) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (!(await requireAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const parsed = z.object({ action: z.enum(['capture', 'release']), reason: z.string().max(300).optional() }).safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    const row = await getPrisma().tripRequest.findUnique({ where: { id: (await params).id }, select: { ref: true } });
    if (!row) return NextResponse.json({ error: 'not_found', message: 'La solicitud no existe.' }, { status: 404 });
    const r = await settleHold({ ref: row.ref, action: parsed.data.action, reason: parsed.data.reason, poApproved: true, poNote: 'gestor (ADMIN)' }, deps);
    if (r.ok) return NextResponse.json(r);
    const code = r.code;
    return NextResponse.json({ error: code, message: MESSAGE[code] ?? 'Error' }, { status: code === 'not_held' ? 404 : code === 'stripe_error' ? 502 : 400 });
}
