import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadManageView } from '@/booking/manage';
import { manageDeps } from '@/booking/manage-deps';
import { getTourSummary, contactFromEnv } from '@/booking/tour-summary';
import { describeBooking } from '@/notifications/lib/booking-email';
import { whatsappUrl } from '@/notifications/lib/email-layout';
import { isBookingsEnabled } from '@/booking/lib/flags';
import { createFreetourApi } from '@/freetour/api';
import { resolveFreetourConfig } from '@/freetour/lib/hosts';
import { getPrisma } from '@/lib/prisma';
import { EmailFrame, Hero, BookingPass, SupportCard, Ghost } from '@/components/booking/email-ui';
import { EditBookingForm, type EditOption } from './EditBookingForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Modificar reserva', robots: { index: false, follow: false } };

/** Próximos horarios del mismo tour (mismo idioma que la reserva cuando lo hay). */
async function upcomingEvents(tourId: number, language: string | null, now: Date): Promise<EditOption[]> {
    try {
        const freetour = createFreetourApi({ config: resolveFreetourConfig(process.env), fetch });
        const raw = (await freetour.get(`/tours/${tourId}/events`)) as { data?: unknown };
        const body = raw?.data ?? raw;
        const list = (Array.isArray(body) ? body : ((body as { events?: unknown[] })?.events ?? [])) as { id: number; date: string; utcDate: string; language: string }[];
        const nowUtc = now.toISOString().replace('T', ' ').slice(0, 19);
        return list
            .filter((e) => e.utcDate > nowUtc && (!language || e.language === language))
            .slice(0, 60)
            .map((e) => ({ id: e.id, date: e.date, language: e.language }));
    } catch {
        return [];
    }
}

/** Modificar la reserva: otro horario del mismo tour o personas. Detrás de EDIT_ENABLED y canBeEdited. */
export default async function EditBookingPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const view = await loadManageView(token, manageDeps());
    if (!view) notFound();
    const { record } = view;
    const env = process.env as Record<string, string | undefined>;
    const contact = contactFromEnv(env);
    const wa = whatsappUrl(contact.whatsapp, `Hola Travel Puzzle, quiero cambiar la fecha de mi reserva ${record.refNumber}.`);
    const tour = record.tourExternalId ? await getTourSummary(getPrisma(), record.tourExternalId, 'es').catch(() => null) : null;
    const title = tour?.title ?? `Tour ${record.tourExternalId ?? ''}`;
    const { when, people, tourLang } = describeBooking('es', { ...record, tourLanguage: record.language });
    const allowed = isBookingsEnabled(env.EDIT_ENABLED) && view.canEdit && !!record.tourExternalId;
    const events = allowed ? await upcomingEvents(record.tourExternalId!, record.language, new Date()) : [];

    return (
        <EmailFrame wa={wa} socials={contact.socials} note="Este enlace es privado. No lo compartas.">
            <Hero status="Modificar reserva" dot="bg-[#008DFF]" statusText="text-[#9AAEE0]" title="Cambia tu fecha o personas" subtitle={<>Hola {record.firstName}: <span className="font-semibold text-white">{title}</span></>} />
            <div className="px-5 pt-6">
                <BookingPass label="Tu reserva actual" value={record.refNumber} cells={[['Cuándo', when ?? '—'], ['Quiénes', people], ['Idioma', tourLang ?? '—']]} />
            </div>
            {allowed ? (
                <EditBookingForm token={token} events={events} current={{ eventId: record.eventId, adults: record.adults, children: record.children }} />
            ) : (
                <section className="px-6 pt-7 text-center">
                    <p className="mb-4 text-sm text-gray-600">Esta reserva no se puede modificar en línea por ahora. Escríbenos y te ayudamos con el cambio.</p>
                    {wa && <Ghost href={wa}>Cambiar fecha por WhatsApp</Ghost>}
                </section>
            )}
            <section className="px-6 pt-6 text-center"><a href={`/reserva/${token}`} className="text-sm font-semibold text-[#008DFF] hover:underline">← Volver a mi reserva</a></section>
            {wa && <SupportCard n={3} wa={wa} text="Toca el botón y escríbenos por WhatsApp; ya lleva tu número de reserva." />}
        </EmailFrame>
    );
}
