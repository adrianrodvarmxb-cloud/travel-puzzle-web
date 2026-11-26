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
  /** REQ-10870: la duración en las palabras del proveedor, ya en el idioma («24–48 h» de Big Bus); si viene, manda sobre los minutos. */
  durationText?: string | null;
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

/** REQ-10881 (ola 12): tipo de adicional del proveedor (plan §8 bis). */
export type FichaAddonKind =
  | "transfer"
  | "single-room"
  | "half-board"
  | "full-board"
  | "internal-flight"
  | "extension"
  | "extra-night"
  | "optional"
  | "date-surcharge"
  | "other";

/** REQ-10881 (ola 12): adicional a precio FINAL público; sin neto ni margen (eso nunca entra al modelo). */
export interface FichaAddon {
  id: string;
  kind: FichaAddonKind;
  /** Nombre ya en el idioma de la ficha. */
  name: string;
  /** Precio final con su moneda; null = sin precio confirmado (no se muestra). */
  price: FichaPrice | null;
  /** Temporada (AAAA-MM-DD); null = todo el año. Sin las dos fechas claras no se publica. */
  season: { from: string; to: string } | null;
  /** Nota al cliente (en vuelos internos, la cláusula de deslinde; obligatoria para que salga). */
  note: string | null;
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
  // 12 Opciones y precios
  price: FichaPrice | null;
  options: FichaOption[];
  /** REQ-10881 (ola 12, REQ-10636): adicionales del proveedor a precio final; opcional para no romper a quien arma el modelo. */
  addons?: FichaAddon[];
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
