import { NextResponse } from 'next/server';
import { resumePayment } from '@/booking/payment';
import { paymentDeps } from '@/booking/payment-deps';
import { resumeRedirect } from '@/booking/lib/payment-urls';
import { TOKEN_PATTERN } from '@/booking/manage';

export const dynamic = 'force-dynamic';

/** REQ-931: «Pagar» desde la reserva o la página de pago cancelado: mismo enlace, uno nuevo o cancelada. */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const origin = new URL(request.url).origin;
    if (!TOKEN_PATTERN.test(token) || process.env.PAID_TOURS_ENABLED !== 'true') {
        return NextResponse.redirect(new URL(resumeRedirect({ kind: 'not_found' }, token), origin), 302);
    }
    const result = await resumePayment(token, paymentDeps('es')).catch((e: unknown) => {
        console.error('[pago] no se pudo reanudar', (e as Error)?.message);
        return { kind: 'error' as const };
    });
    console.log(`[pago] continuar → ${result.kind}`);
    const to = resumeRedirect(result, token);
    return NextResponse.redirect(to.startsWith('https://') ? to : new URL(to, origin), 302);
}
