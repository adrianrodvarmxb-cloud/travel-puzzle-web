/**
 * REQ-1518 / REQ-1520: lote de dificultad 1–5 revisado (firma del PO, REQ-1519) → SQL por id para D1, su regreso y la
 * verificación. Puro: no lee D1 ni archivos. Un traslado nunca lleva nivel; un id que no está en D1 no se toca.
 */
import { z } from "zod";

const zViaje = z
  .object({ id: z.string().regex(/^[a-z0-9-]+$/), ref: z.string(), kind: z.string(), nivel: z.number().int().min(1).max(5).nullable() })
  .refine((v) => !(v.kind === "transporte" && v.nivel !== null), "un traslado no lleva dificultad");
const zLote = z.object({ viajes: z.array(zViaje).min(1) });

export type Lote = z.infer<typeof zLote>;
export interface FilaD1 { id: string; kind: string; difficultyLevel: number | null }
export interface Cambio { id: string; antes: number | null; despues: number | null }
export interface PlanDificultad { cambios: Cambio[]; faltan: string[]; omitidos: string[]; sql: string; regreso: string }

export function leerLote(datos: unknown): Lote {
  const lote = zLote.parse(datos);
  if (new Set(lote.viajes.map((v) => v.id)).size !== lote.viajes.length) throw new Error("ids repetidos en el lote");
  return lote;
}

const valor = (n: number | null) => (n === null ? "NULL" : String(n));
const update = (id: string, n: number | null) => `UPDATE "Trip" SET "difficultyLevel" = ${valor(n)} WHERE "id" = '${id}';`;

export function planDificultad(lote: Lote, filas: FilaD1[]): PlanDificultad {
  const porId = new Map(filas.map((f) => [f.id, f]));
  const cambios: Cambio[] = [];
  const faltan: string[] = [];
  const omitidos: string[] = [];
  for (const v of lote.viajes) {
    const f = porId.get(v.id);
    if (!f) { faltan.push(v.id); continue; }
    const despues = f.kind === "transporte" ? null : v.nivel;
    if (f.kind === "transporte" && v.nivel !== null) omitidos.push(v.id);
    const antes = f.difficultyLevel ?? null;
    if (antes !== despues) cambios.push({ id: v.id, antes, despues });
  }
  return {
    cambios, faltan, omitidos,
    sql: cambios.map((c) => update(c.id, c.despues)).join("\n") + (cambios.length ? "\n" : ""),
    regreso: cambios.map((c) => update(c.id, c.antes)).join("\n") + (cambios.length ? "\n" : ""),
  };
}

export function verificarDificultad(plan: PlanDificultad, despues: { id: string; difficultyLevel: number | null }[]): { ok: boolean; mal: string[] } {
  const leido = new Map(despues.map((f) => [f.id, f.difficultyLevel ?? null]));
  const mal = plan.cambios.filter((c) => leido.get(c.id) !== c.despues).map((c) => c.id);
  return { ok: mal.length === 0, mal };
}
