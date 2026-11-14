import { z } from "zod";
import { parseEach } from "./schemas";
import { scrubProviderDescription, scrubProviderName } from "./text";
import { languageCode } from "@/departures/lib/language";
import { hasRealReviews } from "@/home/lib/review-score";

/**
 * `TourDetails` del listado (`includeDetails=true`) y de `GetTourDetailsList`. La ola 1 lo guarda tal
 * cual (`infoTourSchema.details: unknown`); aquí se valida lo que alimenta a `Tour` (REQ-10511):
 *
 *   Description                → TourTranslation.description  (sin el nombre del proveedor, REQ-3372)
 *   Summary (ShortDescription) → TourTranslation.brief
 *   PicList (ListPictures)     → Tour.images
 *   StartPoint                 → Tour.meetingPoint.title
 *   DetIncluye / DetNoIncluye  → Tour.includes / Tour.excludes (renglones)
 *   CancelationPolicy          → Tour.cancellationPolicy
 *   TourLanguages              → Tour.guideLanguages (ISO 639-1; Tangol manda códigos «ESP,ENG,POR», REQ-10539)
 *   EndPoint                   → Tour.endPoint (0032, REQ-10538)
 *   WhatToBring / PhysicalReq / Difficulty / Others → Tour.whatToBring / physicalRequirements / difficulty /
 *                                providerNotes (0032, REQ-10537)
 *   ChdFrom/ChdTo, InfFrom/InfTo → Tour.childAgeFrom/To, infantAgeFrom/To (0032, REQ-10538)
 *   Reviews / ReviewsQty       → Tour.rating / Tour.reviewsNumber (solo reseñas reales, REQ-450)
 *
 * Los nombres `Summary`, `PicList`, `StartPoint`, `DetIncluye`, `DetNoIncluye`, `CancelationPolicy`,
 * `TourLanguages`, `Reviews` y `ReviewsQty` son los del swagger real de Tangol (GetTourDetailsResponse).
 * `ShortDescription`/`ListPictures` eran una suposición de la ola 2 y por eso los 1,202 tours de la
 * carga del 13 nov quedaron sin resumen ni imágenes extra; se siguen aceptando por si alguna respuesta
 * los trae. Si la forma no coincide, el detalle se descarta, se cuenta y se registra: el tour queda con
 * la portada (`UrlHomePic`) y sin descripción, nunca con un error (regla 8 del blindaje). Pura.
 */

