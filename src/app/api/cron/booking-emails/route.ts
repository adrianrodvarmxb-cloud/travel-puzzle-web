import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { createBookingRepo } from '@/booking/repository';
import { createGatewayClient } from '@/booking/gateway-client';
import { runAutoEmails } from '@/booking/auto-emails';
import { sendBookingConfirmation, sendReviewRequest } from '@/booking/notify';
import { getTourSummary, getMoreTours, contactFromEnv } from '@/booking/tour-summary';
import { getWeather, coordsOf } from '@/notifications/weather';
import { sendEmail } from '@/notifications/resend';
import { isBookingsEnabled } from '@/booking/lib/flags';

export const dynamic = 'force-dynamic';

/**
 * Recordatorios (48 h y del día) y reseña post-tour. La llama el cron del Worker cada 5 minutos.
 * Todo detrás de EMAILS_ENABLED; la reseña además detrás de REVIEW_EMAILS_ENABLED
 * (hasta que exista la página de reseñas).
 */
export async function GET(request: Request) {
    if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const enabled = isBookingsEnabled(process.env.EMAILS_ENABLED);
    if (!enabled) return NextResponse.json({ success: true, skipped: 'emails_disabled' });

    const prisma = getPrisma();
    const repo = createBookingRepo(prisma);
    const gateway = createGatewayClient({ url: process.env.GATEWAY_URL ?? '', secret: process.env.GATEWAY_SECRET ?? '', fetch });
    const base = {
        enabled,
        lang: 'es' as const,
        siteUrl: process.env.SITE_URL ?? '',
        getTour: (id: number, l: 'es' | 'en') => getTourSummary(prisma, id, l),
        getMoreTours: (id: number, l: 'es' | 'en', site: string) => getMoreTours(prisma, id, l, site),
        contact: contactFromEnv(process.env as Record<string, string | undefined>),
        send: (email: { to: string; subject: string; html: string; text: string }) =>
            sendEmail({ apiKey: process.env.RESEND_API_KEY ?? '', fetch }, { ...email, from: process.env.EMAIL_FROM ?? '', replyTo: process.env.EMAIL_REPLY_TO }),
    };
    const summary = await runAutoEmails({
        now: new Date(),
        reviewsEnabled: isBookingsEnabled(process.env.REVIEW_EMAILS_ENABLED),
        listCandidates: (from, to) => repo.listActiveBetween(from, to),
        sentKinds: (refs) => repo.sentKinds(refs),
        markSent: (ref, kind) => repo.markSent(ref, kind),
        freetourStatus: async (ref) => (await gateway.getBooking(ref)).status,
        setStatus: (ref, status) => repo.setStatus(ref, status),
        getDuration: async (id) => (id ? (await getTourSummary(prisma, id, 'es'))?.duration ?? null : null),
        send: (kind, record) =>
            kind === 'review'
                ? sendReviewRequest(record, base)
                : sendBookingConfirmation(record, {
                      ...base,
                      getWeather: async (mp, eventDate) => {
                          const c = coordsOf(mp);
                          return c ? getWeather({ fetch, userAgent: 'TravelPuzzle/1.0 (+https://travelpuzzle.com.mx; info@travelpuzzle.com.mx)' }, { ...c, eventDate }) : null;
                      },
                  }, { variant: kind }),
    });
    console.log('[correos automáticos]', JSON.stringify(summary));
    return NextResponse.json({ success: true, ...summary });
}
