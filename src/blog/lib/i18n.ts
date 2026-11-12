/**
 * REQ-3449 a REQ-3451 (gate B2, REQ-3338): el blog en español y en inglés. Puro.
 * El artículo se escribe en español con su versión `en`; aquí se arma la versión de cada idioma sin mutar el registro.
 * En un idioma sin versión propia el artículo no existe (null): nunca se muestra el español en otro idioma.
 */
import type { Post } from "./schema";
import type { Pillar } from "./pillars";

export type BlogLang = "es" | "en";

// REQ-3449
export function postLangs(p: Post): BlogLang[] {
  return p.en ? ["es", "en"] : ["es"];
}

// REQ-3449
export function localizePost(p: Post, lang: string): Post | null {
  if (lang === "es") return p;
  if (lang !== "en" || !p.en) return null;
  const e = p.en;
  return {
    ...p,
    targetTerm: e.targetTerm, title: e.title, summary: e.summary, enBreve: e.enBreve, entrada: e.entrada,
    sections: e.sections, comoLoSabemos: e.comoLoSabemos,
    datos: p.datos?.map((d, i) => ({ ...d, text: e.datos?.[i]?.text ?? d.text })),
    visual: p.visual && e.visual ? { ...p.visual, ...e.visual } : p.visual,
    faq: e.faq ?? p.faq,
    cta: { ...p.cta, label: e.cta.label },
    cover: p.cover ? { ...p.cover, alt: e.cover?.alt ?? p.cover.alt } : p.cover,
    imagenes: p.imagenes?.map((b, i) => ({
      ...b,
      pie: e.imagenes?.[i]?.pie ?? b.pie,
      fotos: b.fotos.map((f, j) => ({ ...f, alt: e.imagenes?.[i]?.alts[j] ?? f.alt })),
    })),
    // Los casos y las citas no se traducen: van solo en español (el agente no los usa).
    minicaso: undefined, citas: undefined,
  };
}

/** REQ-3449: entradas que existen en el idioma, ya en ese idioma. */
export function postsIn(posts: Post[], lang: string): Post[] {
  return posts.flatMap((p) => { const l = localizePost(p, lang); return l ? [l] : []; });
}

const PILLAR_EN: Record<string, Pick<Pillar, "name" | "h1" | "term" | "intro"> & { commercial: string }> = {
  china: { name: "China from Mexico", h1: "Traveling to China from Mexico", term: "travel to china from mexico", intro: "Guides to prepare your trip to China from Mexico: documents, payments, connectivity, routes and seasons.", commercial: "See trips to China" },
  peru: { name: "Peru and Machu Picchu", h1: "Traveling to Peru from Mexico", term: "travel to peru from mexico", intro: "Guides to prepare your trip to Peru from Mexico: getting to Machu Picchu, tickets, altitude and routes.", commercial: "See trips to Peru" },
  colombia: { name: "Colombia from Mexico", h1: "Traveling to Colombia from Mexico", term: "travel to colombia from mexico", intro: "Guides to prepare your trip to Colombia from Mexico: requirements, budget and routes.", commercial: "See trips to Colombia" },
  europa: { name: "Europe, first trip", h1: "Traveling to Europe from Mexico", term: "travel to europe from mexico", intro: "Guides for your first trip to Europe from Mexico: requirements, which cities to choose and how to get around.", commercial: "See tours in Europe" },
  mexico: { name: "Mexico City", h1: "What to do in Mexico City", term: "what to do in mexico city", intro: "Guides to explore Mexico City: walking tours, guided visits and how to get around.", commercial: "See experiences in Mexico City" },
  "free-tours": { name: "Free tours", h1: "What a free tour is and how it works", term: "what is a free tour", intro: "How free tours work: booking, tipping the guide and what to expect.", commercial: "See Free Puzzle" },
};

// REQ-3451
export function pillarIn(p: Pillar, lang: string): Pillar {
  const e = lang === "en" ? PILLAR_EN[p.slug] : undefined;
  return e ? { ...p, name: e.name, h1: e.h1, term: e.term, intro: e.intro, commercial: { ...p.commercial, label: e.commercial } } : p;
}

const LABELS = {
  es: {
    draft: "BORRADOR · No publicado. Solo se ve en el preview (BLOG_SHOW_DRAFTS) y no se indexa.",
    all: "← Todos los artículos", home: "Inicio", blog: "Blog", updated: "Actualizado", minutes: "min de lectura", share: "Compartir",
    brief: "En breve", toc: "En esta página", caseIllustrative: "Ejemplo ilustrativo", caseReal: "Un caso", caseAria: "Caso",
    source: "Fuente", checked: "consultada el", swipe: "Desliza la tabla →", faq: "Preguntas frecuentes", how: "Cómo lo sabemos",
    ctaTitle: "Te armamos tu viaje.", ctaText: "Cuéntanos a dónde vas y cuántos días tienes. Un asesor de Travel Puzzle te propone tours y horarios a tu medida.",
    more: "Más del blog", guide: "Guía", keepReading: "Sigue leyendo", prev: "← Anterior", next: "Siguiente →", explore: "Explora por destino",
    waText: (title: string) => `Hola Travel Puzzle, leí «${title}» y quiero ayuda con mi viaje.`,
    indexLead: "Guías para preparar tu viaje desde México.",
    indexDescription: "Guías de Travel Puzzle para preparar tu viaje desde México: documentos, rutas, temporadas y cómo moverte en tu destino.",
    filter: "Filtrar por destino", pillarPosts: "Artículos de esta guía", pillarTitle: (h1: string) => `${h1}: guía`, inLanguage: "es-MX",
  },
  en: {
    draft: "DRAFT · Not published. Only visible in the preview (BLOG_SHOW_DRAFTS) and not indexed.",
    all: "← All articles", home: "Home", blog: "Blog", updated: "Updated", minutes: "min read", share: "Share",
    brief: "In short", toc: "On this page", caseIllustrative: "Illustrative example", caseReal: "A case", caseAria: "Case",
    source: "Source", checked: "checked on", swipe: "Swipe the table →", faq: "Frequently asked questions", how: "How we know",
    ctaTitle: "We'll put your trip together.", ctaText: "Tell us where you're going and how many days you have. A Travel Puzzle advisor will suggest tours and times that suit you.",
    more: "More from the blog", guide: "Guide", keepReading: "Keep reading", prev: "← Previous", next: "Next →", explore: "Explore by destination",
    waText: (title: string) => `Hi Travel Puzzle, I read «${title}» and I'd like help with my trip.`,
    indexLead: "Guides to prepare your trip from Mexico.",
    indexDescription: "Travel Puzzle guides to prepare your trip from Mexico: documents, routes, seasons and how to get around at your destination.",
    filter: "Filter by destination", pillarPosts: "Articles in this guide", pillarTitle: (h1: string) => `${h1}: guide`, inLanguage: "en-US",
  },
} as const;
export type BlogLabels = (typeof LABELS)[BlogLang];

// REQ-3450
export const blogLabels = (lang: string): BlogLabels => (lang === "en" ? LABELS.en : LABELS.es);

/** REQ-3450: idiomas en los que existe una página del blog con estas entradas (al menos una en ese idioma). */
export function blogLangs(posts: Post[]): BlogLang[] {
  if (!posts.length) return [];
  return posts.some((p) => p.en) ? ["es", "en"] : ["es"];
}
