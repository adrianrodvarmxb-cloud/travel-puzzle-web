/**
 * REQ-543: items crudos de una página de GET /tours, tal cual llegaron, ANTES de transformarlos (toTourRows) y antes
 * de descartar los que no traen id (la copia exacta no se filtra). Puro.
 */
import type { RawItem } from "./archive-plan";
import { freetourRawSchema } from "./contract";

// REQ-543
export function freetourRawItems(body: unknown, page: number): RawItem[] {
  const tours = (body as { data?: { tours?: unknown } } | null)?.data?.tours;
  if (!Array.isArray(tours)) return [];
  return tours.map((t) => {
    const o = (t ?? {}) as { id?: unknown; updatedAt?: unknown };
    const id = typeof o.id === "number" || (typeof o.id === "string" && o.id !== "") ? String(o.id) : null;
    return {
      externalId: id,
      body: t,
      providerUpdatedAt: typeof o.updatedAt === "string" && o.updatedAt ? o.updatedAt : null,
      experience: { kind: "tour", id: null }, // se liga por Tour.externalId (el id de Travel Puzzle se crea al publicar)
      sourceRef: `/tours?page=${page}`,
      // REQ-564: si el crudo no pasa el esquema del contrato se guarda igual (la copia no se filtra) y queda marcado.
      schemaOk: freetourRawSchema.safeParse(t).success,
    };
  });
}
