/**
 * REQ-3333 / REQ-3335: índice de las guías de ciudad (página /guias y columna «Guías» del pie). Puro.
 * Recibe las guías y el nombre del país por parámetro (DIP), así una guía nueva entra sola.
 */
import { guideCityPath, guideIn, type CityGuide } from "./guia";

export interface GuideCityLink { ciudad: string; nombre: string; titulo: string; href: string }
export interface GuideCountry { pais: string; name: string; count: number; cities: GuideCityLink[] }
export interface GuideNavLink { href: string; label: string }

/** REQ-3335 (gate A3): máximo de países en el pie. */
export const FOOTER_GUIDE_COUNTRIES = 8;
export const GUIDES_PATH = "/guias";

// REQ-3333
export function guidesIndex(guides: CityGuide[], lang: string, countryName: (iso: string, lang: string) => string): GuideCountry[] {
  const byCountry = new Map<string, GuideCityLink[]>();
  for (const g of guides) {
    const t = guideIn(g, lang);
    if (!t) continue;
    const list = byCountry.get(g.pais) ?? [];
    list.push({ ciudad: g.ciudad, nombre: t.nombre, titulo: t.titulo, href: `${guideCityPath(g)}#guia` });
    byCountry.set(g.pais, list);
  }
  const collator = new Intl.Collator(lang, { sensitivity: "base" });
  return [...byCountry.entries()]
    .map(([pais, cities]) => ({ pais, name: countryName(pais, lang), count: cities.length, cities: cities.sort((a, b) => collator.compare(a.nombre, b.nombre)) }))
    .sort((a, b) => b.count - a.count || collator.compare(a.name, b.name));
}

const ALL: Record<string, string> = { es: "Todas las guías", en: "All guides" };

// REQ-3335 (gate A3): «Todas las guías» y hasta 8 países con su ancla en /guias.
export function footerGuideLinks(index: GuideCountry[], lang: string, max = FOOTER_GUIDE_COUNTRIES): GuideNavLink[] {
  if (!index.length) return [];
  return [{ href: GUIDES_PATH, label: ALL[lang] ?? ALL.en }, ...index.slice(0, max).map((c) => ({ href: `${GUIDES_PATH}#${c.pais}`, label: c.name }))];
}
