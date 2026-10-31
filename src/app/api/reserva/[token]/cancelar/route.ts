import { NextResponse } from 'next/server';
import { cancelByToken } from '@/booking/manage';
import { manageDeps } from '@/booking/manage-deps';
import { sendStatusEmail } from '@/booking/notify';
import { getTourSummary, getMoreTours, contactFromEnv } from '@/booking/tour-summary';
import { sendEmail } from '@/notifications/resend';
import { isBookingsEnabled } from '@/booking/lib/flags';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const STATUS = { canceled: 200, already: 200, not_found: 404, not_allowed: 409, error: 502 } as const;

/** Cancela la reserva del enlace privado. El token es la prueba de que es del cliente. */
export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const result = await cancelByToken(token, {
        ...manageDeps(),
        notify: (record) =>
            sendStatusEmail('canceled', record, {
                enabled: isBookingsEnabled(process.env.EMAILS_ENABLED),
                lang: 'es',
                siteUrl: process.env.SITE_URL ?? '',
                getTour: (id, l) => getTourSummary(getPrisma(), id, l),
                getMoreTours: (id, l, site) => getMoreTours(getPrisma(), id, l, site),
                contact: contactFromEnv(process.env as Record<string, string | undefined>),
                send: (email) =>
                    sendEmail({ apiKey: process.env.RESEND_API_KEY ?? '', fetch }, { ...email, from: process.env.EMAIL_FROM ?? '', replyTo: process.env.EMAIL_REPLY_TO }),
            }),
    });
    console.log(`[reserva] cancelar → ${result}`);
    return NextResponse.json({ result }, { status: STATUS[result] });
}
