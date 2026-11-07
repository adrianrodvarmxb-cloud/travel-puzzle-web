import Link from '@/components/i18n/LocalizedLink';
import type { ReactNode } from 'react';
import { Navbar } from '@/components/layout';
import { SiteFooter, WhatsAppBubble } from '@/components/home/v2';
import { contactFromEnv } from '@/booking/tour-summary';
import type { Crumb, Featured } from '@/destinations/lib/page-model';
import { Breadcrumbs } from './Breadcrumbs';
import { JsonLd } from './JsonLd';

/** Marco común de los hubs de destinos: menú servido, migas, H1, «Actividades destacadas» y JSON-LD. */
export function DestinationsLayout({ eyebrow, h1, intro, crumbs, featured, jsonLd, children }: {
    eyebrow: string; h1: string; intro?: string; crumbs: Crumb[]; featured: Featured; jsonLd: unknown[]; children: ReactNode;
}) {
    const env = process.env as Record<string, string | undefined>;
    const contact = contactFromEnv(env);
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <JsonLd data={jsonLd} />
            <main className="tp-dark">
                <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 md:pt-10">
                    <Breadcrumbs items={crumbs} />
                    <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-sky-400">{eyebrow}</p>
                    <h1 className="font-display mt-2 text-3xl font-bold leading-tight text-white md:text-5xl">{h1}</h1>
                    {intro && <p className="mt-3 max-w-3xl text-[#C9D6F5]">{intro}</p>}
                    {/* REQ-101: «Actividades destacadas» cerca del inicio, con los 3 tours principales enlazados. */}
                    {featured && (
                        <p className="mt-4 text-sm text-[#C9D6F5]">
                            <span className="font-semibold text-white">{featured.label}:</span>{' '}
                            {featured.items.map((it, i) => (
                                <span key={it.href}>{i > 0 && ' · '}<Link href={it.href} className="text-[#7CC4FF] hover:underline">{it.title}</Link></span>
                            ))}
                        </p>
                    )}
                    {children}
                </div>
            </main>
            <SiteFooter contact={{ whatsapp: contact.whatsapp, email: env.EMAIL_REPLY_TO, socials: contact.socials }} />
            <WhatsAppBubble whatsapp={contact.whatsapp} />
        </div>
    );
}

export function Section({ id, title, subtitle, children }: { id?: string; title: string; subtitle?: string; children: ReactNode }) {
    return (
        <section id={id} className="mt-12">
            <h2 className="font-display text-2xl font-semibold text-white">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-[#A9B6D6]">{subtitle}</p>}
            {children}
        </section>
    );
}
