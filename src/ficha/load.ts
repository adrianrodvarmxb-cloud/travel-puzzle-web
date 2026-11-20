/**
 * REQ-10827 · Ficha única, ola 6 (plan §2: `load.ts`, «lectura; recibe base, banderas y reloj por parámetro»).
 * Orquestación de la raíz del dominio: no importa Prisma, D1 ni `fetch`; recibe por parámetro quién trae el modelo
 * (un adaptador ya aplicado sobre la fila de la base), las banderas y el reloj (DIP). Pasos fijos:
 * 1. pide el modelo a la fuente; si no hay, `not-found`;
 * 2. lo valida con el esquema (`checkFicha`): un registro malo se descarta y se registra, no tumba la página
 *    (blindaje de publicación, punto 8);
 * 3. aplica el mínimo de calidad (decisión 50) solo con `PROVIDER_QUALITY_GATE_ENABLED`;
 * 4. devuelve el modelo con la hora de lectura (para la caché de 5 minutos de la ola 9).
 */
import { hiddenByQuality } from "./lib/quality";
import type { FichaModel } from "./lib/model";
import { checkFicha } from "./schemas/ficha";

export interface LoadFlags { qualityGate: boolean }

export interface LoadDeps {
  /** Trae el modelo crudo (salida de un adaptador) o null si no existe. */
  source: () => Promise<unknown | null>;
  flags: LoadFlags;
  now: () => Date;
  /** Registro de descartes; nunca lanza. */
  log?: (event: { kind: "invalid" | "hidden"; reason: string }) => void;
}

export type LoadResult =
  | { ok: true; ficha: FichaModel; readAt: string }
  | { ok: false; reason: "not-found" | "invalid" | "hidden"; detail: string | null };

// REQ-10827
export async function loadFicha(deps: LoadDeps): Promise<LoadResult> {
  const raw = await deps.source();
  if (raw === null || raw === undefined) return { ok: false, reason: "not-found", detail: null };
  const check = checkFicha(raw);
  if (!check.ok) {
    deps.log?.({ kind: "invalid", reason: check.reason });
    return { ok: false, reason: "invalid", detail: check.reason };
  }
  if (hiddenByQuality(check.ficha, { gateEnabled: deps.flags.qualityGate })) {
    deps.log?.({ kind: "hidden", reason: `calidad: ${check.ficha.provider} ${check.ficha.id}` });
    return { ok: false, reason: "hidden", detail: "mínimo de calidad" };
  }
  return { ok: true, ficha: check.ficha, readAt: deps.now().toISOString() };
}

/** Lee las banderas del entorno sin tocar `process.env` aquí: el que llama pasa el diccionario. */
// REQ-10827
export function loadFlags(env: Record<string, string | undefined>): LoadFlags {
  return { qualityGate: env.PROVIDER_QUALITY_GATE_ENABLED === "true" };
}
