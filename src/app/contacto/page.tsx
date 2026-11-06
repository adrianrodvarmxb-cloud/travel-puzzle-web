import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/layout';
import { SiteFooter, WhatsAppBubble } from '@/components/home/v2';
import { PageHeader, DarkCard } from '@/components/site/PageHeader';
import { ContactForm } from '@/components/contact/ContactForm';
import { SectionBoundary } from '@/components/common/SectionBoundary';
import { JsonLd } from '@/components/destinations/JsonLd';
import { contactFromEnv } from '@/booking/tour-summary';
import { contactCopy } from '@/contact/lib/copy';
import { contactChannels } from '@/contact/lib/channels';
import { sitePagesFromEnv } from '@/site/lib/pages';
import { contactPageJsonLd, organizationWithContactJsonLd } from '@/seo/lib/pages-jsonld';
import { breadcrumbJsonLd } from '@/seo/lib/jsonld';
import { HELP_PATH, isHelpVisible } from '@/help/lib/faq';
import { LEGAL_PATHS } from '@/legal/lib/labels';
import { getPreferredLanguage } from '@/lib/utils/cookies';

export const dynamic = 'force-dynamic';

const META = contactCopy('es').meta;
export const metadata: Metadata = { title: META.title, description: META.description, alternates: { canonical: '/contacto' } };

const ICON: Record<string, string> = { Instagram: 'instagram', Facebook: 'facebook', TikTok: 'tiktok', YouTube: 'youtube' };

/** REQ-246…249: /contacto, visible solo con CONTACTO_ENABLED="true". */
export default async function ContactoPage() {
  const env = process.env as Record<string, string | undefined>;
  if (!sitePagesFromEnv(env).contacto) notFound();
  const lang = await getPreferredLanguage();
  const c = contactCopy(lang);
  const ch = contactChannels(env, c.wa.prefill, c.email.subject);
  const contact = contactFromEnv(env);
  const footer = { whatsapp: contact.whatsapp, email: env.EMAIL_REPLY_TO, socials: contact.socials };
  const site = (env.SITE_URL || 'https://travelpuzzle.com.mx').replace(/\/+$/, '');
  const helpOn = isHelpVisible(env.BOOKINGS_ENABLED);

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={[
        contactPageJsonLd(site, META.title),
        organizationWithContactJsonLd(site, contact.socials.map((s) => s.url), { whatsapp: ch.whatsapp?.digits, email: ch.email?.address }),
        breadcrumbJsonLd([{ name: 'Inicio', url: `${site}/` }, { name: META.title, url: `${site}/contacto` }]),
      ]} />
      <Navbar />
      <main className="tp-dark">
        <PageHeader crumbs={[{ name: c.breadcrumbHome, href: '/' }, { name: c.h1, href: '/contacto' }]} eyebrow={c.eyebrow} title={c.h1} lead={c.lead} />

        <section className="mx-auto grid max-w-5xl gap-6 px-4 pb-16 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            {ch.whatsapp && (
              <div className="rounded-2xl border border-[#008DFF]/45 bg-[#0E1A40] p-6">
                <h2 className="font-display text-xl font-bold text-white">{c.wa.title}</h2>
                <p className="mt-2 text-[15px] text-[#C9D6F5]">{c.wa.text}</p>
                <p className="font-data mt-3 text-sm text-white">{ch.whatsapp.display}</p>
                <a href={ch.whatsapp.href} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-3 rounded-2xl bg-[#C12909] px-5 py-3 font-semibold text-white hover:opacity-90">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/social/whatsapp.png" alt="" width={24} height={24} className="rounded-full" />
                  {c.wa.cta} →
                </a>
              </div>
            )}
            {ch.email && (
              <DarkCard title={c.email.title}>
                <p>{c.email.text}</p>
                <a href={ch.email.href} className="mt-2 inline-block break-all font-semibold text-[#EAF54F] underline-offset-4 hover:underline">{ch.email.address}</a>
              </DarkCard>
            )}
            <DarkCard title={c.hours.title}><p>{c.hours.text}</p></DarkCard>
            {contact.socials.length > 0 && (
              <DarkCard title={c.socials.title}>
                <div className="mt-1 flex gap-3">
                  {contact.socials.map((s) => (
                    <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.name} className="transition-opacity hover:opacity-80">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/brand/social/${ICON[s.name] ?? 'instagram'}.png`} alt={s.name} width={36} height={36} />
                    </a>
                  ))}
                </div>
              </DarkCard>
            )}
          </div>
          <div className="space-y-4 lg:col-span-3">
            <SectionBoundary name="contacto-formulario">
              <ContactForm c={c.form} lang={lang} waHref={ch.whatsapp?.href ?? null} />
            </SectionBoundary>
            <DarkCard title={c.booked.title}>
              <p>{c.booked.text}</p>
              {helpOn && <Link href={HELP_PATH} className="mt-2 inline-block font-semibold text-[#EAF54F] underline-offset-4 hover:underline">{c.booked.help} →</Link>}
            </DarkCard>
            <p className="text-xs text-[#A9B6D6]">
              {c.privacy.text} <Link href={LEGAL_PATHS.privacy} className="underline hover:text-white">{c.privacy.link}</Link>.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter contact={footer} helpEnabled={helpOn} />
      <WhatsAppBubble whatsapp={contact.whatsapp} />
    </div>
  );
}
