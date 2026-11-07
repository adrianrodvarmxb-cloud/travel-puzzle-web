'use client';

import { useEffect, useState } from 'react';
import type { SupportedLanguage } from '@/types';
import { useLanguage } from '@/lib/language-context';
import { localizePath } from '@/i18n/lib/path';
import { suggestLanguage, suggestionCopy } from '@/i18n/lib/suggest';

const DISMISS_KEY = 'tp-lang-suggest-dismissed';

/**
 * REQ-657: aviso pequeño y descartable cuando la preferencia del visitante (elección guardada o navegador) no es el idioma
 * de la URL. Nunca redirige. Se decide solo después de montar: el HTML del servidor no lo trae (bots e INC-001).
 */
export function LanguageSuggestion() {
  const { language } = useLanguage();
  const [target, setTarget] = useState<SupportedLanguage | null>(null);

  useEffect(() => {
    let stored: string | null = null;
    let dismissed = false;
    try {
      stored = localStorage.getItem('preferredLanguage');
      dismissed = sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      /* sin almacenamiento: solo el navegador */
    }
    setTarget(suggestLanguage({ routeLang: language, stored, cookie: null, browser: navigator.language ?? null, dismissed }));
  }, [language]);

  if (!target) return null;
  const c = suggestionCopy(target);
  const href = localizePath(`${window.location.pathname}${window.location.search}${window.location.hash}`, target);
  const close = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* nada */ }
    setTarget(null);
  };
  return (
    <div role="region" aria-label={c.text} lang={target} className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm shadow-lg">
      <span className="flex-1">{c.text}</span>
      <a href={href} hrefLang={target} className="font-semibold text-primary underline-offset-2 hover:underline">{c.cta}</a>
      <button type="button" onClick={close} aria-label={c.close} className="rounded p-1 text-muted-foreground hover:bg-muted">×</button>
    </div>
  );
}
