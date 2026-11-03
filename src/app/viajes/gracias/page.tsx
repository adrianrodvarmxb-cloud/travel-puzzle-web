import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/layout';
import { SiteFooter } from '@/components/home/v2';
import { contactFromEnv } from '@/booking/tour-summary';
import { isHelpVisible } from '@/help/lib/faq';
import { tripCopy } from '@/trips/lib/copy';
import { isOwnToursEnabled } from '@/trips/public-load';
import { getPreferredLanguage } from '@/lib/utils/cookies';

export const metadata: Metadata = { title: 'Gracias · Travel Puzzle', robots: { index: false, follow: false } };

/** Thank you page de la solicitud (documento 2024). */
export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ folio?: string; volver?: string }> }) {
    if (!isOwnToursEnabled(process.env.OWN_TOURS_ENABLED)) notFound();
    const q = await searchParams;
    const folio = /^SOL-\d{8}-[A-Z0-9]{4}$/.test(q.folio ?? '') ? q.folio! : null;
    const back = q.volver?.startsWith('/viajes/') ? q.volver : '/tours';
    const c = tripCopy(await getPreferredLanguage());
    const wa = process.env.WHATSAPP_NUMBER ? `https://wa.me/${process.env.WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola Travel Puzzle, mi folio es ${folio ?? ''}.`)}` : null;
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="tp-dark min-h-[70vh]">
                <section className="mx-auto max-w-xl px-4 py-20 text-center">
                    <p className="text-5xl" aria-hidden>🧩</p>
                    <h1 className="font-display mt-4 text-3xl font-bold text-white md:text-4xl">{c.thanksTitle}</h1>
                    <p className="mt-3 text-lg text-[#D5DCEE]">{c.thanksLead}</p>
                    {folio && <p className="font-data mt-6 text-sm uppercase tracking-[0.2em] text-[#A9B6D6]">{c.thanksFolio}: <span className="text-white">{folio}</span></p>}
                    <p className="mt-2 text-sm text-[#A9B6D6]">{c.thanksMail}</p>
                    <div className="mt-8 flex flex-col items-center gap-3">
                        {wa && <a href={wa} className="rounded-full bg-[#25D366] px-6 py-3 text-sm font-bold text-[#0A1330]">{c.thanksWa}</a>}
                        <Link href={back} className="text-sm text-[#7CC4FF] underline">{c.thanksBack}</Link>
                    </div>
                </section>
            </main>
            <SiteFooter contact={{ whatsapp: contactFromEnv(process.env as Record<string, string | undefined>).whatsapp, email: process.env.EMAIL_REPLY_TO, socials: contactFromEnv(process.env as Record<string, string | undefined>).socials }} helpEnabled={isHelpVisible(process.env.BOOKINGS_ENABLED)} />
        </div>
    );
}
