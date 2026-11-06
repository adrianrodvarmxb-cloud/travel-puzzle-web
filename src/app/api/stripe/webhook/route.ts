import { NextResponse } from 'next/server';
import { handleStripeWebhook } from '@/payments/service';
import { webhookDeps } from '@/payments/deps';

export const dynamic = 'force-dynamic';

/** Avisos de Stripe (checkout.session.completed / expired). REQ-117, REQ-118. */
export async function POST(request: Request) {
    const payload = await request.text();
    const result = await handleStripeWebhook(payload, request.headers.get('stripe-signature'), webhookDeps());
    if (result === 'disabled') return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (result === 'invalid') return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
    console.log(`[stripe] webhook → ${result}`);
    return NextResponse.json({ received: true, result });
}
