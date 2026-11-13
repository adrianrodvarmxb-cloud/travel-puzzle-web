'use client';
import { PolicyLink } from './PolicyLink';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { tripCopy } from '@/trips/lib/copy';
import { availableTimes, estimate } from '@/trips/lib/request';
import { formatMoney } from '@/trips/lib/money';
import { LEGAL_PATHS } from '@/legal/lib/labels';
import type { TripOption, Season } from '@/trips/lib/pricing';

interface Props {
    tripId: string;
    custom: boolean;
    currency: 'MXN' | 'USD' | 'EUR';
    options: TripOption[];
    availability: { weekdays: number[]; slots: { time: string; capacity: number | null }[]; closedDates: string[]; seasons: Season[] };
    minNoticeHours: number;
    hotelPickup: boolean;
    lang: string;
    returnPath: string;
    /** REQ-040: resumen de la política de cancelación que el cliente acepta al enviar. */
    policy?: string;
    /** REQ-060: detalle de la política (se abre en ventana desde la casilla). */
    policyItems?: string[];
    policyTitle?: string;
    closeLabel?: string;
    /** REQ-059: título y nota del formulario para viajes con precio. */
    bookTitle?: string;
    bookNote?: string;
    /** REQ-150: fecha y personas que manda el agente de WhatsApp en la liga (?fecha=&adultos=&ninos=). Opcional. */
    prellenado?: { fecha?: string; adultos?: number; ninos?: number };
}

const field = 'w-full rounded-xl border border-white/15 bg-[#0A1330] px-3.5 py-2.5 text-sm text-white placeholder:text-[#5F73AD] focus:border-[#008DFF] focus:outline-none';
const label = 'mb-1 block text-xs font-semibold text-[#C9D6F5]';

