/* eslint-disable @next/next/no-img-element */
/**
 * Piezas visuales de las páginas de reserva con el mismo lenguaje que los correos:
 * marco blanco sobre azul marino, encabezado oscuro, pase tipo boarding pass y secciones numeradas.
 * Solo presentación.
 */
import { Navbar } from '@/components/layout/Navbar';
import { SiteFooter } from '@/components/home/v2/SiteFooter';
import type { SiteFooterData } from '@/layout/lib/site-footer';
import type { ReactNode } from 'react';

export const mono = 'font-mono text-[11px] uppercase tracking-[0.15em]';

export function Eyebrow({ n, children, dim }: { n: number; children: ReactNode; dim?: boolean }) {
    return <p className={`${mono} mb-1.5 ${dim ? 'text-[#9AAEE0]' : 'text-[#008DFF]'}`}>{String(n).padStart(2, '0')} — {children}</p>;
}

export function Ghost({ href, children, external = true }: { href: string; children: ReactNode; external?: boolean }) {
    return (
        <a href={href} {...(external && { target: '_blank', rel: 'noopener' })} className="inline-block rounded-[10px] border border-[#E6EBF5] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#0A1330] hover:bg-[#F4F7FD]">
            {children}
        </a>
    );
}

/**
 * Marco de 600 px con la franja de colores y encabezado con logo.
 * REQ-303: el pie es el del home (SiteFooter, con `site`). El pie de la tarjeta (copia del correo)
 * queda oculto; `cardFooter` lo vuelve a mostrar (reversible).
 */
export function EmailFrame({ wa, socials, children, note, site, cardFooter = false }: { wa: string | null; socials: { name: string; url: string }[]; children: ReactNode; note?: string; site: SiteFooterData; cardFooter?: boolean }) {
    return (
        <>
        {/* REQ-062: el mismo header del home (logo animado) en todo el acompañamiento y las reservas */}
        <Navbar />
        <main className="min-h-screen bg-[#0A1330] px-3 py-6 sm:py-10">
            <div className="mx-auto max-w-[600px] overflow-hidden rounded-[20px] bg-white">
                <div className="flex h-[3px]"><span className="w-[60%] bg-[#008DFF]" /><span className="w-1/4 bg-[#EAF54F]" /><span className="w-[15%] bg-[#C12909]" /></div>
                <header className="flex items-center justify-between bg-[#0A1330] px-5 py-3.5">
                    <a href="/"><img src="/brand/logo-tp-oscuro.png" alt="Travel Puzzle" width={150} className="h-auto w-[130px] sm:w-[150px]" /></a>
                    {wa && <a href={wa} className={`${mono} text-white`}>Ayuda</a>}
                </header>
                {children}
                {cardFooter && (
                    <footer className="flex items-center justify-between gap-4 bg-[#0A1330] px-5 py-5">
                        <img src="/brand/logo-animado-tp-oscuro.gif" alt="Travel Puzzle · Te armamos tu viaje" width={150} className="h-auto w-[120px] sm:w-[150px]" />
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
                )}
            </div>
            {note && <p className="mx-auto mt-4 max-w-[600px] text-center text-xs text-[#5F73AD]">{note}</p>}
        </main>
        <SiteFooter contact={site.contact} helpEnabled={site.helpEnabled} />
        </>
    );
}

/** Banda oscura con estado ("● Reserva confirmada"), titular y subtítulo. */
export function Hero({ status, dot, statusText, extra, title, subtitle }: { status: string; dot: string; statusText: string; extra?: ReactNode; title: string; subtitle?: ReactNode }) {
    return (
        <section className="bg-gradient-to-br from-[#0A1330] via-[#14214D] to-[#304A9F] px-6 pb-8 pt-6 text-white">
            <p className={`${mono} ${statusText}`}>
                <span className={`mr-2 inline-block h-2 w-2 rounded-full align-middle ${dot}`} />
                {status}
                {extra && <><span className="mx-2 text-[#34467F]">|</span>{extra}</>}
            </p>
            <h1 className="mt-3.5 text-[30px] font-bold leading-[1.15] tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-[15px] text-[#C9D6F5]">{subtitle}</p>}
        </section>
    );
}

/** Pase tipo boarding pass: etiqueta y valor grande arriba, celdas abajo. */
export function BookingPass({ label, value, badge, badgeClass = 'text-[#7CE3A1]', cells, dimmed, strike }: {
    label: string;
    value: string;
    badge?: string;
    badgeClass?: string;
    cells: [string, string][];
    dimmed?: boolean;
    strike?: boolean;
}) {
    return (
        <div className={`overflow-hidden rounded-2xl border border-[#22336B] bg-gradient-to-br from-[#0A1330] to-[#14214D] ${dimmed ? 'opacity-75' : ''}`}>
            <div className="px-4 pb-3.5 pt-4">
                <div className="flex justify-between">
                    <span className={`${mono} text-[10px] text-[#9AAEE0]`}>{label}</span>
                    {badge && <span className={`${mono} text-[10px] ${badgeClass}`}>● {badge}</span>}
                </div>
                <p className={`mt-1.5 break-all font-mono text-[22px] font-bold tracking-wide text-white ${strike ? 'line-through decoration-[#5F73AD]' : ''}`}>{value}</p>
            </div>
            <div className="mx-4 border-t border-dashed border-[#34467F]" />
            <div className={`grid ${cells.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {cells.map(([k, v]) => (
                    <div key={k} className="px-4 pb-4 pt-3.5">
                        <p className={`${mono} text-[10px] text-[#9AAEE0]`}>{k}</p>
                        <p className="mt-1 text-sm font-semibold leading-snug text-white">{v}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Tarjeta de soporte con la burbuja de WhatsApp. */
export function SupportCard({ n, wa, text }: { n: number; wa: string; text: string }) {
    return (
        <section className="px-5 pb-7 pt-7">
            <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-[#0A1330] to-[#14214D] p-5">
                <div className="flex-1">
                    <Eyebrow n={n} dim>Soporte</Eyebrow>
                    <p className="text-[19px] font-bold leading-tight text-white">¿Dudas? Estamos para ayudarte</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[#9AAEE0]">{text}</p>
                </div>
                <a href={wa} aria-label="Escríbenos por WhatsApp" className="shrink-0">
                    <img src="/brand/social/whatsapp.png" alt="" width={60} height={60} className="h-[60px] w-[60px] rounded-full shadow-[0_6px_18px_rgba(37,211,102,0.45)]" />
                </a>
            </div>
        </section>
    );
}
