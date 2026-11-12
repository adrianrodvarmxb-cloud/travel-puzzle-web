'use client';
import { useEffect, useMemo, useState } from 'react';
import { LEGAL_PATHS } from '@/legal/lib/labels';
import { buildPurchaseBody, plainPrice, type PublicDay } from '@/octo/lib/public-view';
import type { CityPlan } from '@/octo/lib/catalog';

const COPY = {
    es: {
        title: 'Compra tu boleto', option: 'Opción', date: 'Fecha', people: 'Personas', from: 'Desde', first: 'Nombre', last: 'Apellido',
        email: 'Correo', phone: 'Teléfono', consent: 'Acepto el', privacy: 'aviso de privacidad', pay: 'Ir al pago', paying: 'Abriendo el pago…',
        note: 'Pagas en pesos con tarjeta. Apartamos tu lugar mientras pagas y te mandamos el boleto por correo.', noDates: 'Sin fechas disponibles en los próximos días.',
    },
    en: {
        title: 'Buy your ticket', option: 'Option', date: 'Date', people: 'People', from: 'From', first: 'First name', last: 'Last name',
        email: 'Email', phone: 'Phone', consent: 'I accept the', privacy: 'privacy notice', pay: 'Go to payment', paying: 'Opening payment…',
        note: 'You pay in Mexican pesos by card. We hold your spot while you pay and email your ticket.', noDates: 'No dates available in the coming days.',
    },
} as const;

const DAYS_AHEAD = 60;

/**
 * REQ-3423: compra directa de Big Bus en la ficha. Se muestra solo si la API responde (BIGBUS_OCTO_ENABLED
 * encendida y la ciudad en el plan); si no, no pinta nada y queda el formulario de solicitud de siempre.
 */
export function BigBusBuyBox({ cityRef, lang, today }: { cityRef: string; lang: 'es' | 'en'; today: string }) {
    const c = COPY[lang];
    const [city, setCity] = useState<CityPlan | null>(null);
    const [key, setKey] = useState('');
    const [days, setDays] = useState<PublicDay[]>([]);
    const [date, setDate] = useState('');
    const [qty, setQty] = useState<Record<string, number>>({});
    const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', consent: false });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch(`/api/bigbus/opciones?ref=${encodeURIComponent(cityRef)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j: { city?: CityPlan | null } | null) => {
                const first = j?.city?.products[0];
                if (!j?.city || !first) return;
                setCity(j.city);
                setKey(`${first.productId}|${first.options[0]?.optionId ?? ''}`);
            })
            .catch(() => {});
    }, [cityRef]);

    const [productId, optionId] = key.split('|');
    const option = useMemo(() => city?.products.find((p) => p.productId === productId)?.options.find((o) => o.optionId === optionId) ?? null, [city, productId, optionId]);

    useEffect(() => {
        if (!option) return;
        const units = Object.fromEntries(option.units.map((u, i) => [u.id, i === 0 ? 2 : 0]));
        setQty(units);
        const end = new Date(`${today}T12:00:00Z`);
        end.setUTCDate(end.getUTCDate() + DAYS_AHEAD);
        const q = new URLSearchParams({ ref: cityRef, productId, optionId, from: today, to: end.toISOString().slice(0, 10) });
        fetch(`/api/bigbus/opciones?${q}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j: { calendar?: PublicDay[] } | null) => {
                const open = (j?.calendar ?? []).filter((d) => d.available);
                setDays(open);
                setDate(open[0]?.date ?? '');
            })
            .catch(() => setDays([]));
    }, [option, cityRef, productId, optionId, today]);

    if (!city || !option) return null;

    const total = Object.values(qty).reduce((n, v) => n + v, 0);
    const canPay = !busy && !!date && total > 0 && total <= 20 && form.consent && form.firstName && form.lastName && form.email && form.phone.length >= 6;

    async function pay() {
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/bigbus/compra', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildPurchaseBody({ ref: cityRef, productId, optionId, date, qty, ...form, language: lang })),
            });
            const j = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
            if (res.ok && j.url) window.location.assign(j.url);
            else setError(j.error ?? 'Error');
        } catch {
            setError('Error');
        } finally {
            setBusy(false);
        }
    }

    const input = 'w-full rounded-lg border border-white/15 bg-[#0B1430] px-3 py-2 text-white';
    return (
        <section className="rounded-2xl border border-white/10 bg-[#121D45] p-5 text-sm text-[#D5DCEE]" data-compra="bigbus">
            <h2 className="mb-3 text-lg font-semibold text-white">{c.title}</h2>
            <label className="mb-3 block">
                <span className="mb-1 block text-xs uppercase tracking-wide">{c.option}</span>
                <select className={input} value={key} onChange={(e) => setKey(e.target.value)}>
                    {city.products.flatMap((p) =>
                        p.options.map((o) => (
                            <option key={`${p.productId}|${o.optionId}`} value={`${p.productId}|${o.optionId}`}>
                                {o.name}
                                {o.from ? ` · ${c.from} ${plainPrice(o.from)}` : ''}
                            </option>
                        )),
                    )}
                </select>
            </label>
            <label className="mb-3 block">
                <span className="mb-1 block text-xs uppercase tracking-wide">{c.date}</span>
                {days.length ? (
                    <select className={input} value={date} onChange={(e) => setDate(e.target.value)}>
                        {days.map((d) => (
                            <option key={d.date} value={d.date}>
                                {d.date}
                                {d.from ? ` · ${plainPrice(d.from)}` : ''}
                            </option>
                        ))}
                    </select>
                ) : (
                    <p>{c.noDates}</p>
                )}
            </label>
            <fieldset className="mb-3">
                <legend className="mb-1 text-xs uppercase tracking-wide">{c.people}</legend>
                {option.units.map((u) => (
                    <div key={u.id} className="mb-2 flex items-center justify-between gap-3">
                        <span>
                            {u.name}
                            {u.minAge != null && u.maxAge != null ? ` (${u.minAge}–${u.maxAge})` : ''}
                        </span>
                        <input type="number" min={0} max={20} className={`${input} w-20`} value={qty[u.id] ?? 0}
                            onChange={(e) => setQty({ ...qty, [u.id]: Math.max(0, Math.min(20, Number(e.target.value) || 0)) })} aria-label={u.name} />
                    </div>
                ))}
            </fieldset>
            <div className="mb-3 grid grid-cols-2 gap-2">
                <input className={input} placeholder={c.first} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} autoComplete="given-name" />
                <input className={input} placeholder={c.last} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} autoComplete="family-name" />
                <input className={`${input} col-span-2`} type="email" placeholder={c.email} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
                <input className={`${input} col-span-2`} type="tel" placeholder={c.phone} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
            </div>
            <label className="mb-3 flex items-start gap-2">
                <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} className="mt-1" />
                <span>
                    {c.consent}{' '}
                    <a href={LEGAL_PATHS.privacy} className="text-[#7CC4FF] underline" target="_blank" rel="noopener">
                        {c.privacy}
                    </a>
                </span>
            </label>
            {error && <p className="mb-3 rounded-lg bg-red-500/15 p-2 text-red-200" role="alert">{error}</p>}
            <button type="button" disabled={!canPay} onClick={pay} className="w-full rounded-xl bg-[#FFB400] px-4 py-3 font-semibold text-[#0B1430] disabled:opacity-50">
                {busy ? c.paying : c.pay}
            </button>
            <p className="mt-2 text-xs">{c.note}</p>
        </section>
    );
}
