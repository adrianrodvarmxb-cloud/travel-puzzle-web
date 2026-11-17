/**
 * REQ-10776 · Ficha única, ola 6 (plan `docs/plan-ficha-unica-2026-11.md`, §2 y §3; decisión 2, REQ-10581; decisión 3,
 * REQ-10582). Modelo común de la ficha: lo que cualquier proveedor tiene que entregar para que la plantilla de 21
 * bloques lo pinte sin saber de proveedores. Un adaptador por proveedor (`src/ficha/adapters/`) produce este modelo;
 * los lectores (página, Mila, correo, reserva, buscador) lo consumen.
 *
 * Reglas del modelo:
 * - Solo datos públicos: nunca neto, comisión, teléfonos ni correos del operador (REQ-10540, marca blanca).
 * - Si falta el dato, va `null` o `[]`: el bloque se oculta; nunca «N/D» (plan §3).
 * - Textos ya en el idioma pedido (`lang`); nada de `Intl` en el cliente (INC-001).
 * - Puro: solo tipos. La validación vive en `src/ficha/schemas/ficha.ts`.
 */

export type FichaLang = "es" | "en" | "pt" | "fr" | "de" | "it";

/** Decisión 1: la sección del sitio a la que pertenece el producto. */
export type FichaSection = "experiencias" | "traslados";

/** Cómo se reserva (decisión 7 y plan: cuatro controles intercambiables) y quién cobra. */
export type BookingMode = "calendar" | "purchase" | "request" | "advisor";
export type ChargedBy = "travelpuzzle" | "provider" | "none";

export interface FichaPlace { slug: string; name: string }
export interface FichaCountry { code: string; name: string }

export interface FichaMedia { url: string; alt: string | null }

export interface FichaRating {
  /** Nota pública (1–5) o null si el proveedor no la da o no se muestra (decisión 18). */
  value: number | null;
  count: number;
  /** Decisión 16: solo con 4.9 y 180 reseñas. */
  favorite: boolean;
}

export interface FichaTerm { slug: string; label: string }
export interface FichaTaxonomy { tipo: FichaTerm | null; temas: FichaTerm[]; atributos: FichaTerm[] }

export interface FichaKeyFacts {
  durationMinutes: number | null;
  /** Texto corto de horarios («09:00 y 07:15»), ya en el idioma. */
  schedule: string | null;
  /** Códigos ISO de idioma del guía. */
  languages: string[];
  season: string | null;
  /** Decisión 12: escala 1–5. */
  difficulty: 1 | 2 | 3 | 4 | 5 | null;
  /** Edades de niño e infante tal como las da el proveedor. */
  ages: { childFrom: number; childTo: number } | null;
}

export type FichaMeeting =
  | { kind: "exact"; lat: number; lng: number; title: string | null }
  | { kind: "zone"; lat: number; lng: number; radiusM: number; title: string | null }
  | { kind: "none"; title: string | null };

export interface FichaPrice { amount: number; currency: string; per: "person" | "group" | "total" }

export interface FichaOption {
  id: string;
  name: string;
  price: FichaPrice | null;
  /** null = el proveedor no lo dice. */
  transferIncluded: boolean | null;
  startTime: string | null;
}

export interface FichaCancellation {
  /** Horas de anticipación para cancelar sin cargo; null si no se conocen. Una sola por ficha (decisión 34). */
  hours: number | null;
  text: string | null;
}

export interface FichaItineraryDay { day: number; title: string | null; text: string }

export interface FichaBooking {
  mode: BookingMode;
  chargedBy: ChargedBy;
  /** Horas de anticipación mínima para reservar; null si no aplica. */
  leadHours: number | null;
}

export interface FichaModel {
  id: string;
  provider: string;
  /** Identificador del proveedor (externalId de Tour o ref del viaje). */
  externalRef: string;
  /** Código Travel Puzzle cuando existe (viajes); null en tours. */
  code: string | null;
  slug: string | null;
  lang: FichaLang;
  section: FichaSection;

  // 1 Migas
  country: FichaCountry;
  city: FichaPlace;
  // 2 Galería
  gallery: FichaMedia[];
  // 3 Título, calificación y marca
  title: string;
  rating: FichaRating | null;
  // 4 Taxonomía
  taxonomy: FichaTaxonomy;
  // 5 Datos clave
  facts: FichaKeyFacts;
  // 6 «En breve»
  brief: string | null;
  // 7 Lo más destacado
  highlights: string[];
  // 8 Descripción (HTML saneado del proveedor)
  descriptionHtml: string | null;
  // 9 Itinerario
  itinerary: FichaItineraryDay[];
  // 10 Incluye / No incluye
  includes: string[];
  excludes: string[];
  // 11 Punto de encuentro
  meeting: FichaMeeting;
  // 12 Opciones y precios (adicionales llegan en REQ-10636, ola 12)
  price: FichaPrice | null;
  options: FichaOption[];
  // 13 Antes de ir
  whatToBring: string[];
  requirements: string[];
  // 14 Condiciones
  cancellation: FichaCancellation | null;
  // 15 Información importante
  notes: string[];
  /** Línea «Opera en destino: …» (decisión 38); null si no se muestra. */
  operator: string | null;
  // Panel
  booking: FichaBooking;
}
