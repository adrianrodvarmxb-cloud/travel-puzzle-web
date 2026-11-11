'use client';

import Link from '@/components/i18n/LocalizedLink';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/language-context';
import { homeCopy, waLink } from '@/home/lib/copy';
import { LEGAL_PATHS, legalLabels } from '@/legal/lib/labels';
import { useFeatureFlags } from '@/components/providers/FeatureFlags';
import { footerColumns, type NavLink } from '@/layout/lib/nav-model';
import { PILLARS } from '@/blog/lib/pillars';

export interface FooterContact {
  whatsapp?: string;
  email?: string;
  socials: { name: string; url: string }[];
}

/** El logo animado ya trae el lema; el texto aparte lo repetía (decisión del PO, 3 nov 2026). */
const SHOW_FOOTER_SLOGAN = false;

/** REQ-1400: grupo del pie. Escritorio: siempre abierto. Móvil: acordeón (botón de 44 px, aria-expanded), cerrado al cargar. */
function FooterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) setOpen(false);
  }, []);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center justify-between font-mono text-xs uppercase tracking-[0.3em] text-white/50 md:pointer-events-none md:min-h-0"
      >
        {title}
        <span aria-hidden className="md:hidden">{open ? '−' : '+'}</span>
      </button>
      <div className={`${open ? '' : 'hidden '}mt-2 space-y-2 text-sm md:block`}>{children}</div>
    </div>
  );
}

const isExternal = (href: string) => href.startsWith('http') || href.startsWith('mailto:');

const ICON: Record<string, string> = { Instagram: 'instagram', Facebook: 'facebook', TikTok: 'tiktok', YouTube: 'youtube' };

/** `helpEnabled`: muestra el enlace a /ayuda (mismo interruptor que las reservas en línea). */
export function SiteFooter({ contact, helpEnabled = false }: { contact: FooterContact; helpEnabled?: boolean }) {
  const { language, t } = useLanguage();
  const c = homeCopy(language);
  const wa = waLink(contact.whatsapp, c.expertWa);
  const legal = legalLabels(language);
  // REQ-241: Nosotros, Contacto, Blog… solo con su bandera. D9: el año llega del servidor (INC-001).
  const { pages, year, primeraPieza, transfers } = useFeatureFlags();
  // REQ-1400: pie por columnas Explora · Empresa · Ayuda (reglas en src/layout/lib/nav-model.ts).
  const columns = footerColumns({
    lang: language,
    labels: { destinos: language === 'es' ? 'Destinos' : 'Destinations', tours: t('nav.tours'), transfers: t('nav.transfers'), blog: 'Blog' },
    transfers: !!transfers,
    primeraPieza: !!primeraPieza,
    blog: !!pages?.blog,
    pages,
    helpEnabled,
    whatsappUrl: wa ?? undefined,
    email: contact.email,
    // REQ-1400: pilares activos del blog (clúster temático, ver src/blog/lib/pillars.ts).
    pillars: PILLARS.filter((p) => p.status === 'activo').map((p) => ({ href: `/blog/${p.slug}`, label: p.name })),
  });

  return (
    <footer className="bg-[#0A1330] px-4 pb-24 pt-12 text-white/80 md:pb-12">
      <div className="h-1 w-full bg-[linear-gradient(90deg,#008DFF,#EAF54F,#C12909)]" />
      <div className="container mx-auto mt-10 grid max-w-6xl gap-10 md:grid-cols-4">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-animado-tp-oscuro.gif" alt="Travel Puzzle" width={120} height={96} loading="lazy" decoding="async" className="h-auto w-[120px]" /* REQ-1564 */ />
          {SHOW_FOOTER_SLOGAN && <p className="mt-3 font-mono text-xs uppercase tracking-[0.3em] text-[#EAF54F]">{c.footerSlogan}</p>}
        </div>
        {columns.map((col) => (
          <FooterGroup key={col.title} title={col.title}>
            {col.links.map((l: NavLink) => isExternal(l.href)
              ? <a key={l.href} href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="block hover:text-white">{l.label}</a>
              : <Link key={l.href} href={l.href} className="block hover:text-white">{l.label}</Link>)}
          </FooterGroup>
        ))}
        {contact.socials.length > 0 && (
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/50">{c.footerFollow}</p>
            <div className="mt-3 flex gap-3">
              {contact.socials.map((s) => (
                <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.name} className="transition-opacity hover:opacity-80">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/brand/social/${ICON[s.name] ?? 'instagram'}.png`} alt={s.name} width={36} height={36} />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="container mx-auto mt-10 max-w-6xl border-t border-white/10 pt-6 text-xs text-white/50">
        {c.footerRights(year ?? new Date().getFullYear())} · travelpuzzle.com.mx
        {' · '}<Link href={LEGAL_PATHS.terms} className="hover:text-white">{legal.terms}</Link>
        {' · '}<Link href={LEGAL_PATHS.privacy} className="hover:text-white">{legal.privacy}</Link>
      </p>
    </footer>
  );
}
