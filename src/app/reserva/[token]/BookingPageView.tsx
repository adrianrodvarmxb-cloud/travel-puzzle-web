/* eslint-disable @next/next/no-img-element */
import { CancelBooking } from './CancelBooking';

const STATUS: Record<string, { label: string; dot: string; text: string }> = {
    active: { label: 'Reserva confirmada', dot: 'bg-[#3DDC84]', text: 'text-[#7CE3A1]' },
    canceled: { label: 'Reserva cancelada', dot: 'bg-[#EAF54F]', text: 'text-[#F3F8B0]' },
    rejected: { label: 'Reserva rechazada', dot: 'bg-[#FF6B5A]', text: 'text-[#FFB3A8]' },
};

const mono = 'font-mono text-[11px] uppercase tracking-[0.15em]';

function Eyebrow({ n, children, dim }: { n: number; children: React.ReactNode; dim?: boolean }) {
    return <p className={`${mono} mb-1.5 ${dim ? 'text-[#9AAEE0]' : 'text-[#008DFF]'}`}>{String(n).padStart(2, '0')} — {children}</p>;
}

function Ghost({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <a href={href} target="_blank" rel="noopener" className="inline-block rounded-[10px] border border-[#E6EBF5] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#0A1330] hover:bg-[#F4F7FD]">
            {children}
        </a>
    );
}

export interface BookingPageViewProps {
    token: string;
    title: string;
    firstName: string;
    refNumber: string;
    status: string;
    canCancel: boolean;
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
}

/** Vista de la página (solo presentación). */
export function BookingPageView({ token, title, firstName, refNumber, status, canCancel, offline, days, imageUrl, rows, when, people, tourLang, maps, cal, wa, socials }: BookingPageViewProps) {
    const active = status === 'active';
    const st = STATUS[status] ?? { label: status, dot: 'bg-gray-300', text: 'text-gray-200' };
    let sec = 0;

    return (
        <main className="min-h-screen bg-[#0A1330] px-3 py-6 sm:py-10">
            <div className="mx-auto max-w-[600px] overflow-hidden rounded-[20px] bg-white">
                <div className="flex h-[3px]"><span className="w-[60%] bg-[#008DFF]" /><span className="w-1/4 bg-[#EAF54F]" /><span className="w-[15%] bg-[#C12909]" /></div>
                <header className="flex items-center justify-between bg-[#0A1330] px-5 py-3.5">
                    <a href="/"><img src="/brand/logo-tp-oscuro.png" alt="Travel Puzzle" width={150} className="h-auto w-[130px] sm:w-[150px]" /></a>
                    {wa && <a href={wa} className={`${mono} text-white`}>Ayuda</a>}
                </header>

                {imageUrl && <img src={imageUrl} alt={title} className="block max-h-[320px] w-full object-cover" />}

                <section className="bg-gradient-to-br from-[#0A1330] via-[#14214D] to-[#304A9F] px-6 pb-8 pt-6 text-white">
                    <p className={`${mono} ${st.text}`}>
                        <span className={`mr-2 inline-block h-2 w-2 rounded-full align-middle ${st.dot}`} />
                        {st.label}
                        {days !== null && <><span className="mx-2 text-[#34467F]">|</span><span className="text-[#EAF54F]">{days === 0 ? '¡Es hoy!' : days === 1 ? '¡Es mañana!' : `Faltan ${days} días`}</span></>}
                    </p>
                    <h1 className="mt-3.5 text-[30px] font-bold leading-[1.15] tracking-tight">
                        {active ? '¡Tu lugar está apartado!' : status === 'canceled' ? 'Tu reserva quedó cancelada' : 'Tu reserva no pudo confirmarse'}
                    </h1>
                    <p className="mt-2 text-[15px] text-[#C9D6F5]">Hola {firstName}: <span className="font-semibold text-white">{title}</span></p>
                </section>

                <div className="px-5 pt-6">
                    <div className={`overflow-hidden rounded-2xl border border-[#22336B] bg-gradient-to-br from-[#0A1330] to-[#14214D] ${active ? '' : 'opacity-75'}`}>
                        <div className="px-4 pb-3.5 pt-4">
                            <div className="flex justify-between">
                                <span className={`${mono} text-[10px] text-[#9AAEE0]`}>Número de reserva</span>
                                <span className={`${mono} text-[10px] ${st.text}`}>● {active ? 'Confirmada' : st.label.replace('Reserva ', '')}</span>
                            </div>
                            <p className={`mt-1.5 break-all font-mono text-[22px] font-bold tracking-wide text-white ${active ? '' : 'line-through decoration-[#5F73AD]'}`}>{refNumber}</p>
                        </div>
                        <div className="mx-4 border-t border-dashed border-[#34467F]" />
                        <div className="grid grid-cols-3">
                            {[['Cuándo', when ?? '—'], ['Quiénes', people], ['Idioma', tourLang ?? '—']].map(([k, v]) => (
                                <div key={k} className="px-4 pb-4 pt-3.5">
                                    <p className={`${mono} text-[10px] text-[#9AAEE0]`}>{k}</p>
                                    <p className="mt-1 text-sm font-semibold leading-snug text-white">{v}</p>
                                </div>
                            ))}
                        </div>
                    </div>
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

                {(canCancel || (active && !offline) || offline) && (
                    <section className="px-6 pt-7">
                        <Eyebrow n={++sec}>Cambios</Eyebrow>
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

                {wa && (
                    <section className="px-5 pb-7 pt-7">
                        <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-[#0A1330] to-[#14214D] p-5">
                            <div className="flex-1">
                                <Eyebrow n={++sec} dim>Soporte</Eyebrow>
                                <p className="text-[19px] font-bold leading-tight text-white">¿Dudas? Estamos para ayudarte</p>
                                <p className="mt-1.5 text-[13px] leading-relaxed text-[#9AAEE0]">Toca el botón y escríbenos por WhatsApp; ya lleva tu número de reserva.</p>
                            </div>
                            <a href={wa} aria-label="Escríbenos por WhatsApp" className="shrink-0">
                                <img src="/brand/social/whatsapp.png" alt="" width={60} height={60} className="h-[60px] w-[60px] rounded-full shadow-[0_6px_18px_rgba(37,211,102,0.45)]" />
                            </a>
                        </div>
                    </section>
                )}

                <footer className="flex items-center justify-between gap-4 bg-[#0A1330] px-5 py-5">
                    <img src="/brand/logo-animado-tp-oscuro.gif" alt="Travel Puzzle · Armamos tu viaje" width={150} className="h-auto w-[120px] sm:w-[150px]" />
                    <div className="text-right">
                        {socials.length > 0 && (
                            <>
                                <p className={`${mono} mb-2.5 text-[10px] text-[#9AAEE0]`}>Síguenos</p>
                                <div className="mb-3 flex justify-end gap-2">
                                    {socials.map((s) => (
                                        <a key={s.name} href={s.url} target="_blank" rel="noopener" aria-label={s.name}>
                                            <img src={`/brand/social/${s.name.toLowerCase()}.png`} alt="" width={32} height={32} className="h-8 w-8" />
                                        </a>
                                    ))}
                                </div>
                            </>
                        )}
                        <p className="text-xs text-[#C9D6F5]">Travel Puzzle México · travelpuzzle.com.mx</p>
                    </div>
                </footer>
            </div>
            <p className="mx-auto mt-4 max-w-[600px] text-center text-xs text-[#5F73AD]">Este enlace es privado. No lo compartas.</p>
        </main>
    );
}
