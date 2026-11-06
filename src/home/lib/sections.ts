/**
 * Secciones del inicio, en el orden en que el home las pinta, para el menú de las tres rayitas (celular).
 * REQ-068: es la única lista; un test compara contra src/app/page.tsx, así que una sección nueva sin entrada aquí rompe CI.
 * `when`: la sección solo existe con esa bandera encendida (p. ej. viajes propios con OWN_TOURS_ENABLED).
 */
export interface SectionFlags { ownTrips?: boolean }
const SECTIONS: { id: string; es: string; en: string; when?: keyof SectionFlags }[] = [
  { id: "destinos", es: "Destinos", en: "Destinations" },
  { id: "favoritos", es: "Favoritos de los viajeros", en: "Traveler favorites" },
  { id: "viajes", es: "Viajes armados por expertos", en: "Trips by our experts", when: "ownTrips" },
  { id: "como-funciona", es: "Cómo funciona", en: "How it works" },
  { id: "continentes", es: "Explora por continente", en: "Explore by continent" },
  { id: "mapa", es: "El mapa", en: "The map" },
  { id: "opiniones", es: "Lo que dicen los viajeros", en: "What travelers say" },
  { id: "asesor", es: "Asesoría personalizada", en: "Personal advice" },
];

export const HOME_SECTION_IDS = SECTIONS.map((s) => s.id);

export interface HomeSection {
  id: string;
  href: string;
  number: string;
  label: string;
}

// REQ-068
export function homeSections(lang: string, flags: SectionFlags = {}): HomeSection[] {
  return SECTIONS.filter((s) => !s.when || flags[s.when]).map((s, i) => ({
    id: s.id,
    href: `/#${s.id}`,
    number: String(i + 1).padStart(2, "0"),
    label: lang === "es" ? s.es : s.en,
  }));
}

/** REQ-068: el inicio se marca solo en "/"; las demás rutas también en sus páginas internas; las anclas nunca. */
export function isActiveLink(pathname: string, href: string): boolean {
  if (href.includes("#")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
