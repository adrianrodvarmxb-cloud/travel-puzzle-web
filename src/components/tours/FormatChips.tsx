'use client';

import type { FormatChip } from '@/tours/lib/format-chips';

/**
 * REQ-546…549: fila de chips de /tours con los tipos principales (mismas etiquetas que la tarjeta). Presentacional:
 * recibe los chips calculados (format-chips.ts) y avisa cuál se eligió; el filtro es ?formato= de T4.
 */
export function FormatChips({ chips, value, onChange }: { chips: FormatChip[]; value: string | null; onChange: (slug: string | null) => void }) {
    if (chips.length < 2) return null;
    return (
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Tipo de experiencia" data-testid="format-chips">
            {chips.map((c) => (
                <button key={c.slug ?? 'todo'} type="button" aria-pressed={value === c.slug} onClick={() => onChange(c.slug)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${value === c.slug ? 'border-[#EAF54F] bg-[#EAF54F] text-[#0A1330]' : 'border-white/20 text-white hover:border-white/50'}`}>
                    {c.label}
                </button>
            ))}
        </div>
    );
}
