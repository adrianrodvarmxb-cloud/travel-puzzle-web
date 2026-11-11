/**
 * Marcado y «En breve» de una ficha de producto (tour o viaje, de cualquier proveedor). Puro y determinista:
 * sin Intl, reloj ni azar (INC-001). Recibe el idioma y la URL canónica, así sirve igual cuando llegue la URL por
 * idioma con hreflang (Gate 3): la ruta solo tiene que pasar su `lang` y su canonical.
 *
 * - REQ-571: nodo `["Product","TouristTrip"]` (Google lee Product; otros consumidores leen TouristTrip) con Offer en
 *   la moneda real del dato, price 0 en pieza libre y availability solo si se conoce.
 * - REQ-572: provider y brand = operador real; nunca FREETOUR (misma regla que la tarjeta, REQ-524).
 * - REQ-573: duración, idiomas y cancelación en additionalProperty, punto de encuentro como tripOrigin Place.
 *   Solo lo que la página muestra: el marcado debe coincidir con el texto visible.
 * - REQ-574 (Gate 2): nunca aggregateRating ni review de terceros; solo reseñas propias de Travel Puzzle.
 * - REQ-570 / REQ-581: descripción, tipo principal y keywords solo si el proveedor permite enriquecimiento.
 * - REQ-577: «En breve» (respuesta primero), plantilla de 40–80 palabras con los mismos datos.
 * - REQ-820: `image` obligatorio para Google (Fichas de comerciantes): la principal y hasta 3 más, en URL absolutas.
 * - REQ-823: nunca shippingDetails (no hay envío) ni hasMerchantReturnPolicy (es una política de devolución de
 *   mercancía; la cancelación de un tour no cabe fielmente en returnPolicyCategory/merchantReturnDays/returnMethod).
 */
import { cardProvider } from "@/tours/lib/experience-card";
import { guideLanguageName } from "@/tours/lib/filters-copy";
import { indexableEnrichment } from "./enrichment";
import { languageCode } from "@/departures/lib/language";

const CTX = "https://schema.org";
const ISO_4217 = /^[A-Z]{3}$/;

export interface FichaInput {
  /** REQ-1349: ciudades del viaje, en orden (itinerary del JSON-LD). */
  itinerary?: string[] | null;
  /** Id del proveedor para el interruptor (REQ-570): `freetour`, `propios`, `agencia:extime-travel`… */
  provider: string;
  lang: string;
  /** URL canónica absoluta de la ficha. */
  url: string;
  /** El mismo texto del H1. */
  name: string;
  images: (string | null | undefined)[];
  /** Operador real del dato (sin filtrar; aquí se quita FREETOUR). */
  operator: string | null;
  free: boolean;
  /** Precio «desde» por persona en `currency`. */
  price: number | null;
  currency: string | null;
  availability?: "InStock" | null;
  /** Textos tal como se ven en la página. */
  duration?: string | null;
  languages?: string[];
  /** Nombre visible de la lista de idiomas cuando no es «Idiomas del guía» (p. ej. «Audioguía» en el bus, REQ-146). */
  languagesTitle?: string | null;
  meetingPoint?: { name: string; address?: string | null; lat?: number | null; lng?: number | null } | null;
  cancellation?: string | null;
  /** «París, Francia». */
  place?: string | null;
  /** Precio visible («Desde aprox. MXN $1,780 · EUR €89»). */
  priceText?: string | null;
  /** Solo con enriquecimiento (REQ-570). */
  description?: string | null;
  tipo?: string | null;
  etiquetas?: string[];
  includes?: string[];
  /** REQ-574: reseñas recogidas en Travel Puzzle de clientes que reservaron aquí. Nunca las del proveedor. */
  ownReviews?: { ratingValue: number; reviewCount: number } | null;
}

const COPY = {
  es: { duration: "Duración", languages: "Idiomas del guía", cancellation: "Cancelación", tipo: "Tipo de experiencia", experience: "Experiencia", in: "en", price: "Precio", free: "gratis", operatedBy: "Lo opera", bookWith: "y lo reservas con Travel Puzzle", includes: "Incluye", and: "y", andI: "e" },
  en: { duration: "Duration", languages: "Guide languages", cancellation: "Cancellation", tipo: "Experience type", experience: "Experience", in: "in", price: "Price", free: "free", operatedBy: "Operated by", bookWith: "and booked with Travel Puzzle", includes: "Includes", and: "and", andI: "and" },
};
const copy = (lang: string) => (lang === "es" ? COPY.es : COPY.en);
const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const prop = (name: string, value: string) => ({ "@type": "PropertyValue", name, value });

