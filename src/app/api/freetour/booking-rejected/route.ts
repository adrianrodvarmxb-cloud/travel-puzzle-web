import { NextRequest, NextResponse } from 'next/server';
import { createGatewayClient } from '@/booking/gateway-client';
import { createBookingRepo } from '@/booking/repository';
import { handleRejection } from '@/booking/rejection';
import { sendStatusEmail } from '@/booking/notify';
import { getTourSummary, getMoreTours, contactFromEnv, calendarFromEnv } from '@/booking/tour-summary';
import { sendEmail } from '@/notifications/resend';
import { isBookingsEnabled } from '@/booking/lib/flags';
import { getPrisma } from '@/lib/prisma';
import { freetourPromoFlags } from '@/freetour/lib/promo-policy';

export const dynamic = 'force-dynamic';

/**
 * Freetour avisa aquí cuando un organizador rechaza una reserva:
 * POST { refNumber, reason }. Se confirma con Freetour antes de actuar.
 */
export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => null);
    const repo = createBookingRepo(getPrisma());
    const gateway = createGatewayClient({ url: process.env.GATEWAY_URL ?? '', secret: process.env.GATEWAY_SECRET ?? '', fetch });
    const result = await handleRejection(body, {
        findByRef: (ref) => repo.findByRef(ref),
        freetourStatus: async (ref) => (await gateway.getBooking(ref).catch(() => null))?.status ?? null,
        setStatus: (ref, status) => repo.setStatus(ref, status),
        // El cliente vio el sitio en el idioma de su reserva; sin ese dato, español.
        notify: (record, reason) =>
            sendStatusEmail('rejected', record, {
                enabled: isBookingsEnabled(process.env.EMAILS_ENABLED),
                lang: 'es',
                siteUrl: process.env.SITE_URL ?? '',
                getTour: (id, l) => getTourSummary(getPrisma(), id, l),
                getMoreTours: (id, l, site) => getMoreTours(getPrisma(), id, l, site, { includePaid: isBookingsEnabled(process.env.PAID_TOURS_ENABLED) }),
                // REQ-081: «Más planes» sin FREETOUR mientras FREETOUR_POSTTOUR_PROMO_ENABLED esté apagada.
                freetourPostTourPromo: freetourPromoFlags(process.env as Record<string, string | undefined>).postTourPromo,
                contact: contactFromEnv(process.env as Record<string, string | undefined>),
                calendar: calendarFromEnv(process.env as Record<string, string | undefined>),
                send: (email) =>
                    sendEmail(
                        { apiKey: process.env.RESEND_API_KEY ?? '', fetch },
                        { ...email, from: process.env.EMAIL_FROM ?? '', replyTo: process.env.EMAIL_REPLY_TO }
                    ),
            }, { reason }),
    });
    console.log(`[rechazo] ${typeof body?.refNumber === 'string' ? body.refNumber : '?'} → ${result}`);
    // 200 si el aviso se entendió; 503 si no pudimos confirmarlo con Freetour, para que lo reintente.
    const status = result === 'invalid' ? 400 : result === 'retry' ? 503 : 200;
    return NextResponse.json({ ok: result !== 'invalid' && result !== 'retry', result }, { status });
}
