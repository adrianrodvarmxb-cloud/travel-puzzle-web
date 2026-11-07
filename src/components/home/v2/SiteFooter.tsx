'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { homeCopy, waLink } from '@/home/lib/copy';
import { LEGAL_PATHS, legalLabels } from '@/legal/lib/labels';
import { HELP_PATH, helpCopy } from '@/help/lib/faq';
import { useFeatureFlags } from '@/components/providers/FeatureFlags';
import { footerPageLinks } from '@/site/lib/pages';
import { footerHubLinks } from '@/tours/lib/menu';

export interface FooterContact {
  whatsapp?: string;
  email?: string;
  socials: { name: string; url: string }[];
}

/** El logo animado ya trae el lema; el texto aparte lo repetía (decisión del PO, 3 nov 2026). */
const SHOW_FOOTER_SLOGAN = false;

const ICON: Record<string, string> = { Instagram: 'instagram', Facebook: 'facebook', TikTok: 'tiktok', YouTube: 'youtube' };

/** `helpEnabled`: muestra el enlace a /ayuda (mismo interruptor que las reservas en línea). */
export function SiteFooter({ contact, helpEnabled = false }: { contact: FooterContact; helpEnabled?: boolean }) {
  const { language } = useLanguage();
  const c = homeCopy(language);
  const wa = waLink(contact.whatsapp, c.expertWa);
  const legal = legalLabels(language);
  // REQ-241: Nosotros, Contacto, Blog… solo con su bandera. D9: el año llega del servidor (INC-001).
  const { pages, year, primeraPieza } = useFeatureFlags();
  const pageLinks = footerPageLinks(pages, language);

  return (
    <footer className="bg-[#0A1330] px-4 pb-24 pt-12 text-white/80 md:pb-12">
      <div className="h-1 w-full bg-[linear-gradient(90deg,#008DFF,#EAF54F,#C12909)]" />
      <div className="container mx-auto mt-10 grid max-w-6xl gap-10 md:grid-cols-3">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-animado-tp-oscuro.gif" alt="Travel Puzzle" width={120} className="h-auto w-[120px]" />
          {SHOW_FOOTER_SLOGAN && <p className="mt-3 font-mono text-xs uppercase tracking-[0.3em] text-[#EAF54F]">{c.footerSlogan}</p>}
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/50">{c.footerContact}</p>
          <Link href="/tours" className="block hover:text-white">{c.footerTours}</Link>
          {/* REQ-601: La Primera Pieza salió del menú (REQ-600); el pie la mantiene enlazada. */}
          {footerHubLinks(!!primeraPieza).map((l) => <Link key={l.href} href={l.href} className="block hover:text-white">{l.label}</Link>)}
          {helpEnabled && <Link href={HELP_PATH} className="block hover:text-white">{helpCopy(language).footerLink}</Link>}
          {pageLinks.map((l) => <Link key={l.href} href={l.href} className="block hover:text-white">{l.label}</Link>)}
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="block hover:text-white">WhatsApp</a>}
          {contact.email && <a href={`mailto:${contact.email}`} className="block hover:text-white">{contact.email}</a>}
        </div>
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
