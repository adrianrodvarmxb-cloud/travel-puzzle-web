/**
 * REQ-10763 (definición REQ-10761, PO 17-11-2026: «la respuesta de la API OCTO» es el documento original de Big Bus).
 * PURO: convierte la respuesta de `GET /products` en los items del archivo crudo (`archiveRawItems`), uno por producto:
 * - `body` íntegro, tal cual llegó (incluido lo que el esquema de la ficha descarta); solo vive en R2 PRIVADO;
 * - `externalId` = id del producto OCTO;
 * - `experience` = el viaje de Travel Puzzle de su ciudad (`Trip.id`), para que «¿de dónde salió esta ficha?» se
 *   responda con una igualdad en `ProviderRecord` (REQ-10576). Sin ciudad única no se inventa liga;
 * - `original` = el nombre interno del producto (REQ-753, denominación original del proveedor).
 * Sin red, sin R2, sin D1 y sin reloj.
 */
import type { RawItem } from "@/ingest/lib/archive-plan";
import { matchCity, type CityKeywords } from "./catalog";
import type { OctoProduct } from "./schemas";

export interface BigBusRawInput {
  /** La respuesta íntegra (`raw` de `getProducts`). */
  raw: unknown[];
  /** Los productos que pasaron el esquema (`items` de `getProducts`). */
  parsed: OctoProduct[];
  map: CityKeywords;
  /** `Trip.id` de una ciudad del import de Big Bus (`idFor("BBT", ref)`). */
  tripIdFor: (cityRef: string) => string;
}

const idOf = (body: unknown): string | null => {
  const v = (body as { id?: unknown } | null)?.id;
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
};

// REQ-10763
export function bigBusRawItems(input: BigBusRawInput): RawItem[] {
  const byId = new Map(input.parsed.map((p) => [p.id, p]));
  return input.raw.map((body) => {
    const externalId = idOf(body);
    const product = externalId ? byId.get(externalId) : undefined;
    if (!product) return { externalId, body, schemaOk: false, experience: null, sourceRef: null, original: null };
    const cityRef = matchCity(product, input.map);
    return {
      externalId,
      body,
      schemaOk: true,
      experience: cityRef ? { kind: "trip", id: input.tripIdFor(cityRef) } : null,
      sourceRef: cityRef,
      original: { field: "internalName", value: product.internalName },
    };
  });
}