/** Formulario de la ficha (documento 2024): reserva (fecha + horario + opción) o personalizado. */
export function TripRequestForm(p: Props) {
    const c = tripCopy(p.lang);
    const router = useRouter();
    const [date, setDate] = useState(p.custom ? '' : p.prellenado?.fecha ?? '');
    const [time, setTime] = useState('');
    const [optionId, setOptionId] = useState(p.options[0]?.id ?? '');
    const [pax, setPax] = useState({ adults: p.prellenado?.adultos ?? 2, children: p.prellenado?.ninos ?? 0, infants: 0 });
    const [ages, setAges] = useState<number[]>(() => Array.from({ length: p.prellenado?.ninos ?? 0 }, () => 7));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const now = useMemo(() => new Date(), []);
    const times = date ? availableTimes(date, p.availability, p.minNoticeHours, now) : [];
    const option = p.options.find((o) => o.id === optionId) ?? null;
    const est = !p.custom && date ? estimate(option, pax, date, p.availability.seasons) : null;
    const setChildren = (n: number) => { setPax({ ...pax, children: n }); setAges((a) => Array.from({ length: n }, (_, i) => a[i] ?? 7)); };

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        const f = new FormData(e.currentTarget);
        const common = {
            tripId: p.tripId, firstName: f.get('firstName'), lastName: f.get('lastName'), email: f.get('email'), phone: f.get('phone'),
            adults: pax.adults, children: pax.children, infants: pax.infants, childAges: ages, hotel: f.get('hotel') ?? '', comments: f.get('comments') ?? '',
            consent: f.get('consent') === 'on', language: p.lang, website: f.get('website') ?? '',
        };
        const body = p.custom
            ? { kind: 'personalizado', startDate: f.get('startDate'), endDate: f.get('endDate'), serviceType: f.get('serviceType'), ...common }
            : { kind: 'reserva', date, time, optionId, ...common };
        setBusy(true);
        const res = await fetch('/api/viajes/solicitud', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const json = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) return setError(json.error ?? 'No se pudo enviar');
        // REQ-3482: con la retención encendida el servidor devuelve el checkout de Stripe (solo https://checkout.stripe.com).
        if (typeof json.checkoutUrl === 'string' && json.checkoutUrl.startsWith('https://checkout.stripe.com/')) { window.location.assign(json.checkoutUrl); return; }
        router.push(`/viajes/gracias?folio=${encodeURIComponent(json.ref)}&volver=${encodeURIComponent(p.returnPath)}`);
    }

    const counter = (key: 'adults' | 'children' | 'infants', min: number) => (
        <div>
            <span className={label}>{c[key]}</span>
            <input type="number" min={min} max={99} value={pax[key]} className={field}
                onChange={(e) => { const n = Math.max(min, Number(e.target.value) || 0); if (key === 'children') setChildren(n); else setPax({ ...pax, [key]: n }); }} />
        </div>
    );

    return (
        <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-white/10 bg-[#121D45] p-5" id="solicitar">
            <h2 className="font-display text-xl font-semibold text-white">{p.custom ? c.formTitleCustom : p.bookTitle ?? c.formTitle}</h2>
            {!p.custom && p.bookNote && <p className="mt-1 text-sm font-semibold text-[#7EE2A8]">{p.bookNote}</p>}
            {p.custom ? (
                <div className="grid grid-cols-2 gap-2">
                    <label><span className={label}>{c.start}</span><input name="startDate" type="date" required className={field} defaultValue={p.prellenado?.fecha} /></label>
                    <label><span className={label}>{c.end}</span><input name="endDate" type="date" required className={field} /></label>
                    <label className="col-span-2"><span className={label}>{c.serviceType}</span>
                        <select name="serviceType" className={field}><option value="group">{c.group}</option><option value="private">{c.private}</option></select></label>
                </div>
            ) : (
                <>
                    <label className="block"><span className={label}>{c.date}</span>
                        <input type="date" required value={date} min={now.toISOString().slice(0, 10)} onChange={(e) => { setDate(e.target.value); setTime(''); }} className={field} /></label>
                    {date && p.availability.slots.length > 0 && (
                        times.length ? (
                            <div><span className={label}>{c.time}</span>
                                <div className="flex flex-wrap gap-2">{times.map((t) => (
                                    <button key={t} type="button" aria-pressed={time === t} onClick={() => setTime(t)} className={`rounded-full border px-3 py-1 text-sm ${time === t ? 'border-[#EAF54F] bg-[#EAF54F] text-[#0A1330]' : 'border-white/20 text-white'}`}>{t}</button>
                                ))}</div></div>
                        ) : <p className="text-xs text-[#FF8A73]">{c.noTimes}</p>
                    )}
                    {p.options.length > 1 && (
                        <label className="block"><span className={label}>{c.option}</span>
                            <select value={optionId} onChange={(e) => setOptionId(e.target.value)} className={field}>{p.options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
                    )}
                </>
            )}
            <div className="grid grid-cols-3 gap-2">{counter('adults', 1)}{counter('children', 0)}{counter('infants', 0)}</div>
            {ages.length > 0 && (
                <div className="grid grid-cols-3 gap-2">{ages.map((a, i) => (
                    <label key={i}><span className={label}>{c.childAge(i + 1)}</span><input type="number" min={0} max={17} value={a} onChange={(e) => setAges(ages.map((x, j) => (j === i ? Number(e.target.value) : x)))} className={field} /></label>
                ))}</div>
            )}
            <div className="grid grid-cols-2 gap-2">
                <input name="firstName" required placeholder={c.firstName} className={field} autoComplete="given-name" />
                <input name="lastName" required placeholder={c.lastName} className={field} autoComplete="family-name" />
            </div>
            <input name="email" type="email" required placeholder={c.email} className={field} autoComplete="email" />
            <input name="phone" type="tel" required placeholder={c.phone} className={field} autoComplete="tel" />
            {p.hotelPickup && <input name="hotel" placeholder={c.hotelName} className={field} />}
            <textarea name="comments" rows={2} placeholder={c.comments} className={field} />
            <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
            <label className="flex items-start gap-2 text-xs text-[#C9D6F5]">
                <input name="consent" type="checkbox" required className="mt-0.5" />
                <span>{c.consentA} <a href={LEGAL_PATHS.terms} target="_blank" className="underline">{c.terms}</a>{p.policyItems?.length ? <>, <PolicyLink label={c.policyAccept} title={p.policyTitle ?? c.policyAccept} items={p.policyItems} closeLabel={p.closeLabel ?? "OK"} /></> : p.policy ? <>, <a href="#cancelacion" className="underline">{c.policyAccept}</a> ({p.policy})</> : null} {c.consentB} <a href={LEGAL_PATHS.privacy} target="_blank" className="underline">{c.privacy}</a>.</span>
            </label>
            {est !== null && <p className="text-sm text-[#D5DCEE]">{c.estimate}: <strong className="text-white">{formatMoney(est, p.currency, p.lang)}</strong> <span className="block text-xs text-[#7F8DB0]">{c.estimateNote}</span></p>}
            {error && <p className="text-sm text-[#FF8A73]">{error}</p>}
            <button type="submit" disabled={busy || (!p.custom && (!date || (p.availability.slots.length > 0 && !time)))} className="w-full rounded-full bg-[#008DFF] px-5 py-3 text-sm font-bold text-white disabled:opacity-40">{busy ? c.sending : c.send}</button>
        </form>
    );
}