const httpUrl = z
  .string()
  .regex(/^\s*https?:\/\//i)
  .transform((s) => s.trim());

/** Una imagen viene como URL suelta o dentro de un objeto; cualquier otra forma se descarta y se cuenta. */
const pictureSchema = z.union([
  httpUrl,
  z.object({ UrlPic: httpUrl }).transform((p) => p.UrlPic),
  z.object({ Url: httpUrl }).transform((p) => p.Url),
]);

const text = z.string().nullish();
const num = z.number().nullish();

const detailsSchema = z
  .object({
    Description: text,
    Summary: text,
    ShortDescription: text,
    PicList: z.unknown().optional(),
    ListPictures: z.unknown().optional(),
    StartPoint: text,
    EndPoint: text,
    CancelationPolicy: text,
    DetIncluye: text,
    DetNoIncluye: text,
    TourLanguages: text,
    Reviews: num,
    ReviewsQty: num,
    // REQ-10537 / REQ-10538: se validan campo por campo más abajo; un dato con otra forma se descarta solo él.
    WhatToBring: z.unknown().optional(),
    PhysicalReq: z.unknown().optional(),
    Difficulty: z.unknown().optional(),
    Others: z.unknown().optional(),
    ChdFrom: z.unknown().optional(),
    ChdTo: z.unknown().optional(),
    InfFrom: z.unknown().optional(),
    InfTo: z.unknown().optional(),
  })
  .transform((d) => ({
    description: d.Description ?? null,
    brief: d.Summary ?? d.ShortDescription ?? null,
    pictures: d.PicList ?? d.ListPictures,
    startPoint: d.StartPoint ?? null,
    endPoint: d.EndPoint ?? null,
    cancellationPolicy: d.CancelationPolicy ?? null,
    includes: d.DetIncluye ?? null,
    excludes: d.DetNoIncluye ?? null,
    languages: d.TourLanguages ?? null,
    reviews: d.Reviews ?? null,
    reviewsQty: d.ReviewsQty ?? null,
    whatToBring: d.WhatToBring,
    physicalRequirements: d.PhysicalReq,
    difficulty: d.Difficulty,
    providerNotes: d.Others,
    childAges: [d.ChdFrom, d.ChdTo] as const,
    infantAges: [d.InfFrom, d.InfTo] as const,
  }));

export interface AgeRange { from: number; to: number }

export interface TangolDetails {
  description: string | null;
  brief: string | null;
  images: string[];
  /** REQ-10511: punto de encuentro (texto; Tangol no manda coordenadas). */
  startPoint: string | null;
  endPoint: string | null;
  cancellationPolicy: string | null;
  includes: string[];
  excludes: string[];
  /** Códigos ISO 639-1 de los idiomas del tour; lo que no se reconoce no se inventa. */
  languages: string[];
  /** REQ-10537: «Antes de ir» (texto del proveedor tal cual; la ficha lo limpia al pintar, REQ-10540). */
  whatToBring: string | null;
  physicalRequirements: string | null;
  difficulty: string | null;
  providerNotes: string | null;
  /** REQ-10538: edades de niño e infante; null si el proveedor no las define (0–0) o no tienen sentido. */
  childAges: AgeRange | null;
  infantAges: AgeRange | null;
  /** Solo reseñas reales (≥ 1 reseña y calificación entre 1 y 5); si no, null / 0. */
  rating: number | null;
  reviewsNumber: number;
  /** Registros malos del detalle (el bloque completo o cada imagen suelta). */
  discarded: number;
}

export const EMPTY_DETAILS: Readonly<TangolDetails> = Object.freeze({
  description: null,
  brief: null,
  images: [],
  startPoint: null,
  endPoint: null,
  cancellationPolicy: null,
  includes: [],
  excludes: [],
  languages: [],
  whatToBring: null,
  physicalRequirements: null,
  difficulty: null,
  providerNotes: null,
  childAges: null,
  infantAges: null,
  rating: null,
  reviewsNumber: 0,
  discarded: 0,
});

const TAGS = /<[^>]+>/g;
const BULLET = /^[\s\-–—•·*]+/;

/**
 * «Incluye» y «No incluye» llegan como texto corrido: un renglón por concepto, a veces con HTML.
 * Se parte por salto de línea, `<br>`, `<li>`; se quitan etiquetas y viñetas; sin vacíos ni repetidos.
 */
// REQ-10511
export function splitLines(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const out: string[] = [];
  for (const part of raw.replace(/<br\s*\/?>|<\/?li[^>]*>|<\/?p[^>]*>/gi, "\n").split(/\r?\n/)) {
    const line = tidy(scrubProviderName(part.replace(TAGS, "").replace(BULLET, "").trim()));
    if (line && !out.includes(line)) out.push(line);
  }
  return out;
}

/** Nombres en español que `languageCode` (REQ-114, nombres en inglés y nativos) no conoce. */
const NOMBRES_ES: Record<string, string> = {
  ingles: "en", aleman: "de", frances: "fr", ruso: "ru", chino: "zh", japones: "ja", coreano: "ko", holandes: "nl",
  polaco: "pl", hebreo: "he", arabe: "ar", griego: "el", turco: "tr", sueco: "sv", noruego: "no", danes: "da",
};
const DIACRITICS = /[̀-ͯ]/g;

/**
 * REQ-10539: Tangol manda `TourLanguages` como códigos de tres letras separados por coma. Valores reales vistos
 * el 13 nov 2026 (workflow de solo lectura, 3 destinos de AR): «ESP», «ESP,ENG», «ESP,ENG,POR» y vacío.
 * Se agregan los códigos ISO 639-2 equivalentes (spa, eng, por, ita, fra/fre, deu/ger); cualquier otro se omite.
 */
const CODIGOS_TANGOL: Record<string, string> = {
  esp: "es", spa: "es", eng: "en", ing: "en", por: "pt", ita: "it", fra: "fr", fre: "fr", deu: "de", ger: "de",
};

/** "ESP,ENG,POR" o "Español, Inglés / Portugués" → ["es", "en", "pt"]. Lo desconocido se omite; sin repetidos. */
// REQ-10511, REQ-10539
export function tangolLanguages(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const out: string[] = [];
  for (const token of raw.split(/[,;/|]|\s+y\s+|\s+and\s+/i)) {
    const t = token.trim();
    if (!t) continue;
    const plain = t.normalize("NFD").replace(DIACRITICS, "").toLowerCase();
    const code = CODIGOS_TANGOL[plain] ?? NOMBRES_ES[plain] ?? languageCode(t) ?? languageCode(plain);
    if (code && !out.includes(code)) out.push(code);
  }
  return out;
}

/** Calificación y reseñas solo si son reales (REQ-450); si no, la ficha no inventa números. */
// REQ-10511
export function tangolReviews(reviews: number | null, qty: number | null): { rating: number | null; reviewsNumber: number } {
  const candidate = { rating: reviews, reviews: Math.trunc(qty ?? 0) };
  return hasRealReviews(candidate) ? { rating: reviews, reviewsNumber: candidate.reviews } : { rating: null, reviewsNumber: 0 };
}

/** Texto corto limpio del proveedor y sin el espacio que queda antes de una coma al quitarlo. */
const tidy = (v: string) => v.replace(/\s+([,;.])/g, "$1");
const shortText = (v: string | null) => tidy(scrubProviderName(v)).trim() || null;

/** REQ-10537: texto del proveedor; si no es texto o viene vacío, null (un dato malo se descarta solo él). */
// REQ-10537
export function optionalText(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

const age = z.number().int().min(0).max(99);

/** REQ-10538: rango de edad válido (enteros 0–99, desde ≤ hasta y hasta > 0); si no, null. */
// REQ-10538
export function ageRange(from: unknown, to: unknown): AgeRange | null {
  const f = age.safeParse(from);
  const t = age.safeParse(to);
  if (!f.success || !t.success || t.data === 0 || f.data > t.data) return null;
  return { from: f.data, to: t.data };
}

// REQ-3370, REQ-3371, REQ-10511, REQ-10537, REQ-10538
export function parseTourDetails(raw: unknown): TangolDetails {
  if (raw === null || raw === undefined) return { ...EMPTY_DETAILS };
  const parsed = detailsSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[tangol] detalle del tour descartado: la forma no coincide con TourDetails");
    return { ...EMPTY_DETAILS, discarded: 1 };
  }
  const d = parsed.data;
  const pics = parseEach(pictureSchema, d.pictures);
  const images: string[] = [];
  for (const url of pics.items) if (!images.includes(url)) images.push(url);
  return {
    description: scrubProviderDescription(d.description),
    brief: shortText(d.brief),
    images,
    startPoint: shortText(d.startPoint),
    endPoint: shortText(d.endPoint),
    cancellationPolicy: scrubProviderDescription(d.cancellationPolicy),
    includes: splitLines(d.includes),
    excludes: splitLines(d.excludes),
    languages: tangolLanguages(d.languages),
    whatToBring: optionalText(d.whatToBring),
    physicalRequirements: optionalText(d.physicalRequirements),
    difficulty: optionalText(d.difficulty),
    providerNotes: optionalText(d.providerNotes),
    childAges: ageRange(...d.childAges),
    infantAges: ageRange(...d.infantAges),
    ...tangolReviews(d.reviews, d.reviewsQty),
    discarded: pics.discarded,
  };
}
