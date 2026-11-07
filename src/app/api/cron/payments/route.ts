import { NextResponse } from 'next/server';
import { confirmPayment, expirePayment, retryPendingPayments } from '@/booking/payment';
import { paymentDeps } from '@/booking/payment-deps';

export const dynamic = 'force-dynamic';

/** REQ-012/933: reintenta pagos pendientes (no más de una vez cada 10 min por reserva); REQ-932: cancela los vencidos sin pagar. */
export async function GET(request: Request) {
    if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (process.env.PAID_TOURS_ENABLED !== 'true') return NextResponse.json({ success: true, skipped: 'paid_disabled' });
    const d = paymentDeps('es');
    const out = await retryPendingPayments({
        listPending: async () => (await d.repo.listPendingPayments()) as never,
        confirm: (token) => confirmPayment(token, d),
        expire: (row, now) => expirePayment(row, { ...d.expireDeps, now }),
        now: new Date(),
    });
    return NextResponse.json({ success: true, ...out });
}
