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
import { catalogClassifier } from "@/taxonomy/lib/publish";
import { DEFAULT_DICTIONARY, DEFAULT_MAPPINGS } from "@/taxonomy/data";

export const SITE_URL_DEFAULT = "https://travelpuzzle.com.mx";

export function destinationsRepo(db: D1Read): DestinationsRepo {
  return createDestinationsRepo(db, {
    cityName,
    tripImage: imageUrl,
    tripPrice: (n, currency) => (n === null || !["MXN", "USD", "EUR"].includes(currency) ? null : `Desde ${formatMoney(n, currency as "MXN", "es")}`),
  });
}

// REQ-088: países → ciudades → tours (y viajes propios visibles), leídos de D1.
// T3 (REQ-406…408, REQ-261): con TAXONOMY_PUBLISH_ENABLED, el árbol usa la taxonomía; apagada, idéntico a hoy.
export async function loadTree(repo: DestinationsRepo, now: Date, vis: Visibility, opts: { taxonomy?: boolean } = {}): Promise<CountryNode[]> {
  const [countries, cities, tours, trips] = await Promise.all([repo.countries(), repo.cities(), repo.tours(), repo.trips()]);
  const taxonomy = opts.taxonomy ? catalogClassifier(DEFAULT_DICTIONARY, DEFAULT_MAPPINGS) : undefined;
  return destinationTree({ countries, cities, tours, trips: trips.filter((t) => isKindVisible(t.kind, vis)), now, taxonomy });
}
