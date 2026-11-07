'use client';

import { useEffect, useRef, useState } from 'react';
import Link from '@/components/i18n/LocalizedLink';
import { LEGAL_PATHS } from '@/legal/lib/labels';
import type { AdvisorCopy } from '@/advisors/lib/copy';

const field = 'mt-1 w-full rounded-xl border border-white/15 bg-[#0A1330] px-4 py-3 text-[15px] text-white placeholder:text-[#7F8DB0] focus:border-[#008DFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008DFF]/60';
const label = 'font-data text-[11px] uppercase tracking-[0.2em] text-[#A9B6D6]';

/** REQ-251: formulario corto de «Habla con un asesor de viaje». El tiempo de llenado se mide fuera del render (INC-001). */
export function AdvisorForm({ c, lang, waHref }: { c: AdvisorCopy['form']; lang: string; waHref: string | null }) {
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
      kind: 'asesor',
      name: String(f.get('name') ?? ''),
      email: String(f.get('email') ?? ''),
      phone: String(f.get('phone') ?? ''),
      destination: String(f.get('destination') ?? ''),
      when: String(f.get('when') ?? ''),
      message: String(f.get('message') ?? ''),
      consent: f.get('consent') === 'on',
      website: String(f.get('website') ?? ''),
      elapsedMs: Math.round(performance.now() - (start.current ?? performance.now())),
      language: lang,
    };
    try {
      const res = await fetch('/api/contacto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
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
        <label className="block"><span className={label}>{c.destination}</span><input name="destination" required minLength={2} maxLength={120} placeholder={c.destinationHint} className={field} /></label>
        <label className="block"><span className={label}>{c.when}</span><input name="when" maxLength={120} placeholder={c.whenHint} className={field} /></label>
      </div>
      <label className="block"><span className={label}>{c.phone}</span><input name="phone" type="tel" maxLength={30} autoComplete="tel" className={field} /></label>
      <label className="block"><span className={label}>{c.message}</span><textarea name="message" maxLength={1000} rows={3} className={field} /></label>
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
