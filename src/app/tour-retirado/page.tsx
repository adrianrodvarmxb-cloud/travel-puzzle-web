import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/layout';
import { SiteFooter, WhatsAppBubble } from '@/components/home/v2';
import { contactFromEnv } from '@/booking/tour-summary';
import { goneViewFromPlace } from '@/destinations/lib/page-model';
import { getGonePlace, primeraPiezaOn } from '@/destinations/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: { absolute: 'Tour no disponible | Travel Puzzle' }, robots: { index: false, follow: true } };

type SP = Record<string, string | string[] | undefined>;

/**
 * REQ-092: página útil de un tour retirado. No se visita directo: el middleware reescribe aquí la URL del tour
 * removed y responde 410 (el visitante ve su URL de siempre). Con el header y el footer del sitio (REQ-062).
 * El título y la ciudad salen de la base por ?id=; nunca de un texto en la URL (preview PR #128).
 */
export default async function TourRetiradoPage({ searchParams }: { searchParams: Promise<SP> }) {
    if (!primeraPiezaOn()) notFound();
    const raw = (await searchParams).id;
    const id = (Array.isArray(raw) ? raw[0] : raw) ?? '';
    const v = goneViewFromPlace(await getGonePlace(id));
    const env = process.env as Record<string, string | undefined>;
    const contact = contactFromEnv(env);
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="tp-dark">
                <section className="mx-auto max-w-3xl px-4 py-16 md:py-24">
                    <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">Tour no disponible</p>
                    <h1 className="font-display mt-2 text-3xl font-bold leading-tight text-white md:text-4xl">{v.title} ya no está disponible</h1>
                    <p className="mt-4 text-[#C9D6F5]">Ya no se puede reservar. En {v.cityName} hay otros tours disponibles.</p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link href={v.cityHref} className="inline-flex min-h-11 items-center rounded-full bg-sky-500 px-5 text-sm font-semibold text-white hover:bg-sky-400">Ver tours en {v.cityName}</Link>
                        <Link href="/destinos" className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-5 text-sm font-semibold text-white hover:bg-white/10">Todos los destinos</Link>
                    </div>
                </section>
            </main>
            <SiteFooter contact={{ whatsapp: contact.whatsapp, email: env.EMAIL_REPLY_TO, socials: contact.socials }} />
            <WhatsAppBubble whatsapp={contact.whatsapp} />
        </div>
    );
}
