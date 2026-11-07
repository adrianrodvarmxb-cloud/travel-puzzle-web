/**
 * Envío del correo de confirmación de una reserva de Freetour (free tour al reservar;
 * tour de pago cuando el pago queda confirmado, REQ-012). Mismas dependencias que antes en la ruta.
 */
import { sendBookingConfirmation } from '@/booking/notify';
import { getTourSummary, getMoreTours, contactFromEnv, calendarFromEnv } from '@/booking/tour-summary';
import { getWeather, coordsOf } from '@/notifications/weather';
import { createReviewRepo } from '@/reviews/repository';
import { pickReviews } from '@/reviews/lib/reviews';
import { sendEmail } from '@/notifications/resend';
import { getPrisma, getD1 } from '@/lib/prisma';
import { isBookingsEnabled, paidInRecommendations } from '@/booking/lib/flags';
import { freetourPromoFlags } from '@/freetour/lib/promo-policy';
import type { BookingRecord } from '@/booking/lib/booking-record';
import { cartFlags } from '@/cart/lib/flags';
import { crossSellDepsFromEnv } from '@/notifications/cross-sell-deps';

export async function sendConfirmationFor(record: BookingRecord, lang: 'es' | 'en') {
    await sendBookingConfirmation(record, {
        enabled: isBookingsEnabled(process.env.EMAILS_ENABLED),
        lang,
        siteUrl: process.env.SITE_URL ?? '',
        getTour: (id, l) => getTourSummary(getPrisma(), id, l),
        getMoreTours: (id, l, site) => getMoreTours(getPrisma(), id, l, site, { includePaid: paidInRecommendations(process.env) }),
        // REQ-081: «Más planes» sin FREETOUR mientras FREETOUR_POSTTOUR_PROMO_ENABLED esté apagada.
        freetourPostTourPromo: freetourPromoFlags(process.env as Record<string, string | undefined>).postTourPromo,
        // REQ-182: enlace a «Arma tu viaje» en la confirmación, solo con ARMA_TU_VIAJE_ENABLED.
        armaTuViaje: cartFlags(process.env as Record<string, string | undefined>).enabled,
        // REQ-264: venta cruzada sin FREETOUR, tras EMAIL_CROSS_SELL_ENABLED (apagada).
        crossSell: crossSellDepsFromEnv(process.env as Record<string, string | undefined>),
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
