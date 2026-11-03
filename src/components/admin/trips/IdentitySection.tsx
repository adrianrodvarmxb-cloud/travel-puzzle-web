'use client';
import { useState } from 'react';
import { TRIP_KINDS, KIND_LABEL } from '@/trips/lib/trip';
import { tripCode, TP_INITIALS } from '@/trips/lib/code';
import { CATEGORIES, CATEGORY_LABEL } from '@/trips/schemas/trip';
import { Section, Field, Input, Select, smallBtn } from './fields';
import type { TripFormState, Patch, AgencyOption } from './types';

/** Agencia, código automático (vista previa), tipo, venta y categoría. */
export function IdentitySection({ v, patch, agencies, onAgencyCreated, savedCode, codeLocked }: {
    v: TripFormState; patch: Patch; agencies: AgencyOption[]; onAgencyCreated: (a: AgencyOption) => void; savedCode: string | null; codeLocked: boolean;
}) {
    const [newAgency, setNewAgency] = useState('');
    const [agencyError, setAgencyError] = useState<string | null>(null);
    const initials = v.agencyId ? agencies.find((a) => a.id === v.agencyId)?.initials ?? 'AG' : TP_INITIALS;
    const preview = codeLocked && savedCode ? savedCode : tripCode({ initials, countries: v.countries, kind: v.kind, durationDays: v.durationDays, seq: 0 }).replace(/-000$/, savedCode ? `-${savedCode.split('-').pop()}` : '-###');

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
        <Section n={1} title="Identidad">
            <div className="rounded-xl border border-[#008DFF]/40 bg-[#008DFF]/10 p-3">
                <span className="font-data block text-[10px] uppercase tracking-wider text-[#9AAEE0]">Código {codeLocked ? '(fijo: ya se publicó)' : '(se genera solo)'}</span>
                <span className="font-mono text-lg font-bold text-white">{preview}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Agencia">
                    <Select value={v.agencyId ?? ''} onChange={(e) => patch({ agencyId: e.target.value || null })} disabled={codeLocked}>
                        <option value="">Travel Puzzle (TP)</option>
                        {agencies.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.initials ?? '—'})</option>)}
                    </Select>
                </Field>
                <Field label="Nueva agencia" hint="Sus siglas se sugieren solas a partir del nombre.">
                    <div className="flex gap-2">
                        <Input value={newAgency} onChange={(e) => setNewAgency(e.target.value)} placeholder="Nombre de la agencia" />
                        <button type="button" className={smallBtn} disabled={newAgency.trim().length < 2} onClick={createAgency}>Agregar</button>
                    </div>
                    {agencyError && <span className="mt-1 block text-xs text-[#FF8A73]">{agencyError}</span>}
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
                <Field label="Categoría">
                    <Select value={v.category ?? ''} onChange={(e) => patch({ category: (e.target.value || null) as TripFormState['category'] })}>
                        <option value="">Sin categoría</option>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                    </Select>
                </Field>
            </div>
        </Section>
    );
}
