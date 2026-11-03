/** Destinos populares del home: ciudades reales con tours, con foto propia cuando la tenemos. */

/** Fotos rescatadas del sitio anterior (public/home/destinos), por nombre de ciudad en inglés. */
export const CITY_PHOTOS: Record<string, string> = {
  paris: "/home/destinos/paris.webp",
  rome: "/home/destinos/roma.webp",
  london: "/home/destinos/londres.webp",
  venice: "/home/destinos/venecia.webp",
  barcelona: "/home/destinos/barcelona.webp",
  amsterdam: "/home/destinos/amsterdam.webp",
  "new york": "/home/destinos/nueva-york.webp",
  "new york city": "/home/destinos/nueva-york.webp",
  dubai: "/home/destinos/dubai.webp",
  agra: "/home/destinos/agra.webp",
  bali: "/home/destinos/bali.webp",
  cusco: "/home/destinos/cusco.webp",
  cuzco: "/home/destinos/cusco.webp",
  tokyo: "/home/destinos/tokio.webp",
  singapore: "/home/destinos/singapur.webp",
  cancun: "/home/destinos/cancun.webp",
  santorini: "/home/destinos/santorini.webp",
  reykjavik: "/home/destinos/islandia.webp",
};

export interface CityRow {
  cityId: number;
  countryId: number;
  tours: number;
  cityNames: Record<string, string>;
  countryNames: Record<string, string>;
  /** Foto de un tour de la ciudad, por si no tenemos foto propia. */
  sampleImage: string | null;
}

export interface DestinationCard {
  cityId: number;
  countryId: number;
  tours: number;
  names: Record<string, string>;
  countryNames: Record<string, string>;
  image: string;
  curated: boolean;
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export function photoFor(cityNames: Record<string, string>): string | null {
  const en = cityNames.en ?? Object.values(cityNames)[0];
  return en ? CITY_PHOTOS[norm(en)] ?? null : null;
}

/**
 * Elige hasta `n` destinos: primero las ciudades con foto propia (más tours primero),
 * luego el resto con la foto de uno de sus tours. Nunca muestra ciudades sin tours ni sin foto.
 */
export function pickDestinations(rows: CityRow[], n = 8): DestinationCard[] {
  const cards = rows
    .filter((r) => r.tours > 0)
    .flatMap((r): DestinationCard[] => {
      const own = photoFor(r.cityNames);
      const image = own ?? (r.sampleImage?.startsWith("https://") ? r.sampleImage : null);
      if (!image) return [];
      return [{ cityId: r.cityId, countryId: r.countryId, tours: r.tours, names: r.cityNames, countryNames: r.countryNames, image, curated: !!own }];
    });
  const byTours = (a: DestinationCard, b: DestinationCard) => b.tours - a.tours;
  return [...cards.filter((c) => c.curated).sort(byTours), ...cards.filter((c) => !c.curated).sort(byTours)].slice(0, n);
}

/** Nombre en el idioma pedido, con inglés como respaldo. */
export function nameIn(names: Record<string, string> | null | undefined, lang: string): string {
  const o = names ?? {};
  return o[lang] || o.en || Object.values(o)[0] || "";
}
