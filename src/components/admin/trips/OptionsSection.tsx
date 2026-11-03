'use client';
import { CURRENCIES } from '@/trips/lib/trip';
import { priceFrom } from '@/trips/lib/pricing';
import { MAX_OPTIONS } from '@/trips/schemas/trip';
import { Section, Field, Input, Select, smallBtn } from './fields';
import { newOptionId, toNumber, type TripFormState, type Patch } from './types';

type Option = TripFormState['options'][number];

/** 1 a 4 opciones con precio adulto/niño/infante (precio final con impuestos) y extras. */
export function OptionsSection({ v, patch }: { v: TripFormState; patch: Patch }) {
    const set = (i: number, p: Partial<Option>) => patch({ options: v.options.map((o, j) => (j === i ? { ...o, ...p } : o)) });
    const from = priceFrom(v.options);
    const setExtra = (i: number, p: Partial<TripFormState['extras'][number]>) => patch({ extras: v.extras.map((x, j) => (j === i ? { ...x, ...p } : x)) });
    return (
        <Section n={5} title="Opciones y precios">
            <div className="flex flex-wrap items-end gap-4">
                <Field label="Moneda">
                    <Select value={v.currency} onChange={(e) => patch({ currency: e.target.value as TripFormState['currency'] })} style={{ width: 120 }}>
                        {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </Select>
                </Field>
                <p className="pb-2 text-sm text-[#D5DCEE]">Desde: <strong className="text-white">{from !== null ? `${v.currency} ${from.toLocaleString('es-MX')}` : '—'}</strong> <span className="text-xs text-[#7F8DB0]">(se calcula solo; precios finales con impuestos)</span></p>
            </div>
            {v.options.map((o, i) => (
                <div key={o.id} className="space-y-3 rounded-xl border border-white/10 p-3">
                    <div className="grid gap-2 sm:grid-cols-[1.5fr_1fr_auto]">
                        <Input placeholder="Nombre de la opción (ej. En grupo, Privado, Premium, Tren 1ª)" value={o.name} onChange={(e) => set(i, { name: e.target.value })} />
                        <Select value={o.mode} onChange={(e) => set(i, { mode: e.target.value as Option['mode'] })}>
                            <option value="group">En grupo</option>
                            <option value="private">Privado</option>
                        </Select>
                        <button type="button" className={smallBtn} disabled={v.options.length <= 1} onClick={() => patch({ options: v.options.filter((_, j) => j !== i) })}>Quitar</button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <Field label="Adulto"><Input type="number" min={0} step="0.01" value={o.adult ?? ''} onChange={(e) => set(i, { adult: toNumber(e.target.value) })} /></Field>
                        <Field label="Niño"><Input type="number" min={0} step="0.01" value={o.child ?? ''} onChange={(e) => set(i, { child: toNumber(e.target.value) })} /></Field>
                        <Field label="Infante"><Input type="number" min={0} step="0.01" value={o.infant ?? ''} onChange={(e) => set(i, { infant: toNumber(e.target.value) })} /></Field>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#D5DCEE]">
                        Niño de
                        <Input type="number" min={0} max={17} value={o.childAgeMin} onChange={(e) => set(i, { childAgeMin: Number(e.target.value) })} style={{ width: 70 }} />
                        a
                        <Input type="number" min={0} max={17} value={o.childAgeMax} onChange={(e) => set(i, { childAgeMax: Number(e.target.value) })} style={{ width: 70 }} />
                        años
                    </div>
                </div>
            ))}
            <button type="button" className={smallBtn} disabled={v.options.length >= MAX_OPTIONS} onClick={() => patch({ options: [...v.options, { id: newOptionId(), name: '', mode: 'group', adult: null, child: null, infant: null, childAgeMin: 3, childAgeMax: 11 }] })}>
                + Opción ({v.options.length}/{MAX_OPTIONS})
            </button>
            <Field label="Nota del precio" hint="Ej.: no incluye entradas a museos."><Input value={v.priceNote} onChange={(e) => patch({ priceNote: e.target.value })} maxLength={200} /></Field>
            <Field label="Extras opcionales" hint="Ej.: fotos profesionales, comida, tour opcional.">
                <div className="space-y-2">
                    {v.extras.map((x, i) => (
                        <div key={i} className="grid gap-2 sm:grid-cols-[1.5fr_1fr_auto_auto]">
                            <Input placeholder="Nombre" value={x.name} onChange={(e) => setExtra(i, { name: e.target.value })} />
                            <Input type="number" min={0} step="0.01" placeholder="Precio" value={x.price} onChange={(e) => setExtra(i, { price: Number(e.target.value) })} />
                            <label className="flex items-center gap-1 text-xs text-white"><input type="checkbox" checked={x.perPerson} onChange={(e) => setExtra(i, { perPerson: e.target.checked })} /> por persona</label>
                            <button type="button" className={smallBtn} onClick={() => patch({ extras: v.extras.filter((_, j) => j !== i) })}>×</button>
                        </div>
                    ))}
                    <button type="button" className={smallBtn} onClick={() => patch({ extras: [...v.extras, { name: '', price: 0, perPerson: true }] })}>+ Extra</button>
                </div>
            </Field>
        </Section>
    );
}
