import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/layout';
import { SiteFooter, WhatsAppBubble } from '@/components/home/v2';
import { SectionBoundary } from '@/components/common/SectionBoundary';
import { CompanionCarousel } from '@/components/companions/CompanionCarousel';
import { contactFromEnv, getTourSummary } from '@/booking/tour-summary';
import { loadManageView } from '@/booking/manage';
import { manageDeps } from '@/booking/manage-deps';
import { getPrisma } from '@/lib/prisma';
import { cartFlags } from '@/cart/lib/flags';
import { buildArmaTuViajeModel, cartIdFromToken, parseTripQuery } from '@/cart/lib/page-model';
import { createWhatsAppAdvisor } from '@/cart/adapters/whatsapp';
import { buildRegistryAdapters } from '@/cart/adapters';
import { DEFAULT_REGISTRY, probeRegistry } from '@/companions/lib/registry';
import { providerCities, type TripCitiesDb } from '@/companions/load';
import { transfersWidgetUrl } from '@/transfers/lib/widget';
import { loadFirstPiece } from '@/cart/load';

export const dynamic = 'force-dynamic';
/** Con la bandera apagada no se publica ni el título: la 404 queda igual que cualquier otra. */
export function generateMetadata(): Metadata {
    if (!cartFlags(process.env as Record<string, string | undefined>).enabled) return {};
    return { title: 'Arma tu viaje', robots: { index: false, follow: false } };
}

type SP = Record<string, string | string[] | undefined>;

/**
 * REQ-104…110: «Arma tu viaje». Tras ARMA_TU_VIAJE_ENABLED: apagada responde 404 y no se pinta nada.
 * La Primera Pieza sale de la reserva (?reserva=<token>); las demás piezas, del carrusel.
 * Traslados con Kiwitaxi (REQ-120); las demás categorías caen al asesor por WhatsApp hasta tener su adaptador (REQ-105).
 */
export default async function ArmaTuViajePage({ searchParams }: { searchParams: Promise<SP> }) {
    const env = process.env as Record<string, string | undefined>;
    const flags = cartFlags(env);
    if (!flags.enabled) notFound();

    const sp = await searchParams;
    const token = typeof sp.reserva === 'string' ? sp.reserva : undefined;
    const piece = await loadFirstPiece(token, {
        view: (t) => loadManageView(t, manageDeps()),
        summary: async (id) => {
            const s = await getTourSummary(getPrisma(), id, 'es');
            return s ? { title: s.title, cityName: s.cityName ?? null } : null;
        },
    });
    const contact = contactFromEnv(env);
    const query = parseTripQuery(sp);
    // REQ-120 / REQ-121: complementos del registro (Kiwitaxi deeplink, Big Bus en solicitud…) prellenados con
    // la ciudad, la fecha y las personas de la primera pieza; si un adaptador falla, esa tarjeta cae a WhatsApp.
    const db: TripCitiesDb = { trip: { findMany: (args) => (getPrisma() as unknown as TripCitiesDb).trip.findMany(args) } };
    const adapters = buildRegistryAdapters(DEFAULT_REGISTRY, { whatsapp: contact.whatsapp, citiesFor: (e) => providerCities(db, e.provider) });
    const probes = piece && token
        ? await probeRegistry(DEFAULT_REGISTRY, adapters, {
            type: 'tour', cityCode: query.cityCode ?? '', cityName: piece.cityName, country: query.country ?? '',
            date: piece.date.slice(0, 10), people: piece.people, cartId: cartIdFromToken(token),
        })
        : {};
    const model = buildArmaTuViajeModel({
        piece,
        query,
        advisor: createWhatsAppAdvisor(contact.whatsapp),
        probes,
        flags: { visa: flags.visa, etias: flags.etias },
        now: Date.now(),
    });
    const footer = { whatsapp: contact.whatsapp, email: env.EMAIL_REPLY_TO, socials: contact.socials };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="tp-dark">
                <section className="mx-auto max-w-5xl px-4 py-12 md:py-16">
                    <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">Arma tu viaje</p>
                    {model.piece ? (
                        <>
                            <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">Tu viaje a {model.piece.cityName}</h1>
                            <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
                                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Tu primera pieza · {model.piece.status}</p>
                                <p className="mt-1 text-lg font-semibold text-white">{model.piece.title}</p>
                                <p className="text-sm text-slate-300">{model.piece.when} · {model.piece.cost}</p>
                            </div>
                            <SectionBoundary name="carrusel-arma-tu-viaje">
                                <CompanionCarousel cards={model.cards} cityCode={model.cityCode ?? ''} transferWidgetSrc={transfersWidgetUrl('es')} />
                            </SectionBoundary>
                        </>
                    ) : (
                        <>
                            <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">Tu viaje empieza con tu primera pieza</h1>
                            <p className="mt-3 max-w-2xl text-slate-300">
                                Reserva un tour y desde el enlace de tu reserva te ayudamos a armar lo demás.
                            </p>
                            <Link href="/tours" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-sky-500 px-5 text-sm font-semibold text-white hover:bg-sky-400">
                                Ver tours
                            </Link>
                        </>
                    )}
                </section>
            </main>
            <SiteFooter contact={footer} />
            <WhatsAppBubble whatsapp={contact.whatsapp} />
        </div>
    );
}