/** REQ-820: la principal y hasta 3 más. */
export const MAX_FICHA_IMAGES = 4;

// REQ-820: rutas del sitio («/api/viajes/foto/…») a URL absoluta con el origen de la ficha; solo https, sin repetidas.
export function fichaImages(images: (string | null | undefined)[], pageUrl: string): string[] {
  let origin = "";
  try { origin = new URL(pageUrl).origin; } catch { origin = ""; }
  const out: string[] = [];
  for (const raw of images) {
    const u = typeof raw === "string" ? raw.trim() : "";
    const abs = u.startsWith("https://") ? u : u.startsWith("/") && !u.startsWith("//") && origin.startsWith("https://") ? `${origin}${u}` : "";
    if (abs && !out.includes(abs)) out.push(abs);
    if (out.length === MAX_FICHA_IMAGES) break;
  }
  return out;
}

/** «a, b y c» (es: «e» ante i-/hi-). */
function list(xs: string[], lang: string): string {
  if (xs.length <= 1) return xs.join("");
  const c = copy(lang);
  const last = xs[xs.length - 1];
  const and = lang === "es" && /^h?i[^aeiouáéíóú]/i.test(last) ? c.andI : c.and;
  return `${xs.slice(0, -1).join(", ")} ${and} ${last}`;
}

/** Datos viejos de antes de REQ-114 (2 primeras letras del nombre en inglés). Solo los que no son ambiguos. */
const LEGACY_CODES: Record<string, string> = { sp: "es", ge: "de" };

// REQ-578: idiomas del guía desde `Tour.guideLanguages` (JSON o lista), con el normalizador de REQ-114.
// Lo que no se reconoce («po», «ma»: ¿portugués o polaco?, ¿mandarín?) se omite: no se inventa.
export function guideLanguagesLabel(raw: unknown, lang: string): string[] {
  let codes: unknown = raw;
  if (typeof raw === "string") { try { codes = JSON.parse(raw); } catch { codes = []; } }
  if (!Array.isArray(codes)) return [];
  const iso = codes.filter((c): c is string => typeof c === "string").map((c) => { const k = c.trim().toLowerCase(); return LEGACY_CODES[k] ?? languageCode(k); });
  return [...new Set(iso.filter((c): c is string => !!c))].map((c) => guideLanguageName(c, lang));
}

// REQ-571: InStock solo si hay una salida futura conocida (fechas AAAA-MM-DD del sync de salidas).
export function nextAvailability(dates: unknown, today: string): "InStock" | null {
  if (!Array.isArray(dates)) return null;
  return dates.some((d) => typeof d === "string" && d.slice(0, 10) >= today) ? "InStock" : null;
}

