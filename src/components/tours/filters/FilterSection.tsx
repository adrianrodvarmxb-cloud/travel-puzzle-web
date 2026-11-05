'use client';
import type { ReactNode } from 'react';

/** Sección de filtros con título (estilo Civitatis). */
export function FilterSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <fieldset className="border-t border-white/10 py-5 first:border-t-0 first:pt-0">
            <legend className="mb-3 font-display text-lg font-bold text-white">{title}</legend>
            {children}
        </fieldset>
    );
}

/** Casilla con texto grande, fácil de tocar en celular. */
export function FilterCheck({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className="flex cursor-pointer items-center gap-3 py-1.5 text-[15px] text-[#DCE4F5]">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 shrink-0 accent-[#EAF54F]" />
            {label}
        </label>
    );
}
