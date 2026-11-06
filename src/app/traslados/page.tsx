import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/layout';
import { SiteFooter, WhatsAppBubble } from '@/components/home/v2';
import { contactFromEnv } from '@/booking/tour-summary';
import { TransfersWidget } from '@/components/transfers/TransfersWidget';
import { transfersWidgetUrl } from '@/transfers/lib/widget';
import { trasladosMode } from '@/transfers/lib/page-mode';
import { SectionBoundary } from '@/components/common/SectionBoundary';
import { ComplementsHub } from '@/components/companions/ComplementsHub';
import { DEFAULT_REGISTRY, hubModel } from '@/companions/lib/registry';
import { providerCities, type TripCitiesDb } from '@/companions/load';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Traslados del aeropuerto a tu hotel',
  description: 'Reserva tu traslado privado del aeropuerto a tu hotel en cientos de ciudades del mundo.',
  alternates: { canonical: '/traslados' },
};

/**
 * REQ-028: visible solo con TRANSFERS_ENABLED="true".
 * REQ-120 / REQ-121: con ARMA_TU_VIAJE_ENABLED="true" la página es el hub «Transporte» (complementos del
 * carrito, armado desde el registro) y el cuadro suelto se oculta; con la bandera apagada se queda como hoy.
 */
/** REQ-121: hub de complementos desde el registro; ciudades de Big Bus (y otros en modo solicitud) del gestor de viajes. */
async function loadHub(env: Record<string, string | undefined>) {
  const contact = contactFromEnv(env);
  const requestEntries = DEFAULT_REGISTRY.filter((e) => e.adapter === 'request');
  // getPrisma() dentro de la llamada: si la base no está, providerCities lo atrapa y devuelve [].
  const db: TripCitiesDb = { trip: { findMany: (args) => (getPrisma() as unknown as TripCitiesDb).trip.findMany(args) } };
  const cities = await Promise.all(requestEntries.map(async (e) => [e.id, await providerCities(db, e.provider)] as const));
  return hubModel(DEFAULT_REGISTRY, { whatsapp: contact.whatsapp, citiesByEntry: Object.fromEntries(cities) });
}

export default async function TrasladosPage() {
  const env = process.env as Record<string, string | undefined>;
  const mode = trasladosMode(env);
  if (mode === 'hidden') notFound();
  const hub = mode === 'cart-entry' ? await loadHub(env) : null;
  const contact = contactFromEnv(env);
  const footer = { whatsapp: contact.whatsapp, email: env.EMAIL_REPLY_TO, socials: contact.socials };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="tp-dark">
        <section className="mx-auto max-w-5xl px-4 py-12 md:py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">Traslados</p>
          {mode === 'cart-entry' ? (
            <>
              <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">Transporte para tu viaje</h1>
              <p className="mt-3 max-w-2xl text-slate-300">
                Complementos para moverte en tu destino. También aparecen en «Arma tu viaje», junto a tu tour, con la ciudad
                y la fecha ya escritas. Cada tarjeta dice quién lo cobra.
              </p>
              <SectionBoundary name="hub-transporte">
                <ComplementsHub groups={hub ?? []} transferWidgetSrc={transfersWidgetUrl('es')} />
              </SectionBoundary>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link href="/tours" className="inline-flex min-h-11 items-center rounded-full bg-sky-500 px-5 text-sm font-semibold text-white hover:bg-sky-400">
                  Elegir un tour
                </Link>
                <Link href="/arma-tu-viaje" className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-5 text-sm font-semibold text-white hover:bg-white/10">
                  Ir a Arma tu viaje
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">Del aeropuerto a tu hotel, sin preocupaciones</h1>
              <p className="mt-3 max-w-2xl text-slate-300">
                Elige tu aeropuerto o estación, tu hotel y la fecha. Te esperamos con tu nombre a la llegada.
                Precios en dólares (USD).
              </p>
              <div className="mt-8 rounded-2xl border border-white/10 bg-white p-3 md:p-5">
                <TransfersWidget src={transfersWidgetUrl('es')} />
              </div>
            </>
          )}
        </section>
      </main>
      <SiteFooter contact={footer} />
      <WhatsAppBubble whatsapp={contact.whatsapp} />
    </div>
  );
}
