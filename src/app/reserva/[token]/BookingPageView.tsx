/* eslint-disable @next/next/no-img-element */
import { CancelBooking } from './CancelBooking';
import { TripLinkCard } from '@/components/booking/TripLinkCard';
import { mono, Eyebrow, Ghost, EmailFrame, Hero, BookingPass, SupportCard } from '@/components/booking/email-ui';

const STATUS: Record<string, { label: string; dot: string; text: string }> = {
    active: { label: 'Reserva confirmada', dot: 'bg-[#3DDC84]', text: 'text-[#7CE3A1]' },
    canceled: { label: 'Reserva cancelada', dot: 'bg-[#EAF54F]', text: 'text-[#F3F8B0]' },
    rejected: { label: 'Reserva rechazada', dot: 'bg-[#FF6B5A]', text: 'text-[#FFB3A8]' },
    // REQ-017
    cancel_requested: { label: 'Cancelación en proceso', dot: 'bg-[#EAF54F]', text: 'text-[#F3F8B0]' },
};

export interface BookingPageViewProps {
    token: string;
    title: string;
    firstName: string;
    refNumber: string;
    status: string;
    canCancel: boolean;
    /** Freetour permite modificar y EDIT_ENABLED está encendido. */
    canEdit: boolean;
    /** Viene de guardar un cambio (?cambio=ok). */
    changed?: boolean;
    offline: boolean;
    days: number | null;
    imageUrl: string | null;
    rows: [string, string | null][];
    when: string | null;
    people: string;
    tourLang: string | null;
    maps: string | null;
    cal: { google: string; outlook: string } | null;
    wa: string | null;
    socials: { name: string; url: string }[];
    /** REQ-182: enlace a «Arma tu viaje» (solo con ARMA_TU_VIAJE_ENABLED y la reserva activa). */
    tripUrl?: string | null;
}

/** Vista de la página (solo presentación). */
export function BookingPageView({ token, title, firstName, refNumber, status, canCancel, canEdit, changed, offline, days, imageUrl, rows, when, people, tourLang, maps, cal, wa, socials, tripUrl }: BookingPageViewProps) {
    const active = status === 'active';
    const st = STATUS[status] ?? { label: status, dot: 'bg-gray-300', text: 'text-gray-200' };
    let sec = 0;

    return (
        <EmailFrame wa={wa} socials={socials} note="Este enlace es privado. No lo compartas.">
                {imageUrl && <img src={imageUrl} alt={title} className="block max-h-[320px] w-full object-cover" />}

                <Hero
                    status={st.label}
                    dot={st.dot}
                    statusText={st.text}
                    extra={days !== null ? <span className="text-[#EAF54F]">{days === 0 ? '¡Es hoy!' : days === 1 ? '¡Es mañana!' : `Faltan ${days} días`}</span> : undefined}
                    title={active ? '¡Tu lugar está apartado!' : status === 'canceled' ? 'Tu reserva quedó cancelada' : status === 'cancel_requested' ? 'Recibimos tu cancelación' : 'Tu reserva no pudo confirmarse'}
                    subtitle={<>Hola {firstName}: <span className="font-semibold text-white">{title}</span></>}
                />

                {changed && <p role="status" className="mx-5 mt-5 rounded-xl border border-[#3DDC84]/40 bg-[#3DDC84]/10 px-4 py-3 text-sm font-semibold text-[#0A1330]">✓ Guardamos tu cambio. Te mandamos la confirmación por correo.</p>}

                <div className="px-5 pt-6">
                    <BookingPass
                        label="Número de reserva"
                        value={refNumber}
                        badge={active ? 'Confirmada' : st.label.replace('Reserva ', '')}
                        badgeClass={st.text}
                        cells={[['Cuándo', when ?? '—'], ['Quiénes', people], ['Idioma', tourLang ?? '—']]}
                        dimmed={!active}
                        strike={!active}
                    />
                </div>

                <section className="px-6 pt-7">
                    <Eyebrow n={++sec}>Tu reserva</Eyebrow>
                    <h2 className="mb-3 text-[21px] font-bold tracking-tight text-[#0A1330]">Detalles de tu reserva</h2>
                    <dl>
                        {rows.filter(([, v]) => v).map(([k, v]) => (
                            <div key={k} className="grid grid-cols-[38%_1fr] border-b border-[#E6EBF5] py-3 text-sm">
                                <dt className={`${mono} text-[10px] text-gray-500`}>{k}</dt>
                                <dd className="font-semibold text-[#0A1330]">{v}</dd>
                            </div>
                        ))}
                    </dl>
                </section>

                {active && (
                    <section className="px-6 pt-6 text-center">
                        <div className="flex flex-wrap justify-center gap-2">
                            {maps && <Ghost href={maps}>Cómo llegar ↗</Ghost>}
                            {cal && <><Ghost href={cal.google}>Google Calendar +</Ghost><Ghost href={cal.outlook}>Outlook +</Ghost></>}
                        </div>
                        {cal && <p className={`${mono} mt-2 text-[10px] text-gray-500`}>Agrégalo a tu calendario</p>}
                    </section>
                )}

                {active && tripUrl && (
                    <section className="px-6 pt-7">
                        <TripLinkCard href={tripUrl} />
                    </section>
                )}

                {active && (
                    <section className="px-6 pt-7">
                        <Eyebrow n={++sec}>Cambios</Eyebrow>
                        <h2 className="mb-3 text-[21px] font-bold tracking-tight text-[#0A1330]">¿Necesitas otra fecha u horario?</h2>
                        {canEdit ? (
                            <a href={`/reserva/${token}/modificar`} className="block rounded-xl bg-[#C12909] px-5 py-4 text-center text-base font-bold text-white hover:opacity-90">Cambiar fecha o personas &nbsp;→</a>
                        ) : (
                            wa && <Ghost href={wa}>Cambiar fecha por WhatsApp</Ghost>
                        )}
                    </section>
                )}

                {(canCancel || (active && !offline) || offline) && (
                    <section className="px-6 pt-7">
                        <Eyebrow n={++sec}>Cancelar</Eyebrow>
                        <h2 className="mb-3 text-[21px] font-bold tracking-tight text-[#0A1330]">¿Ya no puedes ir?</h2>
                        {canCancel && (
                            <>
                                <p className="mb-3 text-sm text-gray-600">Cancela para liberar tu lugar para otro viajero. No tiene costo.</p>
                                <CancelBooking token={token} />
                            </>
                        )}
                        {active && !canCancel && !offline && <p className="text-sm text-gray-600">Esta reserva ya no se puede cancelar en línea. Si no puedes asistir, escríbenos.</p>}
                        {offline && <p className="text-sm text-gray-600">No pudimos consultar el estado con el organizador. Intenta de nuevo en unos minutos.</p>}
                    </section>
                )}

                {wa && <SupportCard n={++sec} wa={wa} text="Toca el botón y escríbenos por WhatsApp; ya lleva tu número de reserva." />}
        </EmailFrame>
    );
}
