/**
 * Tarjeta única de experiencia (pedido del PO, 6 nov 2026, 14:24). Puro: arma el modelo que pinta
 * src/components/tours/ExperienceCard.tsx para cualquier proveedor (FREETOUR, Big Bus, Extime, Exotic Escapes…).
 *
 * Estructura fija:
 * - Sobre la foto, arriba izquierda «★ Favorito» (solo con la regla de favorite.ts); arriba derecha la categoría
 *   (formato de la taxonomía). Nada más sobre la foto (FREETOUR C5).
 * - Debajo: ciudad · duración, título, descripción breve opcional.
 * - Línea de precio (PO, 6 nov 2026): de pago «Desde aprox. MXN $X · EUR €Y»; pieza libre, «Free tour» en verde.
 * - Fila inferior: ★ calificación · N reseñas | proveedor real. FREETOUR nunca se nombra.
 *
 * Determinista (INC-001): sin Intl, toLocale*, Date.now ni Math.random; los números se forman con formatCount
 * y los precios llegan ya formateados del servidor.
 */
import { FORMATOS_FILTRO, formatoLabel, type FormatoFiltro } from "@/taxonomy/lib/filters";
import { formatCount, formatRating } from "@/home/lib/format";
import { isTravelerFavorite } from "./favorite";
import { durationMinutes as parseDuration } from "./duration";

export const CARD_LANGS = ["es", "en", "pt", "de", "fr", "it"] as const;
export type CardLang = (typeof CARD_LANGS)[number];
export const cardLang = (lang: string): CardLang => ((CARD_LANGS as readonly string[]).includes(lang) ? (lang as CardLang) : "en");

/**
 * REQ-522: la categoría de la tarjeta usa la MISMA etiqueta que el filtro «Tipo de experiencia» (T4) y las etiquetas de
 * la ciudad y la ficha (T5): `FORMATO_LABEL` de src/taxonomy/lib/filters.ts (es/en del diccionario; pt/de/fr/it en
 * inglés hasta que el flujo de traducción de T5 las firme). Aquí solo se agregan los formatos que no son de /tours
 * (viven en /traslados, REQ-261), con el término del diccionario; un test los compara.
 */
export const OTHER_FORMAT_LABELS: Record<"traslado" | "transporte" | "alquiler" | "crucero", { es: string; en: string }> = {
  traslado: { es: "Traslado", en: "Transfer" },
  transporte: { es: "Transporte turístico", en: "Hop-on hop-off & transport" },
  alquiler: { es: "Renta", en: "Rentals" },
  crucero: { es: "Crucero", en: "Cruise" },
};

/**
 * REQ-522: respaldo documentado cuando no hay formato (`por-revisar`, `fuera` o un dato viejo sin formato):
 * «Experiencia», que es el paraguas del menú (REQ-174) y no promete nada que el producto no sea. Nunca «Tour».
 */
export const CATEGORY_FALLBACK: Record<CardLang, string> = { es: "Experiencia", en: "Experience", pt: "Experiência", de: "Erlebnis", fr: "Expérience", it: "Esperienza" };

// REQ-522
export function categoryLabel(formato: string | null | undefined, lang: string): string {
  if (formato && (FORMATOS_FILTRO as readonly string[]).includes(formato)) return formatoLabel(formato as FormatoFiltro, lang);
  const other = formato ? (OTHER_FORMAT_LABELS as Record<string, { es: string; en: string }>)[formato] : undefined;
  if (other) return other[lang === "es" ? "es" : "en"];
  return CATEGORY_FALLBACK[cardLang(lang)];
}

interface CardCopy { favorite: string; reviews: (n: string) => string; free: string; from: string; days: (n: number) => string }
/** REQ-521, REQ-524, REQ-525: textos de la tarjeta en los 6 idiomas. «Free tour» verde igual en todos (como hoy). */
export const CARD_COPY: Record<CardLang, CardCopy> = {
  es: { favorite: "Favorito", reviews: (n) => `${n} reseñas`, free: "Free tour", from: "Desde", days: (n) => `${n} ${n === 1 ? "día" : "días"}` },
  en: { favorite: "Favorite", reviews: (n) => `${n} reviews`, free: "Free tour", from: "From", days: (n) => `${n} ${n === 1 ? "day" : "days"}` },
  pt: { favorite: "Favorito", reviews: (n) => `${n} avaliações`, free: "Free tour", from: "A partir de", days: (n) => `${n} ${n === 1 ? "dia" : "dias"}` },
  de: { favorite: "Favorit", reviews: (n) => `${n} Bewertungen`, free: "Free tour", from: "Ab", days: (n) => `${n} ${n === 1 ? "Tag" : "Tage"}` },
  fr: { favorite: "Favori", reviews: (n) => `${n} avis`, free: "Free tour", from: "À partir de", days: (n) => `${n} ${n === 1 ? "jour" : "jours"}` },
  it: { favorite: "Preferito", reviews: (n) => `${n} recensioni`, free: "Free tour", from: "Da", days: (n) => `${n} ${n === 1 ? "giorno" : "giorni"}` },
};

