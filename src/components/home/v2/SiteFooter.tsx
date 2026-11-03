'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { homeCopy, waLink } from '@/home/lib/copy';

export interface FooterContact {
  whatsapp?: string;
  email?: string;
  socials: { name: string; url: string }[];
}

const ICON: Record<string, string> = { Instagram: 'instagram', Facebook: 'facebook', TikTok: 'tiktok', YouTube: 'youtube' };

export function SiteFooter({ contact }: { contact: FooterContact }) {
  const { language } = useLanguage();
  const c = homeCopy(language);
  const wa = waLink(contact.whatsapp, c.expertWa);

  return (
    <footer className="bg-[#0A1330] px-4 pb-24 pt-12 text-white/80 md:pb-12">
      <div className="h-1 w-full bg-[linear-gradient(90deg,#008DFF,#EAF54F,#C12909)]" />
      <div className="container mx-auto mt-10 grid max-w-6xl gap-10 md:grid-cols-3">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-animado-tp-oscuro.gif" alt="Travel Puzzle" width={120} className="h-auto w-[120px]" />
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.3em] text-[#EAF54F]">{c.footerSlogan}</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/50">{c.footerContact}</p>
          <Link href="/tours" className="block hover:text-white">{c.footerTours}</Link>
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
      <p className="container mx-auto mt-10 max-w-6xl border-t border-white/10 pt-6 text-xs text-white/50">{c.footerRights(new Date().getFullYear())} · travelpuzzle.com.mx</p>
    </footer>
  );
}
