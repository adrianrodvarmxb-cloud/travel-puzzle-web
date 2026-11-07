import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/layout';
import { SiteFooter, WhatsAppBubble } from '@/components/home/v2';
import { PageHeader } from '@/components/site/PageHeader';
import { AdvisorBlock } from '@/components/advisors/AdvisorBlock';
import { JsonLd } from '@/components/destinations/JsonLd';
import { contactFromEnv } from '@/booking/tour-summary';
import { advisorCopy, visibleAdvisorBlocks } from '@/advisors/lib/copy';
import { contactChannels } from '@/contact/lib/channels';
import { sitePagesFromEnv } from '@/site/lib/pages';
import { breadcrumbJsonLd } from '@/seo/lib/jsonld';
import { isHelpVisible } from '@/help/lib/faq';
import { getPreferredLanguage } from '@/lib/utils/cookies';

export const dynamic = 'force-dynamic';

const META = advisorCopy('es').meta;
export const metadata: Metadata = { title: META.title, description: META.description, alternates: { canonical: '/asesores' } };

/** REQ-250…252: «Habla con un asesor de viaje», visible solo con EXPERTOS_ENABLED="true". */
export default async function AsesoresPage() {
  const env = process.env as Record<string, string | undefined>;
  if (!sitePagesFromEnv(env).expertos) notFound();
  const lang = await getPreferredLanguage();
  const c = advisorCopy(lang);
  const ch = contactChannels(env, c.wa.prefill, '');
  const contact = contactFromEnv(env);
  const footer = { whatsapp: contact.whatsapp, email: env.EMAIL_REPLY_TO, socials: contact.socials };
  const site = (env.SITE_URL || 'https://travelpuzzle.com.mx').replace(/\/+$/, '');

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={[breadcrumbJsonLd([{ name: 'Inicio', url: `${site}/` }, { name: META.title, url: `${site}/asesores` }])]} />
      <Navbar />
      <main className="tp-dark">
        <PageHeader crumbs={[{ name: c.breadcrumbHome, href: '/' }, { name: c.h1, href: '/asesores' }]} eyebrow={c.eyebrow} title={c.h1} lead={c.lead} />
        <AdvisorBlock c={c} blocks={visibleAdvisorBlocks(c)} lang={lang} wa={ch.whatsapp} />
      </main>
      <SiteFooter contact={footer} helpEnabled={isHelpVisible(env.BOOKINGS_ENABLED)} />
      <WhatsAppBubble whatsapp={contact.whatsapp} />
    </div>
  );
}