// REQ-571 REQ-572 REQ-573 REQ-574 REQ-570 REQ-581 REQ-820 REQ-823
export function fichaJsonLd(i: FichaInput): Record<string, unknown> {
  const c = copy(i.lang);
  const rich = indexableEnrichment(i.provider);
  const operator = cardProvider(i.operator);
  const currency = clean(i.currency).toUpperCase();
  const price = i.free ? 0 : i.price;
  const images = fichaImages(i.images, i.url);
  const langs = (i.languages ?? []).map(clean).filter(Boolean);
  const tipo = rich ? clean(i.tipo) : "";
  const props = [
    ...(clean(i.duration) ? [prop(c.duration, clean(i.duration))] : []),
    ...(langs.length ? [prop(clean(i.languagesTitle) || c.languages, langs.join(", "))] : []),
    ...(clean(i.cancellation) ? [prop(c.cancellation, clean(i.cancellation))] : []),
    ...(tipo ? [prop(c.tipo, tipo)] : []),
  ];
  const keywords = rich ? [...new Set([tipo, ...(i.etiquetas ?? []).map(clean)].filter(Boolean))] : [];
  const mp = i.meetingPoint && clean(i.meetingPoint.name) ? i.meetingPoint : null;
  const geo = mp && Number.isFinite(mp.lat) && Number.isFinite(mp.lng) && mp.lat !== null && mp.lng !== null ? { "@type": "GeoCoordinates", latitude: mp.lat, longitude: mp.lng } : null;
  // REQ-1329 (D27): un free tour no lleva AggregateRating.
  const own = !i.free && i.ownReviews && i.ownReviews.reviewCount > 0 && i.ownReviews.ratingValue > 0 ? i.ownReviews : null;
  const description = rich ? clean(i.description) : "";
  const itinerary = (i.itinerary ?? []).map(clean).filter(Boolean);
  return {
    "@context": CTX,
    "@type": ["Product", "TouristTrip"],
    name: clean(i.name),
    url: i.url,
    ...(i.free ? { category: "Free tour" } : {}), // REQ-1329: término genérico, nunca la marca (C3)
    ...(images.length ? { image: images } : {}),
    ...(description ? { description: description.slice(0, 500) } : {}),
    ...(operator ? { brand: { "@type": "Brand", name: operator }, provider: { "@type": "Organization", name: operator } } : {}),
    ...(ISO_4217.test(currency) && typeof price === "number" && Number.isFinite(price) && price >= 0
      ? { offers: { "@type": "Offer", price, priceCurrency: currency, url: i.url, ...(i.availability ? { availability: `${CTX}/${i.availability}` } : {}) } }
      : {}),
    ...(props.length ? { additionalProperty: props } : {}),
    // REQ-1349: el viaje de varias ciudades tiene una sola URL; el itinerario dice todas sus ciudades, en orden.
    ...(itinerary.length ? { itinerary: { "@type": "ItemList", itemListElement: itinerary.map((name, i) => ({ "@type": "ListItem", position: i + 1, item: { "@type": "Place", name } })) } } : {}),
    ...(mp ? { tripOrigin: { "@type": "Place", name: clean(mp.name), ...(clean(mp.address) ? { address: clean(mp.address) } : {}), ...(geo ? { geo } : {}) } } : {}),
    ...(keywords.length ? { keywords: keywords.join(", ") } : {}),
    ...(own ? { aggregateRating: { "@type": "AggregateRating", ratingValue: own.ratingValue, reviewCount: own.reviewCount, bestRating: 5 } } : {}),
  };
}

const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const MAX_WORDS = 80;

// REQ-577: «En breve» bajo el H1. Solo con enriquecimiento (REQ-570). Nada inventado: cada frase sale de un dato.
export function enBreve(i: FichaInput): string | null {
  if (!indexableEnrichment(i.provider)) return null;
  const c = copy(i.lang);
  const operator = cardProvider(i.operator);
  const tipo = clean(i.tipo);
  const place = clean(i.place);
  const langs = (i.languages ?? []).map(clean).filter(Boolean);
  const priceText = clean(i.priceText);
  const head = place ? `${tipo || c.experience} ${c.in} ${place}.` : tipo ? `${tipo}.` : "";
  const fixed = [
    head,
    clean(i.duration) ? `${c.duration}: ${clean(i.duration)}.` : "",
    langs.length ? `${clean(i.languagesTitle) || c.languages}: ${list(langs, i.lang)}.` : "",
    i.free ? `${c.price}: ${c.free}.` : priceText ? `${c.price}: ${priceText.charAt(0).toLowerCase()}${priceText.slice(1)}.` : "",
    operator ? `${c.operatedBy} ${operator} ${c.bookWith}.` : "",
    clean(i.cancellation) ? `${clean(i.cancellation).replace(/\.$/, "")}.` : "",
  ].filter(Boolean);
  // Lo que incluye y el resumen del proveedor completan la respuesta mientras quepan en 80 palabras.
  let includes = (i.includes ?? []).map(clean).filter(Boolean).slice(0, 4);
  const summary = clean(i.description).split(/(?<=[.!?])\s+/)[0] ?? "";
  const build = (inc: string[], sum: string) => [...fixed, ...(inc.length ? [`${c.includes} ${list(inc.map((x) => x.replace(/\.$/, "")), i.lang)}.`] : []), ...(sum ? [sum] : [])].join(" ");
  let text = build(includes, summary);
  if (words(text) > MAX_WORDS) text = build(includes, "");
  while (words(text) > MAX_WORDS && includes.length) { includes = includes.slice(0, -1); text = build(includes, ""); }
  if (words(text) > MAX_WORDS) text = text.split(/\s+/).slice(0, MAX_WORDS).join(" ");
  return text.trim() || null;
}
