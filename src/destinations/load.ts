/**
 * Raíz de I/O de /destinos: arma el repositorio sobre D1 y carga el árbol de destinos con caché compartida
 * (como el catálogo, REQ-032). La lógica vive en lib/; aquí solo se inyectan las dependencias reales.
 */
import { cityName } from "./lib/dry-run";
import { destinationTree, type CountryNode } from "./lib/catalog";
import { createDestinationsRepo, type D1Read, type DestinationsRepo } from "./repository";
import { imageUrl } from "@/trips/lib/image";
import { formatMoney } from "@/trips/lib/money";
import { isKindVisible, type Visibility } from "@/trips/lib/visibility";

export const SITE_URL_DEFAULT = "https://travelpuzzle.com.mx";

export function destinationsRepo(db: D1Read): DestinationsRepo {
  return createDestinationsRepo(db, {
    cityName,
    tripImage: imageUrl,
    tripPrice: (n, currency) => (n === null || !["MXN", "USD", "EUR"].includes(currency) ? null : `Desde ${formatMoney(n, currency as "MXN", "es")}`),
  });
}

// REQ-088: países → ciudades → tours (y viajes propios visibles), leídos de D1.
export async function loadTree(repo: DestinationsRepo, now: Date, vis: Visibility): Promise<CountryNode[]> {
  const [countries, cities, tours, trips] = await Promise.all([repo.countries(), repo.cities(), repo.tours(), repo.trips()]);
  return destinationTree({ countries, cities, tours, trips: trips.filter((t) => isKindVisible(t.kind, vis)), now });
}
