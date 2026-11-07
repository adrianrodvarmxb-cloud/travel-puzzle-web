/**
 * REQ-740: huella del crudo de un proveedor (Ola R1, copia exacta). Pura.
 * Se calcula sobre el JSON canónico (llaves ordenadas) SIN los campos volátiles que declara cada proveedor;
 * esos campos salen solo del cálculo, nunca de la copia: el objeto que se guarda en R2 es el item íntegro.
 * Decisión firmada del PO (6 nov 2026): versión nueva solo cuando cambia la huella.
 */
import { canonicalJson } from "@/catalog/lib/content-hash";

/**
 * Campos que cambian sin que cambie el producto. Se revisan por proveedor (un exceso ocultaría cambios reales).
 * - freetour: `updatedAt` (marca de tiempo del proveedor; se guarda aparte como providerUpdatedAt) y los contadores
 *   de reseñas `rating` / `reviewsNumber` (cambian con cada reseña; misma regla que el content_hash, REQ-073).
 * - agencias por archivo: ninguno (el item es un registro editado a mano; todo cambio es real).
 */
export const VOLATILE_FIELDS: Record<string, readonly string[]> = {
  freetour: ["updatedAt", "rating", "reviewsNumber"],
  extime: [],
  exoticescapes: [],
  bigbus: [],
  incaworld: [],
  destinocolombia: [],
  fantasticachina: [],
  turismoasiatico: [],
};

/** Copia superficial del item sin los volátiles del proveedor (solo para hashear). */
// REQ-740
export function hashView(provider: string, item: unknown): unknown {
  const volatile = VOLATILE_FIELDS[provider];
  if (!volatile) throw new Error(`proveedor ${provider} sin campos volátiles declarados (src/ingest/lib/raw-hash.ts)`);
  if (item === null || typeof item !== "object" || Array.isArray(item)) return item;
  const view: Record<string, unknown> = { ...(item as Record<string, unknown>) };
  for (const k of volatile) delete view[k];
  return view;
}

export async function sha256Hex(text: string | Uint8Array): Promise<string> {
  const bytes = typeof text === "string" ? new TextEncoder().encode(text) : text;
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** sha-256 hex del JSON canónico del item sin volátiles. */
// REQ-740
export async function rawHash(provider: string, item: unknown): Promise<string> {
  return sha256Hex(canonicalJson(hashView(provider, item)));
}
