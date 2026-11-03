'use client';
import { Section, Field, Input, TextArea, smallBtn } from './fields';
import { splitLines, type TripFormState, type Patch } from './types';

/** Itinerario por día, incluye / no incluye y visa. */
export function ContentSection({ v, patch }: { v: TripFormState; patch: Patch }) {
    const setDay = (i: number, p: Partial<{ title: string; text: string }>) => patch({ itinerary: v.itinerary.map((d, j) => (j === i ? { ...d, ...p } : d)) });
    return (
        <Section n={4} title="Itinerario, incluye y requisitos">
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
            <button type="button" className={smallBtn} onClick={() => patch({ itinerary: [...v.itinerary, { title: '', text: '' }] })}>+ Día</button>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Incluye" hint="Uno por línea.">
                    <TextArea rows={5} defaultValue={v.includes.join('\n')} onBlur={(e) => patch({ includes: splitLines(e.target.value) })} />
                </Field>
                <Field label="No incluye" hint="Uno por línea.">
                    <TextArea rows={5} defaultValue={v.excludes.join('\n')} onBlur={(e) => patch({ excludes: splitLines(e.target.value) })} />
                </Field>
            </div>
            <Field label="Visa y requisitos"><TextArea rows={4} value={v.visaInfo} onChange={(e) => patch({ visaInfo: e.target.value })} /></Field>
        </Section>
    );
}
