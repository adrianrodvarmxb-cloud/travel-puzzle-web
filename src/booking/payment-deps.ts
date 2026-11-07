/** Dependencias reales del pago (pasarela + D1 + correo). La lógica vive en payment.ts. */
import { getPrisma } from '@/lib/prisma';
import { createBookingRepo } from './repository';
import { createGatewayClient } from './gateway-client';
import { sendConfirmationFor } from './confirmation-send';
import { sendStatusEmail } from './notify';
import { getTourSummary, getMoreTours, contactFromEnv, calendarFromEnv } from './tour-summary';
import { sendEmail } from '@/notifications/resend';
import { buildManualCancelTeamEmail } from '@/notifications/lib/manual-cancel-email';
import { isBookingsEnabled, paidInRecommendations } from './lib/flags';
import { freetourPromoFlags } from '@/freetour/lib/promo-policy';
import { expirePayment, type PaymentRow } from './payment';
import type { BookingRecord } from './lib/booking-record';

export function paymentDeps(lang: 'es' | 'en' = 'es') {
    const repo = createBookingRepo(getPrisma());
    const gw = createGatewayClient({ url: process.env.GATEWAY_URL ?? '', secret: process.env.GATEWAY_SECRET ?? '', fetch });
    const env = process.env as Record<string, string | undefined>;
    const site = process.env.SITE_URL ?? '';
    const mail = (email: { to: string; subject: string; html: string; text: string }) =>
        sendEmail({ apiKey: process.env.RESEND_API_KEY ?? '', fetch }, { ...email, from: process.env.EMAIL_FROM ?? '', replyTo: process.env.EMAIL_REPLY_TO });
    const base = {
        repo,
        load: async (token: string) => (await repo.findPaymentByToken(token)) as PaymentRow | null,
        getPaymentStatus: (id: string) => gw.getPaymentStatus(id),
        markPayment: (ref: string, outcome: string, now: Date) => repo.markPayment(ref, outcome, now),
        sendConfirmation: async (ref: string) => {
            const record = await repo.findByRef(ref);
            if (record) await sendConfirmationFor(record as unknown as BookingRecord, lang);
        },
        now: new Date(),
    };
    // REQ-932: cancelar en FREETOUR (4 campos), avisar al cliente o pasar la reserva al equipo.
    const expireDeps = {
        ...base,
        cancel: (r: { refNumber: string; eventId: number; adults: number; children: number }) => gw.cancelBooking(r),
        notifyExpired: async (ref: string) => {
            const record = await repo.findByRef(ref);
            if (!record) return;
            await sendStatusEmail('expired', record as unknown as BookingRecord, {
                enabled: isBookingsEnabled(process.env.EMAILS_ENABLED),
                lang,
                siteUrl: site,
                getTour: (id, l) => getTourSummary(getPrisma(), id, l),
                getMoreTours: (id, l, s) => getMoreTours(getPrisma(), id, l, s, { includePaid: paidInRecommendations(process.env) }),
                freetourPostTourPromo: freetourPromoFlags(env).postTourPromo,
                contact: contactFromEnv(env),
                calendar: calendarFromEnv(env),
                send: (email) => mail(email),
            });
        },
        requestManual: async (ref: string) => {
            const record = await repo.findByRef(ref);
            if (!record) return;
            await mail({
                to: process.env.EMAIL_REPLY_TO ?? 'info@travelpuzzle.com.mx',
                ...buildManualCancelTeamEmail({
                    ...(record as unknown as BookingRecord),
                    detail: { message: 'pago vencido sin pagar (REQ-932); revisar el pago y cancelar en el panel', status: 0 },
                    logoUrl: `${site.replace(/\/+$/, '')}/brand/logo-tp-oscuro.png`,
                }),
            });
        },
    };
    return {
        ...base,
        expireDeps,
        expire: (row: PaymentRow) => expirePayment(row, { ...expireDeps, now: new Date() }),
        // REQ-931: enlace nuevo de pago.
        createPayment: (p: { refNumber: string; successUrl: string; cancelUrl: string }) => gw.createPayment(p),
        savePayment: (ref: string, p: { checkoutSessionId: string; paymentUrl: string; paymentStatus: 'pending'; paymentExpiresAt: string }) => repo.savePayment(ref, p),
        siteUrl: site,
    };
}
