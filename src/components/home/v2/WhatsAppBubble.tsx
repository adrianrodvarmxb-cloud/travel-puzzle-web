'use client';

import { useLanguage } from '@/lib/language-context';
import { homeCopy, waLink } from '@/home/lib/copy';

/** Burbuja flotante de WhatsApp (abajo a la derecha). */
export function WhatsAppBubble({ whatsapp }: { whatsapp?: string }) {
  const { language } = useLanguage();
  const c = homeCopy(language);
  const href = waLink(whatsapp, c.expertWa);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={c.waBubble}
      title={c.waBubble}
      className="fixed bottom-5 right-5 z-50 rounded-full shadow-[0_8px_24px_rgba(10,19,48,0.35)] transition-transform hover:scale-105"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/social/whatsapp.png" alt="" width={60} height={60} className="h-[60px] w-[60px] rounded-full" />
    </a>
  );
}
