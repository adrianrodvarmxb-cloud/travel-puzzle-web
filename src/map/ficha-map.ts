/**
 * REQ-10736 (ficha única, ola 4, decisión 28): I/O de la vista del mapa de la ficha. Recibe `prisma` por parámetro;
 * la decisión vive en `lib/city-pin.ts` (`fichaMapView`). Con punto exacto no toca la base. Si D1 falla, null:
 * la ficha se pinta sin mapa (nunca un centro inventado) y el resto de la página sigue.
 */
import type { PrismaClient } from "@prisma/client";
import { parseCoords } from "./lib/coords";
import { fichaMapView, zoneMapEnabled, type FichaMapView, type GeoFlagsEnv } from "./lib/city-pin";

export async function loadFichaMap({ prisma, cityId, coords, env }: { prisma: PrismaClient; cityId: number; coords: string | null | undefined; env: GeoFlagsEnv }): Promise<FichaMapView | null> {
  const point = parseCoords(coords ?? null);
  if (point || !zoneMapEnabled(env)) return fichaMapView(point, null, env);
  try {
    const city = await prisma.city.findUnique({ where: { id: cityId }, select: { lat: true, lng: true } });
    return fichaMapView(null, city, env);
  } catch (error) {
    console.error("[ficha] zona aproximada:", error);
    return null;
  }
}