const MENTIONS_FREETOUR = /free\s*tour\.?com|freetour/i;

/**
 * REQ-524: nombre del proveedor u operador real del dato. «FREETOUR» / «freetour.com» nunca llega al cliente
 * (regla dura del PO): si el nombre lo menciona o viene vacío, el espacio queda vacío (null), sin inventar.
 */
export function cardProvider(name: string | null | undefined): string | null {
  const n = (name ?? "").trim();
  return n && !MENTIONS_FREETOUR.test(n) ? n : null;
}

/** REQ-523: «2 h 30 min», «45 min», «3 días». Sin Intl. Días cuando la duración es de 24 h o más. */
export function cardDuration(d: { minutes?: number | null; days?: number | null; raw?: string | null }, lang: string): string | null {
  const c = CARD_COPY[cardLang(lang)];
  const min = d.minutes ?? parseDuration(d.raw ?? null);
  if (d.days && d.days > 0 && (!min || min >= 1440)) return c.days(d.days);
  if (!min || min <= 0) return null;
  if (min >= 1440) return c.days(Math.round(min / 1440));
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export interface CardPrice { text: string; free: boolean }
export interface PriceParts { main: string; approx: string | null }

/**
 * REQ-525 (PO, 6 nov 2026): línea propia arriba de la fila inferior.
 * - Pieza libre: «Free tour» en verde.
 * - De pago con etiqueta del servidor (tourPriceLabel, D4): «Desde aprox. MXN $X · EUR €Y»; sin tipo de cambio, «Desde EUR €Y».
 * - Sin etiqueta: «Desde EUR 99» con el dato crudo (como hoy).
 */
export function cardPrice(p: { free: boolean; label?: PriceParts | null; price?: number | null; currency?: string | null }, lang: string): CardPrice | null {
  const c = CARD_COPY[cardLang(lang)];
  if (p.free) return { text: c.free, free: true };
  if (p.label) return { text: p.label.approx ? `${c.from} ${p.label.approx} · ${p.label.main}` : `${c.from} ${p.label.main}`, free: false };
  if (p.price && p.price > 0 && p.currency) return { text: `${c.from} ${p.currency} ${Number.isInteger(p.price) ? p.price : p.price.toFixed(2)}`, free: false };
  return null;
}

/** Lo que pinta ExperienceCard. Todo son textos ya resueltos; el componente no decide nada. */
export interface ExperienceCardModel {
  key: string;
  href: string;
  title: string;
  image: string | null;
  /** REQ-521: null = no se pinta la insignia. */
  favorite: string | null;
  /** REQ-522 */
  category: string;
  /** REQ-523: «Madrid · 2 h 30 min» (lo que haya). */
  meta: string;
  description: string | null;
  /** REQ-524: null = sin reseñas, no se pinta nada. */
  rating: { value: string; count: string } | null;
  provider: string | null;
  /** REQ-525 */
  price: CardPrice | null;
}

export interface CardInput {
  key: string;
  href: string;
  title: string;
  image: string | null;
  city: string | null;
  duration: string | null;
  description?: string | null;
  formato: string | null | undefined;
  rating: number | string | null | undefined;
  reviews: number | null | undefined;
  provider: string | null;
  price: CardPrice | null;
}

// REQ-520 REQ-521 REQ-522 REQ-523 REQ-524
export function experienceCard(i: CardInput, lang: string): ExperienceCardModel {
  const c = CARD_COPY[cardLang(lang)];
  const reviews = Number(i.reviews ?? 0);
  const value = formatRating(i.rating ?? null);
  const favorite = isTravelerFavorite({ rating: i.rating === undefined ? null : (i.rating as number | string | null), reviews });
  return {
    key: i.key,
    href: i.href,
    title: i.title,
    image: i.image && i.image.trim() ? i.image : null,
    favorite: favorite ? c.favorite : null,
    category: categoryLabel(i.formato, lang),
    meta: [i.city?.trim(), i.duration?.trim()].filter(Boolean).join(" · "),
    description: i.description?.trim() ? i.description.trim() : null,
    rating: value && reviews > 0 ? { value, count: c.reviews(formatCount(reviews, cardLang(lang))) } : null,
    provider: cardProvider(i.provider),
    price: i.price,
  };
}
