'use client';

import { useState } from 'react';

const LABELS = ['Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'];

interface ReviewFormProps {
  token: string;
  initialRate: number | null;
  initialContent?: string;
  displayName: string;
  whatsappUrl?: string | null;
}

/** Formulario de reseña: estrellas, texto opcional y permiso para publicar como "Ana G.". */
export function ReviewForm({ token, initialRate, initialContent = '', displayName, whatsappUrl }: ReviewFormProps) {
  const [rate, setRate] = useState<number | null>(initialRate);
  const [content, setContent] = useState(initialContent);
  const [consent, setConsent] = useState(true);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rate) return;
    setState('sending');
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, rate, content, consent }),
    }).catch(() => null);
    setState(res?.ok ? 'done' : 'error');
  };

  if (state === 'done') {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="font-display text-2xl font-bold text-white">¡Gracias por tu reseña!</p>
        <p className="mt-2 text-[#A9B6D6]">
          {rate && rate <= 3
            ? 'Sentimos que no haya sido perfecto. Un asesor te escribirá para saber qué pasó.'
            : 'Tu opinión ayuda a otros viajeros a elegir su próximo tour.'}
        </p>
        {rate && rate <= 3 && whatsappUrl && (
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block rounded-full bg-[#EAF54F] px-5 py-3 font-semibold text-[#0A1330]">
            Contarnos por WhatsApp
          </a>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset>
        <legend className="font-data mb-3 text-xs uppercase tracking-[0.25em] text-[#008DFF]">1. Tus estrellas</legend>
        <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Calificación">
          {[1, 2, 3, 4, 5].map((n) => {
            const on = rate !== null && n <= rate;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rate === n}
                onClick={() => setRate(n)}
                className={`rounded-xl border py-3 text-center transition-colors ${rate === n ? 'border-[#EAF54F] bg-[#EAF54F]/10' : 'border-white/15 hover:border-white/40'}`}
              >
                <span className={`block text-2xl leading-none ${on ? 'text-[#F5B301]' : 'text-white/25'}`}>★</span>
                <span className="font-data mt-1.5 block text-[10px] uppercase tracking-wider text-[#A9B6D6]">{LABELS[n - 1]}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="block">
        <span className="font-data mb-3 block text-xs uppercase tracking-[0.25em] text-[#008DFF]">2. Tu reseña (opcional)</span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 2000))}
          rows={5}
          placeholder="¿Qué te gustó del guía, del recorrido, de la ciudad? ¿Qué le recomendarías a otro viajero?"
          className="w-full rounded-2xl border border-white/15 bg-white/5 p-4 text-base text-white placeholder:text-[#7F8DB0] focus:border-[#008DFF] focus:outline-none focus:ring-2 focus:ring-[#008DFF]/40"
        />
        <span className="mt-1 block text-right text-xs text-[#7F8DB0]">{content.length}/2000</span>
      </label>

      <label className="flex items-start gap-3 text-sm text-[#D5DCEE]">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-[#008DFF]" />
        <span>Acepto que Travel Puzzle publique mi reseña en su sitio como <strong className="text-white">{displayName}</strong></span>
      </label>

      {state === 'error' && <p className="rounded-xl border border-[#C12909]/50 bg-[#C12909]/10 px-4 py-3 text-sm text-white">No pudimos guardar tu reseña. Intenta de nuevo en un momento.</p>}

      <button type="submit" disabled={!rate || state === 'sending'} className="w-full rounded-xl bg-[#C12909] px-6 py-4 text-lg font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
        {state === 'sending' ? 'Enviando…' : 'Enviar reseña →'}
      </button>
    </form>
  );
}
