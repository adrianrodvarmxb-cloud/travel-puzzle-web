/**
 * REQ-10944 · Lectura de las filas de `TourOption` (migración 0036) de un tour, con SQL aparte (la tabla no está en
 * prisma/schema.prisma, como la 0031/0032). Si la 0036 no está aplicada («no such table») devuelve [] y lo avisa una
 * vez: la ficha sigue con las opciones sin precio, como hoy (regla 7); cualquier otra falla de la base, [] y error en
 * consola. Solo viajan las columnas públicas. I/O: recibe la base por parámetro (DIP).
 */
import { tourOptionRecord, type TourOptionRecord } from "@/ficha/lib/option-records";

type D1 = { prepare(sql: string): { bind(...v: unknown[]): { all(): Promise<{ results: Record<string, unknown>[] }> } } };

export const TOUR_OPTION_COLUMNS = ["code", "description", "startTime", "currency", "rackAdult", "transferIncluded"] as const;
const SELECT = `SELECT ${TOUR_OPTION_COLUMNS.map((c) => `"${c}"`).join(", ")} FROM "TourOption" WHERE "tourId" = ?1 ORDER BY "code"`;

// REQ-10944
export async function loadTourOptions(db: D1, tourId: string): Promise<TourOptionRecord[]> {
  try {
    const { results } = await db.prepare(SELECT).bind(tourId).all();
    return results.map(tourOptionRecord).filter((r): r is TourOptionRecord => r !== null);
  } catch (e) {
    const m = (e as Error).message ?? String(e);
    if (/no such table/i.test(m)) console.warn("[ficha] la migración 0036 (TourOption) no está aplicada; opciones sin precio");
    else console.error("[ficha] opciones (TourOption):", m);
    return [];
  }
}
