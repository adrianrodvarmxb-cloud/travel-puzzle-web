/**
 * REQ-121: ciudades donde opera un proveedor de complementos, leídas del gestor de viajes
 * (viajes publicados de su agencia; REQ-147: un borrador u oculto no anuncia su ciudad).
 * Solo lectura; la base se inyecta. Si falla, lista vacía (la tarjeta cae a WhatsApp).
 */
export interface TripCitiesDb {
  trip: {
    findMany(args: {
      where: { agency: { name: { contains: string } }; status: "published" };
      select: { cities: true };
    }): Promise<{ cities: unknown }[]>;
  };
}

// REQ-121, REQ-147
export async function providerCities(db: TripCitiesDb, provider: string): Promise<string[]> {
  try {
    const rows = await db.trip.findMany({ where: { agency: { name: { contains: provider } }, status: "published" }, select: { cities: true } });
    const all = rows.flatMap((r) => (Array.isArray(r.cities) ? r.cities.filter((c): c is string => typeof c === "string" && c.trim() !== "") : []));
    return [...new Set(all.map((c) => c.trim()))];
  } catch (error) {
    console.error("[complementos] no se pudieron leer las ciudades de", provider, (error as Error).message);
    return [];
  }
}
