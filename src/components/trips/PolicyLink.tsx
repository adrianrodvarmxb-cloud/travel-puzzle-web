'use client';
import { useRef } from 'react';

/** REQ-060: la política de cancelación solo se consulta desde la casilla de aceptación (ventana), no en el cuerpo de la ficha. */
export function PolicyLink({ label, title, items, closeLabel }: { label: string; title: string; items: string[]; closeLabel: string }) {
    const ref = useRef<HTMLDialogElement>(null);
    return (
        <>
            <button type="button" onClick={() => ref.current?.showModal()} className="underline">{label}</button>
            <dialog ref={ref} aria-label={title} className="m-auto w-[min(92vw,480px)] rounded-2xl border border-white/15 bg-[#121D45] p-6 text-[#DCE4F5] backdrop:bg-[#0A1330]/80" onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}>
                <h2 className="font-display text-xl font-bold text-white">{title}</h2>
                <ul className="mt-3 space-y-2 text-sm">{items.map((t) => <li key={t}>• {t}</li>)}</ul>
                <button type="button" onClick={() => ref.current?.close()} className="mt-5 w-full rounded-full bg-[#EAF54F] px-5 py-3 font-bold text-[#0A1330]">{closeLabel}</button>
            </dialog>
        </>
    );
}
