'use client';
import { Section, Input, Select, smallBtn } from './fields';
import type { TripFormState, Patch } from './types';

/** Política de cancelación (plantillas tipo Viator). */
export function PolicySection({ v, patch }: { v: TripFormState; patch: Patch }) {
    const c = v.cancellation;
    const set = (p: Partial<typeof c>) => patch({ cancellation: { ...c, ...p } });
    const setTier = (i: number, p: Partial<(typeof c.tiers)[number]>) => set({ tiers: c.tiers.map((t, j) => (j === i ? { ...t, ...p } : t)) });
    return (
        <Section n={7} title="Cancelación">
            <Select value={c.type} onChange={(e) => set({ type: e.target.value as typeof c.type, tiers: e.target.value === 'custom' && !c.tiers.length ? [{ daysBefore: 7, refundPct: 100 }, { daysBefore: 2, refundPct: 50 }] : c.tiers })}>
                <option value="standard">Estándar: reembolso total hasta 24 h antes</option>
                <option value="custom">Personalizada por días</option>
                <option value="none">Sin reembolso</option>
            </Select>
            {c.type === 'custom' && (
                <div className="space-y-2">
                    {c.tiers.map((t, i) => (
                        <div key={i} className="flex flex-wrap items-center gap-2 text-sm text-[#D5DCEE]">
                            Hasta <Input type="number" min={0} value={t.daysBefore} onChange={(e) => setTier(i, { daysBefore: Number(e.target.value) })} style={{ width: 80 }} /> días antes:
                            <Input type="number" min={0} max={100} value={t.refundPct} onChange={(e) => setTier(i, { refundPct: Number(e.target.value) })} style={{ width: 80 }} /> % de reembolso
                            <button type="button" className={smallBtn} onClick={() => set({ tiers: c.tiers.filter((_, j) => j !== i) })}>×</button>
                        </div>
                    ))}
                    <button type="button" className={smallBtn} disabled={c.tiers.length >= 6} onClick={() => set({ tiers: [...c.tiers, { daysBefore: 1, refundPct: 0 }] })}>+ Tramo</button>
                </div>
            )}
        </Section>
    );
}
