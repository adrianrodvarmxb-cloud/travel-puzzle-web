'use client';

import { useLanguage } from '@/lib/language-context';
import { legalLabels } from '@/legal/lib/labels';

/** Para quien navega en otro idioma: los documentos legales solo existen en español (gate 3). */
export function SpanishOnlyNotice() {
  const { language } = useLanguage();
  const text = legalLabels(language).spanishOnly;
  if (!text) return null;
  return <p lang="en" className="mt-4 rounded-xl border border-[#EAF54F]/30 bg-[#EAF54F]/10 px-4 py-3 text-sm text-[#EAF54F]">{text}</p>;
}
