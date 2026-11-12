import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadManageView } from '@/booking/manage';
import { manageDeps } from '@/booking/manage-deps';
import { getTourSummary, contactFromEnv } from '@/booking/tour-summary';
import { siteFooterFromEnv } from '@/layout/lib/site-footer';
import { describeBooking, mapsUrlFor, meetingPointText, calendarLinks, daysUntil } from '@/notifications/lib/booking-email';
import { whatsappUrl } from '@/notifications/lib/email-layout';
import { getPrisma } from '@/lib/prisma';
import { BookingPageView } from './BookingPageView';
import { cartFlags } from '@/cart/lib/flags';
import { tripUrl } from '@/cart/lib/links';
import { cancelNotice } from '@/booking/lib/cancel-policy';
import { showAccountInvite } from '@/accounts/lib/policy';
import { ACCOUNTS_ENABLED } from '@/lib/features';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Mi reserva', robots: { index: false, follow: false } };

/**
 * Página privada de la reserva. Mismo lenguaje visual que los correos:
 * marco azul marino, pase tipo boarding pass, secciones numeradas, rojo de marca y burbuja de WhatsApp.
 */
export default async function ManageBookingPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ cambio?: string }> }) {
    const { token } = await params;
    const changed = (await searchParams).cambio === 'ok';
    const view = await loadManageView(token, manageDeps());
    if (!view) notFound();

    const { record, status, canCancel, offline } = view;
    const canEdit = view.canEdit && process.env.EDIT_ENABLED === 'true';
    const tour = record.tourExternalId ? await getTourSummary(getPrisma(), record.tourExternalId, 'es').catch(() => null) : null;
    const { when, people, tourLang } = describeBooking('es', { ...record, tourLanguage: record.language });
    const title = tour?.title ?? `Free tour ${record.tourExternalId ?? ''}`;
    const meeting = meetingPointText(tour?.meetingPoint, 'es');
    const maps = mapsUrlFor(tour?.meetingPoint);
    const contact = contactFromEnv(process.env as Record<string, string | undefined>);
    const wa = whatsappUrl(contact.whatsapp, `Hola Travel Puzzle, tengo la reserva ${record.refNumber} y tengo una duda.`);
    const active = status === 'active';
    const days = active ? daysUntil(record.eventDate, new Date()) : null;
    const pageUrl = `${(process.env.SITE_URL ?? '').replace(/\/+$/, '')}/reserva/${token}`;
    const cal = active ? calendarLinks({ title, eventDate: record.eventDate, eventUtcDate: record.eventUtcDate, duration: tour?.duration ?? null, location: meeting, details: `Número de reserva: ${record.refNumber}\n${pageUrl}` }) : null;
    // REQ-931: tour de pago sin pagar → «Completar el pago»; REQ-934: regla de 24 h antes de confirmar la cancelación.
    const pay = record as typeof record & { fullPrice?: number | null; paymentStatus?: string | null };
    const paid = (pay.fullPrice ?? 0) > 0 || record.price > 0;
    const payHref = process.env.PAID_TOURS_ENABLED === 'true' && pay.paymentStatus === 'pending' && ['pending_payment', 'unpaid'].includes(status) ? `/reserva/${encodeURIComponent(token)}/pago/continuar` : null;
    const notice = cancelNotice({ paid, eventUtcDate: record.eventUtcDate }, new Date());
    const rows: [string, string | null][] = [
        ['Tour', title],
        ['Organiza', tour?.provider ?? null],
        ['Fecha y hora', when],
        ['Duración', tour?.duration ?? null],
        ['Idioma del tour', tourLang],
        ['Personas', people],
        ['Punto de encuentro', meeting],
    ];
    return (
        <BookingPageView
            token={token} title={title} firstName={record.firstName} refNumber={record.refNumber}
            status={status} canCancel={canCancel} canEdit={canEdit} changed={changed} offline={offline} days={days}
            imageUrl={tour?.imageUrl ?? null} rows={rows} when={when} people={people} tourLang={tourLang}
            maps={maps} cal={cal} wa={wa} socials={contact.socials} site={siteFooterFromEnv(process.env as Record<string, string | undefined>)}
            tripUrl={tripUrl({ site: '', token, enabled: cartFlags(process.env as Record<string, string | undefined>).enabled, status })}
            payHref={payHref} cancelNotice={notice}
            accountInvite={showAccountInvite({ accountsEnabled: ACCOUNTS_ENABLED, signedIn: ACCOUNTS_ENABLED ? !!(await auth().catch(() => null))?.user : false })}
        />
    );
}
