/**
 * REQ-294: textos del autocompletado y de cero resultados. Puro. El copy solo promete lo que existe en producción:
 * buscar, filtrar por destino o tipo de actividad, y escribir por WhatsApp. Nada de «gratis», tiempos de respuesta,
 * disponibilidad ni precios. Idiomas del sitio: es y en completos; pt/de/fr/it caen a inglés hasta traducirlos.
 */

export const WHATSAPP_NUMBER = "5215536490320"; // +52 1 55 3649 0320
export const WHATSAPP_DISPLAY = "+52 1 55 3649 0320";

type Copy = {
  destinations: string; tours: string; categories: string;
  didYouMean: string; showingFor: string; youSearched: string;
  noResultsFor: string; tryWithout: string; seeAll: string; showingInstead: string;
  popular: string; activityTypes: string; whatsappTitle: string; whatsappCta: string; whatsappText: string;
  tourCount1: string; tourCountN: string; listLabel: string;
};

const es: Copy = {
  destinations: "Destinos", tours: "Tours", categories: "Tipos de actividad",
  didYouMean: "¿Quisiste decir…?", showingFor: "Mostrando resultados de «{q}»", youSearched: "Buscaste «{q}»",
  noResultsFor: "No encontramos resultados para «{q}»", tryWithout: "Prueba con menos palabras", seeAll: "Ver resultados", showingInstead: "No había resultados para «{q}». Te mostramos «{alt}».",
  popular: "Destinos populares", activityTypes: "Tipos de actividad", whatsappTitle: "¿No lo encuentras?", whatsappCta: "Escríbenos por WhatsApp",
  whatsappText: "Hola Travel Puzzle, busqué «{q}» en el sitio y no encontré lo que quería.",
  tourCount1: "1 tour", tourCountN: "{n} tours", listLabel: "Sugerencias de búsqueda",
};
const en: Copy = {
  destinations: "Destinations", tours: "Tours", categories: "Activity types",
  didYouMean: "Did you mean…?", showingFor: "Showing results for “{q}”", youSearched: "You searched “{q}”",
  noResultsFor: "No results for “{q}”", tryWithout: "Try fewer words", seeAll: "See results", showingInstead: "There were no results for “{q}”. Showing “{alt}”.",
  popular: "Popular destinations", activityTypes: "Activity types", whatsappTitle: "Can’t find it?", whatsappCta: "Message us on WhatsApp",
  whatsappText: "Hi Travel Puzzle, I searched “{q}” on the site and couldn’t find what I wanted.",
  tourCount1: "1 tour", tourCountN: "{n} tours", listLabel: "Search suggestions",
};

// REQ-294
export function suggestCopy(lang: string): Copy {
  return lang === "es" ? es : en;
}

/** Reemplaza {q}, {alt} y {n}. Los números van tal cual (sin Intl: INC-001). */
export const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => (k in v ? String(v[k]) : `{${k}}`));

export const tourCount = (c: Copy, n: number) => (n === 1 ? c.tourCount1 : fill(c.tourCountN, { n }));

// REQ-294
export function whatsappHref(lang: string, q: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(fill(suggestCopy(lang).whatsappText, { q: q.slice(0, 80) }))}`;
}

/** Enlaces internos: el destino se busca por nombre (lo filtra REQ-122); el tipo de actividad usa el filtro de /tours. */
export const searchHref = (q: string) => `/tours?search=${encodeURIComponent(q)}`;
export const categoryHref = (id: string) => `/tours?tipo_act=${encodeURIComponent(id)}`;
export const tourHref = (id: string) => `/tours/${encodeURIComponent(id)}`;
