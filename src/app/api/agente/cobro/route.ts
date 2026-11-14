// REQ-3483: Mila cobra o libera lo retenido. Misma puerta que el resto de la ventana del agente (bandera + llave);
// además exige STRIPE_HOLD_ENABLED: apagada responde 404, como si no existiera.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { settleHold } from '@/payments/settle';
import { settleDeps } from '@/payments/deps';
import { puerta, sinCache } from '../respuesta';

export const dynamic = 'force-dynamic';

const confirmation = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    adults: z.number().int().min(0).max(99), children: z.number().int().min(0).max(99), infants: z.number().int().min(0).max(99),
    amount: z.number().positive().max(10_000_000), currency: z.enum(['MXN', 'USD', 'EUR']),
    ambiguous: z.boolean().optional(),
});
const body = z.object({
    ref: z.string().min(3).max(40),
    action: z.enum(['capture', 'release']),
    confirmation: confirmation.optional(),
    poApproved: z.boolean().optional(),
    poNote: z.string().min(3).max(300).optional(),
    captureCentavos: z.number().int().positive().max(1_000_000_000).optional(),
    reason: z.string().max(300).optional(),
}).refine((b) => !b.poApproved || !!b.poNote, { message: 'poNote es obligatoria con poApproved' });

const STATUS = { disabled: 404, not_held: 404, invalid: 400, needs_po: 409, stripe_error: 502 } as const;

export async function POST(req: NextRequest) {
    const no = puerta(req); if (no) return no;
    const parsed = body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400, ...sinCache });
    const r = await settleHold(parsed.data, settleDeps());
    if (r.ok) return NextResponse.json(r, sinCache);
    return NextResponse.json(r, { status: STATUS[r.code], ...sinCache });
}
