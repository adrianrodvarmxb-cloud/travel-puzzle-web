'use client';
import { useMemo, useState } from 'react';
import { COUNTRY_CODES, continentOf, countryName, CONTINENT_LABEL } from '@/trips/lib/geo';
import { GUIDE_LANGUAGES } from '@/trips/schemas/trip';
import { Section, Field, Input, TextArea, smallBtn } from './fields';
import { splitList, toNumber, type TripFormState, type Patch } from './types';

const LANG_LABEL: Record<string, string> = { es: 'Español', en: 'Inglés', pt: 'Portugués', fr: 'Francés', de: 'Alemán', it: 'Italiano', ja: 'Japonés', zh: 'Chino', ko: 'Coreano' };

/** Países (ISO, continente automático), ciudades, duración, vuelos, idiomas, cupo e itinerario. */
export function DestinationSection({ v, patch }: { v: TripFormState; patch: Patch }) {
    const [pick, setPick] = useState('');
    const countries = useMemo(() => COUNTRY_CODES.map((c) => ({ c, n: countryName(c) })).sort((a, b) => a.n.localeCompare(b.n, 'es')), []);
    const continents = [...new Set(v.countries.map(continentOf).filter(Boolean))] as (keyof typeof CONTINENT_LABEL)[];
    const setDay = (i: number, p: Partial<{ title: string; text: string }>) => patch({ itinerary: v.itinerary.map((d, j) => (j === i ? { ...d, ...p } : d)) });
    const toggleLang = (l: TripFormState['languages'][number]) => patch({ languages: v.languages.includes(l) ? v.languages.filter((x) => x !== l) : [...v.languages, l] });

    return (
        <Section n={3} title="Destino y logística">
            <Field label="Países" hint={continents.length ? `Continente: ${continents.map((c) => CONTINENT_LABEL[c]).join(', ')}` : 'El continente se calcula solo.'}>
                <div className="flex flex-wrap gap-2">
                    {v.countries.map((c) => (
                        <span key={c} className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
                            {countryName(c)} <button type="button" aria-label={`Quitar ${countryName(c)}`} onClick={() => patch({ countries: v.countries.filter((x) => x !== c) })}>×</button>
                        </span>
                    ))}
                </div>
                <div className="mt-2 flex gap-2">
                    <Input list="tp-countries" value={pick} onChange={(e) => setPick(e.target.value)} placeholder="Escribe un país" />
                    <datalist id="tp-countries">{countries.map(({ c, n }) => <option key={c} value={n} />)}</datalist>
                    <button type="button" className={smallBtn} onClick={() => { const f = countries.find((x) => x.n.toLowerCase() === pick.trim().toLowerCase()); if (f && !v.countries.includes(f.c)) patch({ countries: [...v.countries, f.c] }); setPick(''); }}>Agregar</button>
                </div>
            </Field>
            <Field label="Ciudades" hint="Separadas por coma."><Input defaultValue={v.cities.join(', ')} onBlur={(e) => patch({ cities: splitList(e.target.value) })} /></Field>
            <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Duración (días)"><Input type="number" min={1} value={v.durationDays ?? ''} onChange={(e) => patch({ durationDays: toNumber(e.target.value) })} /></Field>
                <Field label="Cupo mínimo"><Input type="number" min={1} value={v.minPax ?? ''} onChange={(e) => patch({ minPax: toNumber(e.target.value) })} /></Field>
                <Field label="Cupo máximo"><Input type="number" min={1} value={v.maxPax ?? ''} onChange={(e) => patch({ maxPax: toNumber(e.target.value) })} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-white">
                <input type="checkbox" checked={v.flightsIncluded} onChange={(e) => patch({ flightsIncluded: e.target.checked })} /> Incluye vuelos
            </label>
            <Field label="Idiomas del guía">
                <div className="flex flex-wrap gap-2">
                    {GUIDE_LANGUAGES.map((l) => (
                        <button key={l} type="button" aria-pressed={v.languages.includes(l)} onClick={() => toggleLang(l)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${v.languages.includes(l) ? 'border-[#EAF54F] bg-[#EAF54F] text-[#0A1330]' : 'border-white/20 text-white'}`}>{LANG_LABEL[l]}</button>
                    ))}
                </div>
            </Field>
            <Field label="Itinerario por día">
                <ol className="space-y-3">
                    {v.itinerary.map((d, i) => (
                        <li key={i} className="rounded-xl border border-white/10 p-3">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="font-data text-[11px] uppercase tracking-wider text-[#9AAEE0]">Día {i + 1}</span>
                                <button type="button" className={smallBtn} onClick={() => patch({ itinerary: v.itinerary.filter((_, j) => j !== i) })}>Quitar</button>
                            </div>
                            <Input placeholder="Título del día" value={d.title} onChange={(e) => setDay(i, { title: e.target.value })} />
                            <div className="mt-2"><TextArea rows={3} placeholder="Qué se hace ese día" value={d.text} onChange={(e) => setDay(i, { text: e.target.value })} /></div>
                        </li>
                    ))}
                </ol>
                <button type="button" className={`${smallBtn} mt-2`} onClick={() => patch({ itinerary: [...v.itinerary, { title: '', text: '' }] })}>+ Día</button>
            </Field>
        </Section>
    );
}
