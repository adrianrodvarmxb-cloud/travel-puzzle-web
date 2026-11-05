'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/language-context';
import { bubbleVisible } from '@/home/lib/bubble';
import { homeCopy, waLink } from '@/home/lib/copy';

/** Burbuja flotante de WhatsApp (abajo a la derecha). revealAfter (REQ-045): en celular aparece al bajar esos px. */
export function WhatsAppBubble({ whatsapp, revealAfter }: { whatsapp?: string; revealAfter?: number }) {
  const { language } = useLanguage();
  const [show, setShow] = useState(!revealAfter);
  useEffect(() => {
    if (!revealAfter) return;
    const f = () => setShow(bubbleVisible({ scrollY: window.scrollY, width: window.innerWidth, revealAfter }));
    f();
    window.addEventListener('scroll', f, { passive: true });
    window.addEventListener('resize', f);
    return () => { window.removeEventListener('scroll', f); window.removeEventListener('resize', f); };
  }, [revealAfter]);
  const c = homeCopy(language);
  const href = waLink(whatsapp, c.expertWa);
  if (!href || !show) return null;
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
