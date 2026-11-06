/**
 * REQ-121: ciudades donde opera un proveedor de complementos, leídas del gestor de viajes
 * (viajes de su agencia, publicados o en borrador: el inventario existe aunque falten fotos).
 * Solo lectura; la base se inyecta. Si falla, lista vacía (la tarjeta cae a WhatsApp).
 */
export interface TripCitiesDb {
  trip: {
    findMany(args: {
      where: { agency: { name: { contains: string } } };
      select: { cities: true };
    }): Promise<{ cities: unknown }[]>;
  };
}

export async function providerCities(db: TripCitiesDb, provider: string): Promise<string[]> {
  try {
    const rows = await db.trip.findMany({ where: { agency: { name: { contains: provider } } }, select: { cities: true } });
    const all = rows.flatMap((r) => (Array.isArray(r.cities) ? r.cities.filter((c): c is string => typeof c === "string" && c.trim() !== "") : []));
    return [...new Set(all.map((c) => c.trim()))];
  } catch (error) {
    console.error("[complementos] no se pudieron leer las ciudades de", provider, (error as Error).message);
    return [];
  }
}
