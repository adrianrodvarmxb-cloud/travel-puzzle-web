/**
 * Árbol de destinos por idioma (Gate 3, Ola 2). Puro. El árbol se arma una vez (en español, en caché) y aquí se
 * traduce sin mutarlo: nombres de país y ciudad de sus traducciones y títulos de tour del proveedor (REQ-665).
 * También dice en qué idiomas es indexable cada página (REQ-662, plan §3.6). Mismos slugs y href en todos.
 */
import type { SupportedLanguage } from "@/types";
import { LOCALES } from "@/i18n/lib/locales";
import { cityMeetsRule } from "./indexing";
import type { CityNode, CountryNode, TourCardModel } from "./catalog";

const has = (s: string | null | undefined) => !!s && !!s.trim();
const name = (names: Record<string, string> | undefined, lang: SupportedLanguage, fallback: string) => names?.[lang] || fallback;

function tourIn(t: TourCardModel, lang: SupportedLanguage, city: string): TourCardModel {
  // pt/fr/it/de: sin título propio cargado aquí; el inglés del proveedor o el español (esas versiones van con noindex).
  return { ...t, title: has(t.titleEn) ? t.titleEn!.trim() : t.title, city };
}

// REQ-665
export function localizeTree(tree: CountryNode[], lang: SupportedLanguage): CountryNode[] {
  if (lang === "es") return tree;
  return tree.map((c) => ({
    ...c,
    name: name(c.names, lang, c.name),
    cities: c.cities.map((ci) => {
      const cn = name(ci.names, lang, ci.name);
      const tr = (xs: TourCardModel[]) => xs.map((t) => tourIn(t, lang, cn));
      return { ...ci, name: cn, freeTours: tr(ci.freeTours), paidTours: tr(ci.paidTours), ownTrips: tr(ci.ownTrips), transportTrips: tr(ci.transportTrips) };
    }),
  }));
}

/** REQ-662: home, /destinos, /tours y /traslados existen en todos los idiomas (alternates filtra los indexables). */
export const HUB_LANGS: readonly SupportedLanguage[] = LOCALES;

// REQ-662: la ciudad cuenta tours igual en todos los idiomas; la guía propia (en español) solo indexa en español.
export function cityLangs(city: CityNode, country: CountryNode): SupportedLanguage[] {
  if (!city.indexed || !country.indexable) return [];
  return cityMeetsRule({ activeTours: city.activeTours, guide: null }) ? ["es", "en"] : ["es"];
}

// REQ-662: país indexable en un idioma con ≥1 ciudad indexable en ese idioma.
export function countryLangs(country: CountryNode): SupportedLanguage[] {
  if (!country.indexable) return [];
  return LOCALES.filter((l) => country.cities.some((ci) => cityLangs(ci, country).includes(l)));
}

// REQ-662: la ficha sigue la regla de su ciudad en español; en inglés, además, con el título del proveedor en inglés.
export function tourLangs(tour: TourCardModel, city: CityNode, country: CountryNode): SupportedLanguage[] {
  if (!city.indexed || !country.indexable) return [];
  return has(tour.titleEn) ? ["es", "en"] : ["es"];
}
