/**
 * REQ-354: lee `destino_alias` (S5) de D1 con caché compartida de 1 h. Si la tabla no existe (migración sin aplicar)
 * o D1 falla, devuelve [] y la búsqueda usa solo los alias curados. Solo lectura.
 */
import { cached, cacheKey } from "@/cache/edge";

export interface D1Read { prepare(sql: string): { bind(...v: unknown[]): { all(): Promise<{ results: Record<string, unknown>[] }> } } }

export const DB_ALIASES_SQL = `SELECT "city_id", "alias_plegado", "alias_ascii" FROM "destino_alias" WHERE "peso" >= ?1`;
/** Todos los tipos sirven para encontrar (también coloquiales e históricos); ninguno se muestra. */
export const MIN_FIND_WEIGHT = 1;

export async function loadDbAliases(db: () => D1Read): Promise<Record<string, unknown>[]> {
  try {
    return await cached(cacheKey("destino-alias", { v: 1 }), { ttlSec: 3600, staleSec: 86400 }, async () => {
      try {
        return (await db().prepare(DB_ALIASES_SQL).bind(MIN_FIND_WEIGHT).all()).results;
      } catch (error) {
        console.log("[busqueda] destino_alias no disponible, solo alias curados:", (error as Error).message);
        return [];
      }
    });
  } catch {
    return [];
  }
}
