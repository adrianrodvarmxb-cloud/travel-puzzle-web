import { NextRequest, NextResponse } from 'next/server';
import { zFTBookingDTO } from '@/lib/api/schemas/FTBooking.Schema';
import { createGatewayClient } from '@/booking/gateway-client';
import { placeBooking, recordBooking, BookingRejected, type BookingRejectionCode } from '@/booking/service';
import { createBookingRepo } from '@/booking/repository';
import { findEventInfo } from '@/booking/lib/event-info';
import { newManageToken } from '@/booking/lib/token';
import { getPrisma, getD1 } from '@/lib/prisma';
import { sendBookingConfirmation } from '@/booking/notify';
import { getTourSummary, getMoreTours, contactFromEnv, calendarFromEnv } from '@/booking/tour-summary';
import { getWeather, coordsOf } from '@/notifications/weather';
import { createReviewRepo } from '@/reviews/repository';
import { pickReviews } from '@/reviews/lib/reviews';
import { sendEmail } from '@/notifications/resend';
import { getPreferredLanguage } from '@/lib/utils/cookies';
import { createFreetourApi } from '@/freetour/api';
import { resolveFreetourConfig } from '@/freetour/lib/hosts';
import { zFTEventDetail } from '@/lib/api/schemas/FTEvent.Schema';
import { isBookingsEnabled } from '@/booking/lib/flags';

export const dynamic = 'force-dynamic';

const STATUS: Record<BookingRejectionCode, number> = {
    bookings_disabled: 503,
    paid_not_available: 400,
    invalid_phone: 400,
    phone_required: 400,
    no_availability: 409,
    provider_error: 502,
};

/**
 * Reserva real en Freetour a través de la pasarela de Namecheap.
 * Detrás del interruptor BOOKINGS_ENABLED ("true" para activar).
 */
export async function POST(request: NextRequest) {
    const parsed = zFTBookingDTO.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json({ error: 'invalid_booking', details: parsed.error.flatten() }, { status: 400 });
    }

    try {
        const freetour = createFreetourApi({ config: resolveFreetourConfig(process.env), fetch });
        const { booking, price } = await placeBooking(parsed.data, {
            enabled: isBookingsEnabled(process.env.BOOKINGS_ENABLED),
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
                save: (r) => createBookingRepo(getPrisma()).save(r),
                newToken: newManageToken,
                now: new Date(),
            }
        );
        if (record) {
            const lang = (await getPreferredLanguage()) === 'es' ? 'es' : 'en';
            await sendBookingConfirmation(record, {
                enabled: isBookingsEnabled(process.env.EMAILS_ENABLED),
                lang,
                siteUrl: process.env.SITE_URL ?? '',
                getTour: (id, l) => getTourSummary(getPrisma(), id, l),
                getMoreTours: (id, l, site) => getMoreTours(getPrisma(), id, l, site, { includePaid: isBookingsEnabled(process.env.PAID_TOURS_ENABLED) }),
                getWeather: async (mp, eventDate) => {
                    const c = coordsOf(mp);
                    return c ? getWeather({ fetch, userAgent: 'TravelPuzzle/1.0 (+https://travelpuzzle.com.mx; info@travelpuzzle.com.mx)' }, { ...c, eventDate }) : null;
                },
                getReviews: async (id, l) =>
                    pickReviews(await createReviewRepo(getPrisma(), getD1()).listByTour(id), { lang: l, limit: 2 })
                        .filter((r) => r.content && r.content.length <= 280)
                        .map((r) => ({ name: r.reviewerName, rate: r.rate, text: r.content as string })),
                contact: contactFromEnv(process.env as Record<string, string | undefined>),
                calendar: calendarFromEnv(process.env as Record<string, string | undefined>),
                send: (email) =>
                    sendEmail(
                        { apiKey: process.env.RESEND_API_KEY ?? '', fetch },
                        { ...email, from: process.env.EMAIL_FROM ?? '', replyTo: process.env.EMAIL_REPLY_TO }
                    ),
            });
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
