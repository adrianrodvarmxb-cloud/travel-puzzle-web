/** Fixtures de /destinos (solo pruebas; nada del sitio los importa). */
import type { CityRow, CountryRow, TourRow } from "../lib/catalog";

export const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");

export const fx = {
  countries: [
    { id: 1, code: "mx", iso2: "MX", translations: { es: "México", en: "Mexico" } },
    { id: 2, code: "pe", iso2: "PE", translations: { es: "Perú", en: "Peru" } },
    { id: 3, code: "xx", iso2: null, translations: { es: "Sin ISO" } },
  ] as CountryRow[],
  cities: [
    { id: 10, countryId: 1, translations: { es: "Ciudad de México", en: "Mexico City" }, slug: "ciudad-de-mexico", guide: null, guideUpdatedAt: null, indexableSince: null, failingSince: null },
    { id: 11, countryId: 1, translations: { es: "Oaxaca" }, slug: "oaxaca", guide: null, guideUpdatedAt: null, indexableSince: null, failingSince: null },
    { id: 12, countryId: 1, translations: { es: "Mérida" }, slug: null, guide: null, guideUpdatedAt: null, indexableSince: null, failingSince: null },
    { id: 13, countryId: 1, translations: { es: "Puebla" }, slug: "puebla", guide: null, guideUpdatedAt: null, indexableSince: null, failingSince: null },
    { id: 20, countryId: 2, translations: { es: "Cusco" }, slug: "cusco", guide: words(300), guideUpdatedAt: "2026-11-01T00:00:00Z", indexableSince: null, failingSince: null },
    { id: 30, countryId: 3, translations: { es: "Nada" }, slug: "nada", guide: null, guideUpdatedAt: null, indexableSince: null, failingSince: null },
  ] as CityRow[],
};

let n = 0;
export function tour(cityId: number, countryId: number, over: Partial<TourRow> = {}): TourRow {
  n++;
  return {
    id: `t${n}`, externalId: 1000 + n, slug: `tour-${n}`, cityId, countryId, title: `Tour ${n}`, provider: `Guía ${n}`, price: 0, currency: "EUR",
    rating: 4.8, reviews: 10 * n, image: null, duration: "2:00", status: "active", isActive: true, updatedAt: "2026-11-02T00:00:00Z", ...over,
  };
}

