'use client';
/** Piezas de formulario del gestor (solo presentación). */
import type { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';

export const inputCls = 'w-full rounded-xl border border-white/15 bg-[#0A1330] px-3.5 py-2.5 text-sm text-white placeholder:text-[#5F73AD] focus:border-[#008DFF] focus:outline-none';
export const smallBtn = 'rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-semibold text-white hover:border-white/50 disabled:opacity-40';

export function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
    return (
        <fieldset className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <legend className="font-data px-1 text-[11px] uppercase tracking-[0.2em] text-[#008DFF]">{String(n).padStart(2, '0')} — {title}</legend>
            <div className="space-y-4">{children}</div>
        </fieldset>
    );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-white">{label}</span>
            {children}
            {hint && <span className="mt-1 block text-xs text-[#7F8DB0]">{hint}</span>}
        </label>
    );
}

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={inputCls} />;
export const TextArea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={4} {...p} className={inputCls} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={inputCls} />;
