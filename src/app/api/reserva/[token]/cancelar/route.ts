import { NextResponse } from 'next/server';
import { cancelByToken } from '@/booking/manage';
import { manageDeps } from '@/booking/manage-deps';
import { sendStatusEmail } from '@/booking/notify';
import { getTourSummary, getMoreTours, contactFromEnv, calendarFromEnv } from '@/booking/tour-summary';
import { sendEmail } from '@/notifications/resend';
import { isBookingsEnabled } from '@/booking/lib/flags';
import { getPrisma } from '@/lib/prisma';
import { freetourPromoFlags } from '@/freetour/lib/promo-policy';

export const dynamic = 'force-dynamic';

const STATUS = { canceled: 200, already: 200, requested: 200, not_found: 404, not_allowed: 409, error: 502 } as const;

/** Cancela la reserva del enlace privado. El token es la prueba de que es del cliente. */
export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const deps = manageDeps();
    let detail: { message: string; code: number | null; status: number } | null = null;
    const result = await cancelByToken(token, {
        ...deps,
        // Guarda el motivo que da Freetour para mostrarlo y diagnosticar (no contiene datos del cliente).
        cancel: (r) =>
            deps.cancel(r).catch((e: unknown) => {
                const g = e as { message?: string; errorCode?: number | null; status?: number };
                console.error('[reserva] Freetour no aceptó cancelar', JSON.stringify({ status: g.status, code: g.errorCode, message: g.message }));
                detail = { message: g.message ?? 'error', code: g.errorCode ?? null, status: g.status ?? 0 };
                throw e;
            }),
        // REQ-017: el equipo cancela en el panel de Freetour y confirma al cliente.
        requestManual: (record) =>
            sendEmail(
                { apiKey: process.env.RESEND_API_KEY ?? '', fetch },
                {
                    to: process.env.EMAIL_REPLY_TO ?? 'info@travelpuzzle.com.mx',
                    from: process.env.EMAIL_FROM ?? '',
                    subject: `Cancelación por hacer a mano – ${record.refNumber}`,
                    text: `El cliente pidió cancelar y Freetour no lo aceptó por API (${detail ? `${detail.status} ${detail.message}` : 'sin detalle'}).\n\nReserva: ${record.refNumber}\nEvento: ${record.eventId} (${record.eventDate ?? ''})\nPersonas: ${record.adults} adultos, ${record.children} niños\nCliente: ${record.firstName} ${record.lastName} <${record.email}>\n\nCancélala en el panel de Freetour y confirma al cliente por correo.`,
                    html: `<p>El cliente pidió cancelar y Freetour no lo aceptó por API (${detail ? `${detail.status} ${detail.message}` : 'sin detalle'}).</p><p><b>Reserva:</b> ${record.refNumber}<br><b>Evento:</b> ${record.eventId} (${record.eventDate ?? ''})<br><b>Personas:</b> ${record.adults} adultos, ${record.children} niños<br><b>Cliente:</b> ${record.firstName} ${record.lastName} &lt;${record.email}&gt;</p><p>Cancélala en el panel de Freetour y confirma al cliente por correo.</p>`,
                }
            ),
        notify: (record) =>
            sendStatusEmail('canceled', record, {
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
                    sendEmail({ apiKey: process.env.RESEND_API_KEY ?? '', fetch }, { ...email, from: process.env.EMAIL_FROM ?? '', replyTo: process.env.EMAIL_REPLY_TO }),
            }),
    });
    console.log(`[reserva] cancelar → ${result}`, detail ? JSON.stringify(detail) : '');
    return NextResponse.json(detail ? { result, detail } : { result }, { status: STATUS[result] });
}
