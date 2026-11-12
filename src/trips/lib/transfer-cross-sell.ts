/**
 * REQ-3428 (PO, 12 nov 2026): los traslados y el transporte turístico de proveedor entran a la franja de
 * complementos de su ciudad, junto a los viajes propios que ya salían (REQ-005/006). Entran los de TODOS los
 * proveedores con bandera encendida, no solo uno, por la regla del catálogo único (REQ-1605).
 *
 * Aquí vive la regla entera: qué fila sirve, cómo se ve su precio, en qué orden salen y dónde se recorta la
 * lista. Puro: recibe las filas y el entorno por parámetro (DIP); no importa Prisma ni D1. El I/O vive en
 * `src/trips/cross-sell-deps.ts`.
 *
 * Reglas que no se negocian:
 * - nunca se muestra el nombre del proveedor (REQ-1241/REQ-1556: `scrubName`);
 * - el precio es el público del catálogo (el mismo que la ficha), nunca el neto;
 * - un registro malo se descarta y se cuenta, no tumba la página (regla 7 del blindaje).
 */
import { hiddenProviders, type ProviderVisibilityEnv } from "@/catalog/lib/provider-visibility";
import { scrubName } from "@/tours/lib/provider-text";
import { pickByPlace, type Place } from "./match";
import type { CrossItem } from "../cross-sell";

/** Categorías de proveedor que son transporte: 29 traslado, 30 transporte turístico (archivo del PO, 4 nov 2026). */
export const TRANSFER_CATEGORY_IDS: readonly number[] = [29, 30];

/**
 * Cuántos complementos salen en total. La franja de la ficha pinta el primero y la ventana «Completa tu viaje»
 * la lista entera, así que 6 deja opciones sin volverla una segunda página de catálogo.
 */
export const MAX_COMPLEMENTS = 6;

/** Traslado de proveedor ya validado y listo para pintar. */
export interface ProviderTransfer {
  id: string;
  title: string;
  image: string | null;
  price: string | null;
  cityName: string;
  countryCode: string;
  reviews: number;
  rating: number | null;
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Título en el idioma pedido (respaldo: inglés, español) y sin el nombre del proveedor. */
// REQ-3428
export function transferTitle(titles: unknown, lang: string): string | null {
  if (!titles || typeof titles !== "object") return null;
  const t = titles as Record<string, unknown>;
  const raw = str(t[lang]) ?? str(t.en) ?? str(t.es);
  if (!raw) return null;
  // REQ-1241/REQ-1556: si el título era solo el nombre del proveedor, no queda nada que mostrar.
  return scrubName(raw).trim() || null;
}

/** Precio público del catálogo con su moneda; 0 o inválido no se pinta (la franja solo omite el precio). */
// REQ-3428
export function transferPrice(value: number | null, currency: string | null): string | null {
  if (value === null || !Number.isFinite(value) || value <= 0) return null;
  return `${currency ?? "EUR"} ${Number.isInteger(value) ? value : value.toFixed(2)}`;
}

/**
 * Valida una fila de traslado de proveedor. Devuelve `null` cuando la fila no sirve: sin id, sin ciudad,
 * sin país, sin título que mostrar, de otra categoría, o de un proveedor que el público no debe ver.
 */
// REQ-3428
export function parseProviderTransfer(raw: unknown, lang: string, env: ProviderVisibilityEnv): ProviderTransfer | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id);
  if (!id) return null;
  const categoryId = num(r.categoryId);
  if (categoryId === null || !TRANSFER_CATEGORY_IDS.includes(categoryId)) return null;
  // Segundo candado del gate C (REQ-3311): el cliente público de Prisma ya filtra, y aquí se vuelve a filtrar
  // para que una consulta cruda o un dato viejo en caché no dejen salir a un proveedor apagado.
  const providerId = str(r.providerId) ?? "freetour";
  if (hiddenProviders(env).includes(providerId)) return null;
  const cityName = str(r.cityName);
  const countryCode = str(r.countryCode);
  if (!cityName || !countryCode) return null;
  const title = transferTitle(r.titles, lang);
  if (!title) return null;
  const rating = num(r.rating);
  return {
    id,
    title,
    image: str(r.image),
    price: transferPrice(num(r.price), str(r.currency)),
    cityName,
    countryCode,
    reviews: Math.max(0, Math.trunc(num(r.reviews) ?? 0)),
    rating: rating !== null && rating > 0 ? rating : null,
  };
}

/** Lo mismo para una lista: lo que sirve y cuántos registros se descartaron (para el log, regla 8). */
// REQ-3428
export function parseProviderTransfers(rows: readonly unknown[], lang: string, env: ProviderVisibilityEnv): { ok: ProviderTransfer[]; dropped: number } {
  const ok: ProviderTransfer[] = [];
  let dropped = 0;
  for (const row of rows ?? []) {
    const t = parseProviderTransfer(row, lang, env);
    if (t) ok.push(t);
    else dropped++;
  }
  return { ok, dropped };
}

/**
 * Orden de la franja: primero los viajes propios (los que ya salían, en su orden de siempre) y luego los
 * traslados de proveedor del lugar, por reseñas de mayor a menor —la misma señal que ordena el resto del
 * catálogo—, con calificación e id como desempate para que el orden sea determinista. Sin repetidos y
 * recortada a `max`, que los propios nunca pierden porque van al frente.
 */
// REQ-3428
export function complementItems(own: readonly CrossItem[], transfers: readonly ProviderTransfer[], place: Place, max = MAX_COMPLEMENTS): CrossItem[] {
  const withPlace = transfers.map((t) => ({ ...t, cities: [t.cityName], countries: [t.countryCode] }));
  // Misma regla de lugar que los viajes propios (REQ-005): primero la ciudad y, si no hay, el país.
  const near = pickByPlace(withPlace, place, Math.max(withPlace.length, 1));
  const ordered = [...near].sort((a, b) => b.reviews - a.reviews || (b.rating ?? 0) - (a.rating ?? 0) || a.id.localeCompare(b.id));
  const fromProvider: CrossItem[] = ordered.map((t) => ({ id: t.id, path: `/tours/${t.id}`, title: t.title, image: t.image, price: t.price }));
  const out: CrossItem[] = [];
  const seen = new Set<string>();
  for (const item of [...own, ...fromProvider]) {
    if (out.length >= max) break;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}
