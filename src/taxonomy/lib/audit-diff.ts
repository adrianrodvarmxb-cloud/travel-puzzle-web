/**
 * REQ-871: compara dos corridas de la auditoría de tipos (antes / después de un cambio del clasificador) por
 * proveedor + id: qué cambió de formato y los conteos por proveedor y formato. Puro (el script hace la lectura).
 */
export interface AuditRow { proveedor: string; id: string; formato: string }

export interface AuditDiff {
  cambios: { proveedor: string; id: string; antes: string; despues: string }[];
  /** proveedor → formato → { antes, despues } */
  conteos: Record<string, Record<string, { antes: number; despues: number }>>;
  /** proveedor → «antes → después» → cuántos */
  movimientos: Record<string, Record<string, number>>;
}

// REQ-871
export function diffAuditoria(antes: readonly AuditRow[], despues: readonly AuditRow[]): AuditDiff {
  const key = (r: AuditRow) => `${r.proveedor}\u0000${r.id}`;
  const prev = new Map(antes.map((r) => [key(r), r]));
  const conteos: AuditDiff["conteos"] = {};
  const bump = (p: string, f: string, k: "antes" | "despues") => {
    const byF = (conteos[p] ??= {});
    (byF[f] ??= { antes: 0, despues: 0 })[k] += 1;
  };
  for (const r of antes) bump(r.proveedor, r.formato, "antes");
  for (const r of despues) bump(r.proveedor, r.formato, "despues");
  const cambios: AuditDiff["cambios"] = [];
  const movimientos: AuditDiff["movimientos"] = {};
  for (const r of despues) {
    const a = prev.get(key(r));
    if (!a || a.formato === r.formato) continue;
    cambios.push({ proveedor: r.proveedor, id: r.id, antes: a.formato, despues: r.formato });
    const m = (movimientos[r.proveedor] ??= {});
    const k = `${a.formato} → ${r.formato}`;
    m[k] = (m[k] ?? 0) + 1;
  }
  return { cambios, conteos, movimientos };
}
