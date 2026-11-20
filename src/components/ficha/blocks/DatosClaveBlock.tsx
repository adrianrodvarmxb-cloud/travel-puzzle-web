import type { KeyFactRow } from '@/ficha/lib/key-facts';

/**
 * REQ-10815 · Bloque 5 «Datos clave» de la ficha única. Solo pinta las filas con dato (ISP); sin filas no pinta nada
 * (nunca casillas vacías ni «N/D»). Sin hooks: sirve en servidor (DIP).
 */
export function DatosClaveBlock({ rows }: { rows: KeyFactRow[] }) {
    if (rows.length === 0) return null;
    return (
        <dl data-bloque="datos-clave" className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            {rows.map((r) => (
                <div key={r.id} data-dato={r.id} className="rounded-xl border border-white/10 bg-[#121D45] p-3">
                    <dt className="font-data text-[11px] uppercase tracking-[0.15em] text-[#A9B6D6]">{r.label}</dt>
                    <dd className="mt-1 text-sm font-semibold text-white">{r.value}</dd>
                </div>
            ))}
        </dl>
    );
}
