import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/layout';
import { ExpertCta, SiteFooter, WhatsAppBubble } from '@/components/home/v2';
import { PageHeader } from '@/components/site/PageHeader';
import { AboutSections } from '@/components/about/AboutSections';
import { JsonLd } from '@/components/destinations/JsonLd';
import { contactFromEnv } from '@/booking/tour-summary';
import { aboutContent, visibleAboutSections, aboutSectionsToShow } from '@/about/lib/content';
import { publicStats } from '@/about/lib/public-stats';
import { sitePagesFromEnv } from '@/site/lib/pages';
import { aboutPageJsonLd, organizationWithContactJsonLd } from '@/seo/lib/pages-jsonld';
import { breadcrumbJsonLd } from '@/seo/lib/jsonld';
import { isHelpVisible } from '@/help/lib/faq';
import { getRouteLanguage } from '@/i18n/server';
import { getPrisma } from '@/lib/prisma';
import { loadHomeData, type HomeStats } from '@/home/load';
import { cached, cacheKey, POLICY } from '@/cache/edge';
import { withRetry } from '@/tours/lib/d1-load';
import { createHighlightRepo } from '@/reviews/repository';
import { formatCount } from '@/home/lib/format';

export const dynamic = 'force-dynamic';

const META = aboutContent('es').meta;
export const metadata: Metadata = { title: META.title, description: META.description, alternates: { canonical: '/nosotros' } };

/** D8: cifras en vivo con la misma caché del inicio. Si la base falla, la sección no sale y la página sigue. */
async function loadStats(lang: string, includePaid: boolean): Promise<HomeStats | null> {
  try {
    const prisma = getPrisma();
    const data = await cached(cacheKey('home', { lang, includePaid }), POLICY.home, () =>
      withRetry(() => loadHomeData({ prisma, highlights: createHighlightRepo(prisma), includePaid, lang })),
    );
    return data.stats;
  } catch (e) {
    console.error('[nosotros] sin cifras:', (e as Error).message);
    return null;
  }
}

/** REQ-240…245: /nosotros, visible solo con NOSOTROS_ENABLED="true". */
export default async function NosotrosPage() {
  const env = process.env as Record<string, string | undefined>;
  if (!sitePagesFromEnv(env).nosotros) notFound();
  const lang = await getRouteLanguage();
  const c = aboutContent(lang);
  const sections = visibleAboutSections(c);
  const stats = sections.some((s) => s.kind === 'stats') ? await loadStats(lang, env.PAID_TOURS_ENABLED === 'true') : null;
  // REQ-173 (INC-001): las cifras se formatean aquí, en el servidor, con idioma fijo (igual que el inicio).
  const numLang = lang === 'en' ? 'en' : 'es';
  const counts = stats ? { tours: formatCount(stats.tours, numLang), cities: formatCount(stats.cities, numLang), countries: formatCount(stats.countries, numLang) } : null;
  const contact = contactFromEnv(env);
  const footer = { whatsapp: contact.whatsapp, email: env.EMAIL_REPLY_TO, socials: contact.socials };
  const site = env.SITE_URL || 'https://travelpuzzle.com.mx';
  const crumbs = [{ name: c.breadcrumbHome, href: '/' }, { name: c.h1, href: '/nosotros' }];

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={[
        aboutPageJsonLd(site, META.title),
        organizationWithContactJsonLd(site, contact.socials.map((s) => s.url), { whatsapp: contact.whatsapp, email: env.EMAIL_REPLY_TO }),
        breadcrumbJsonLd([{ name: 'Inicio', url: `${site.replace(/\/+$/, '')}/` }, { name: META.title, url: `${site.replace(/\/+$/, '')}/nosotros` }]),
      ]} />
      <Navbar />
      <main className="tp-dark">
        <PageHeader crumbs={crumbs} eyebrow={c.eyebrow} title={c.h1} lead={c.lead} />
        <AboutSections sections={sections} stats={stats ? publicStats(stats) : null} counts={counts} />
        <ExpertCta whatsapp={contact.whatsapp} eyebrow={`${String(aboutSectionsToShow(sections, stats).length + 1).padStart(2, '0')} — ${lang === 'es' ? 'ASESORÍA PERSONALIZADA' : 'PERSONAL ADVICE'}`} />
      </main>
      <SiteFooter contact={footer} helpEnabled={isHelpVisible(env.BOOKINGS_ENABLED)} />
      <WhatsAppBubble whatsapp={contact.whatsapp} />
    </div>
  );
}
