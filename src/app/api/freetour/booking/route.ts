import { NextRequest, NextResponse } from 'next/server';
import { zFTBookingDTO } from '@/lib/api/schemas/FTBooking.Schema';
import { createGatewayClient } from '@/booking/gateway-client';
import { placeBooking, recordBooking, BookingRejected, type BookingRejectionCode } from '@/booking/service';
import { createBookingRepo } from '@/booking/repository';
import { findEventInfo } from '@/booking/lib/event-info';
import { newManageToken } from '@/booking/lib/token';
import { getPrisma } from '@/lib/prisma';
import { getPreferredLanguage } from '@/lib/utils/cookies';
import { createFreetourApi } from '@/freetour/api';
import { resolveFreetourConfig } from '@/freetour/lib/hosts';
import { zFTEventDetail } from '@/lib/api/schemas/FTEvent.Schema';
import { isBookingsEnabled } from '@/booking/lib/flags';
import { isOverlap, parseIdempotencyKey } from '@/booking/lib/overlap';
import { startPayment } from '@/booking/payment';
import { isRefundPolicyConfirmed } from '@/tours/lib/paid-policy';
import { sendConfirmationFor } from '@/booking/confirmation-send';

export const dynamic = 'force-dynamic';

const STATUS: Record<BookingRejectionCode, number> = {
    bookings_disabled: 503,
    paid_not_available: 400,
    children_not_allowed: 400,
    invalid_phone: 400,
    phone_required: 400,
    no_availability: 409,
    already_booked: 409,
    provider_error: 502,
};

/**
 * Reserva real en Freetour a través de la pasarela de Namecheap.
 * Detrás del interruptor BOOKINGS_ENABLED ("true" para activar).
 */
export async function POST(request: NextRequest) {
    const raw = (await request.json().catch(() => null)) as { idempotencyKey?: unknown } | null;
    const parsed = zFTBookingDTO.safeParse(raw);
    if (!parsed.success) {
        return NextResponse.json({ error: 'invalid_booking', details: parsed.error.flatten() }, { status: 400 });
    }

    try {
        const freetour = createFreetourApi({ config: resolveFreetourConfig(process.env), fetch });
        const repo = createBookingRepo(getPrisma());
        const { booking, price, fullPrice, isPaid } = await placeBooking({ ...parsed.data, idempotencyKey: parseIdempotencyKey(raw?.idempotencyKey) }, {
            enabled: isBookingsEnabled(process.env.BOOKINGS_ENABLED),
            // REQ-013: sin el texto de reembolso confirmado por Freetour no se cobra.
            paidEnabled: isBookingsEnabled(process.env.PAID_TOURS_ENABLED) && isRefundPolicyConfirmed(),
            hasActiveBooking: async (eventId, email) => isOverlap(await repo.findByEventAndEmail(eventId, email), { eventId, email }),
            getEvent: async (id) => zFTEventDetail.parse(((await freetour.get(`/event/${id}`)) as { data: unknown }).data),
            gateway: createGatewayClient({
                url: process.env.GATEWAY_URL ?? '',
                secret: process.env.GATEWAY_SECRET ?? '',
                fetch,
            }),
        });
        const record = await recordBooking(
            { booking, request: parsed.data, price },
            {
                getEventInfo: async (tourId, eventId) => findEventInfo(await freetour.get(`/tours/${tourId}/events`), eventId),
                save: (r) => repo.save(r),
                newToken: newManageToken,
                now: new Date(),
            }
        );
        if (record && isPaid) {
            // REQ-011: tour de pago → checkout de Freetour; la confirmación sale al quedar pagado (REQ-012).
            const gw = createGatewayClient({ url: process.env.GATEWAY_URL ?? '', secret: process.env.GATEWAY_SECRET ?? '', fetch });
            const paymentUrl = await startPayment(record, {
                createPayment: (p) => gw.createPayment(p),
                savePayment: (ref, p) => repo.savePayment(ref, { ...p, fullPrice }),
                siteUrl: process.env.SITE_URL ?? '',
            });
            return NextResponse.json({ success: true, booking, manageToken: record.manageToken, paymentUrl });
        }
        if (record) {
            const lang = (await getPreferredLanguage()) === 'es' ? 'es' : 'en';
            await sendConfirmationFor(record, lang);
        }
        return NextResponse.json({ success: true, booking, manageToken: record?.manageToken ?? null });
    } catch (error) {
        if (error instanceof BookingRejected) {
            return NextResponse.json({ error: error.code, message: error.message }, { status: STATUS[error.code] });
        }
        console.error('[reservas] error inesperado:', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'provider_error', message: 'No pudimos confirmar tu reserva en este momento.' }, { status: 502 });
    }
}
