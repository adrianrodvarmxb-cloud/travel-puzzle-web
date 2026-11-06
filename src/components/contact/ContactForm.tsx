'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LEGAL_PATHS } from '@/legal/lib/labels';
import type { ContactCopy } from '@/contact/lib/copy';

const field = 'mt-1 w-full rounded-xl border border-white/15 bg-[#0A1330] px-4 py-3 text-[15px] text-white placeholder:text-[#7F8DB0] focus:border-[#008DFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008DFF]/60';
const label = 'font-data text-[11px] uppercase tracking-[0.2em] text-[#A9B6D6]';

/**
 * REQ-247: formulario de /contacto. El tiempo de llenado se mide en el efecto y al enviar, nunca al pintar (INC-001).
 * Los textos llegan del servidor ya en el idioma de la página. Si el envío no está disponible, ofrece WhatsApp.
 */
export function ContactForm({ c, lang, waHref, endpoint = '/api/contacto' }: { c: ContactCopy['form']; lang: string; waHref: string | null; endpoint?: string }) {
  const start = useRef<number | null>(null);
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { start.current = performance.now(); }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState('sending');
    setError(null);
    const body = {
      kind: 'contacto',
      name: String(f.get('name') ?? ''),
      email: String(f.get('email') ?? ''),
      phone: String(f.get('phone') ?? ''),
      topic: String(f.get('topic') ?? 'otro'),
      message: String(f.get('message') ?? ''),
      consent: f.get('consent') === 'on',
      website: String(f.get('website') ?? ''),
      elapsedMs: Math.round(performance.now() - (start.current ?? performance.now())),
      language: lang,
    };
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) { setState('sent'); return; }
      setError(res.status === 503 || res.status === 404 ? c.errorUnavailable : res.status === 400 && json.error ? json.error : c.errorGeneric);
    } catch {
      setError(c.errorGeneric);
    }
    setState('idle');
  }

  if (state === 'sent') {
    return (
      <div role="status" className="rounded-2xl border border-[#EAF54F]/50 bg-[#0E1A40] p-6">
        <p className="font-display text-xl font-bold text-white">{c.sent}</p>
        <p className="mt-2 text-[#C9D6F5]">{c.sentText}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative space-y-4 rounded-2xl border border-[#008DFF]/45 bg-[#0E1A40] p-6 md:p-8">
      <div>
        <h2 className="font-display text-2xl font-bold text-white">{c.title}</h2>
        <p className="mt-1 text-sm text-[#C9D6F5]">{c.text}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><span className={label}>{c.name}</span><input name="name" required minLength={2} maxLength={80} autoComplete="name" className={field} /></label>
        <label className="block"><span className={label}>{c.email}</span><input name="email" type="email" required maxLength={254} autoComplete="email" className={field} /></label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><span className={label}>{c.phone}</span><input name="phone" type="tel" maxLength={30} autoComplete="tel" className={field} /><span className="mt-1 block text-xs text-[#7F8DB0]">{c.phoneHint}</span></label>
        <label className="block"><span className={label}>{c.topic}</span>
          <select name="topic" defaultValue="viaje" className={field}>
            {Object.entries(c.topics).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>
      <label className="block"><span className={label}>{c.message}</span><textarea name="message" required minLength={10} maxLength={2000} rows={5} className={field} /></label>
      {/* Campo trampa contra bots: fuera de la vista y del teclado. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><input name="website" tabIndex={-1} autoComplete="off" /></div>
      <label className="flex items-start gap-3 text-sm text-[#C9D6F5]">
        <input name="consent" type="checkbox" required className="mt-1 h-4 w-4 accent-[#008DFF]" />
        <span>{c.consentA} <Link href={LEGAL_PATHS.privacy} target="_blank" className="underline hover:text-white">{c.consentLink}</Link>.</span>
      </label>
      {error && (
        <p role="alert" className="text-sm text-[#FF8A73]">
          {error}{' '}
          {waHref && <a href={waHref} target="_blank" rel="noopener noreferrer" className="underline">{c.fallback}</a>}
        </p>
      )}
      <button type="submit" disabled={state === 'sending'} className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#008DFF] px-6 py-3 text-sm font-bold text-white hover:bg-[#2EA0FF] disabled:opacity-50 sm:w-auto">
        {state === 'sending' ? c.sending : c.send}
      </button>
    </form>
  );
}
