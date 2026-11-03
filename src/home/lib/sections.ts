/** Las 7 secciones del inicio, en orden, para el menú de las tres rayitas (celular). */
const SECTIONS: { id: string; es: string; en: string }[] = [
  { id: "destinos", es: "Destinos", en: "Destinations" },
  { id: "favoritos", es: "Favoritos de los viajeros", en: "Traveler favorites" },
  { id: "como-funciona", es: "Cómo funciona", en: "How it works" },
  { id: "continentes", es: "Explora por continente", en: "Explore by continent" },
  { id: "mapa", es: "El mapa", en: "The map" },
  { id: "opiniones", es: "Lo que dicen los viajeros", en: "What travelers say" },
  { id: "asesor", es: "Asesoría personalizada", en: "Personal advice" },
];

export interface HomeSection {
  id: string;
  href: string;
  number: string;
  label: string;
}

export function homeSections(lang: string): HomeSection[] {
  return SECTIONS.map((s, i) => ({
    id: s.id,
    href: `/#${s.id}`,
    number: String(i + 1).padStart(2, "0"),
    label: lang === "es" ? s.es : s.en,
  }));
}
