'use client';
import { useState } from 'react';
import { TRIP_KINDS, KIND_LABEL, CURRENCIES } from '@/trips/lib/trip';
import { Section, Field, Input, TextArea, Select, smallBtn } from './fields';
import { splitList, toNumber, type TripFormState, type Patch, type AgencyOption } from './types';

/** Agencia, código, tipo, textos, países, duración y precio. */
export function BasicsSection({ v, patch, agencies, onAgencyCreated }: { v: TripFormState; patch: Patch; agencies: AgencyOption[]; onAgencyCreated: (a: AgencyOption) => void }) {
    const [newAgency, setNewAgency] = useState('');
    const [agencyError, setAgencyError] = useState<string | null>(null);

    async function createAgency() {
        setAgencyError(null);
        const res = await fetch('/api/admin/agencias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newAgency }) });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) return setAgencyError(json.error ?? 'No se pudo crear la agencia');
        onAgencyCreated(json);
        patch({ agencyId: json.id });
        setNewAgency('');
    }

    return (
        <Section n={1} title="Datos del viaje">
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Agencia">
                    <Select value={v.agencyId ?? ''} onChange={(e) => patch({ agencyId: e.target.value || null })}>
                        <option value="">Travel Puzzle (propio)</option>
                        {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </Select>
                </Field>
                <Field label="Nueva agencia" hint="Escribe el nombre y agrégala; queda seleccionada.">
                    <div className="flex gap-2">
                        <Input value={newAgency} onChange={(e) => setNewAgency(e.target.value)} placeholder="Nombre de la agencia" />
                        <button type="button" className={smallBtn} disabled={newAgency.trim().length < 2} onClick={createAgency}>Agregar</button>
                    </div>
                    {agencyError && <span className="mt-1 block text-xs text-[#FF8A73]">{agencyError}</span>}
                </Field>
                <Field label="Código" hint="Ejemplo: FCHTP">
                    <Input value={v.code} onChange={(e) => patch({ code: e.target.value.toUpperCase() })} maxLength={20} />
                </Field>
                <Field label="Tipo">
                    <Select value={v.kind} onChange={(e) => patch({ kind: e.target.value as TripFormState['kind'] })}>
                        {TRIP_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                    </Select>
                </Field>
                <Field label="Cómo se vende">
                    <Select value={v.purchaseMode} onChange={(e) => patch({ purchaseMode: e.target.value as TripFormState['purchaseMode'] })}>
                        <option value="quote">Cotización</option>
                        <option value="buy">Compra (se activa cuando haya pagos en línea)</option>
                    </Select>
                </Field>
                <Field label="Duración (días)">
                    <Input type="number" min={1} value={v.durationDays ?? ''} onChange={(e) => patch({ durationDays: toNumber(e.target.value) })} />
                </Field>
            </div>
            <Field label="Título (español)"><Input value={v.titleEs} onChange={(e) => patch({ titleEs: e.target.value })} maxLength={140} /></Field>
            <Field label="Título (inglés)" hint="Opcional"><Input value={v.titleEn} onChange={(e) => patch({ titleEn: e.target.value })} maxLength={140} /></Field>
            <Field label="Resumen corto (español)"><TextArea rows={2} value={v.summaryEs} onChange={(e) => patch({ summaryEs: e.target.value })} maxLength={400} /></Field>
            <Field label="Descripción (español)"><TextArea rows={6} value={v.descriptionEs} onChange={(e) => patch({ descriptionEs: e.target.value })} /></Field>
            <Field label="Descripción (inglés)" hint="Opcional"><TextArea rows={4} value={v.descriptionEn} onChange={(e) => patch({ descriptionEn: e.target.value })} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Países que visita" hint="Separados por coma; se muestran debajo del título.">
                    <Input defaultValue={v.countries.join(', ')} onBlur={(e) => patch({ countries: splitList(e.target.value) })} />
                </Field>
                <Field label="Ciudades" hint="Separadas por coma.">
                    <Input defaultValue={v.cities.join(', ')} onBlur={(e) => patch({ cities: splitList(e.target.value) })} />
                </Field>
                <Field label="Precio desde (por persona)" hint={v.kind === 'personalizado' ? 'Opcional en personalizados.' : undefined}>
                    <div className="flex gap-2">
                        <Input type="number" min={0} step="0.01" value={v.priceFrom ?? ''} onChange={(e) => patch({ priceFrom: toNumber(e.target.value) })} />
                        <Select value={v.currency} onChange={(e) => patch({ currency: e.target.value as TripFormState['currency'] })} style={{ width: 110 }}>
                            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </Select>
                    </div>
                </Field>
                <Field label="Nota del precio" hint="Ejemplo: en habitación doble, sin vuelos.">
                    <Input value={v.priceNote} onChange={(e) => patch({ priceNote: e.target.value })} maxLength={200} />
                </Field>
            </div>
        </Section>
    );
}
