/**
 * Ficha con todo el detalle del proveedor (plan docs/plan-ficha-detalle-proveedor-2026-11.md, gates A/B/C firmados
 * 13 nov 2026 22:40). Arma, a partir de la fila de "Tour" (columnas de la 0031 y la 0032, leídas con SQL aparte),
 * lo que la ficha pinta en tres lugares:
 *   - REQ-10536 bloque «Condiciones» (bajo «Qué incluye»): qué no incluye, política de cancelación y horas para
 *     cancelar sin cargo (`hoursCancelation` de las opciones en `availabilityRules`).
 *   - REQ-10537 bloque «Antes de ir» (tras la descripción): qué llevar, requisitos físicos, dificultad y notas.
 *   - REQ-10538 / REQ-10539 hechos de la franja: horario(s) de salida, punto de término, edades e idiomas del guía.
 * Genérico (gate B): no sabe de qué proveedor viene; cada bloque o hecho aparece solo si el tour tiene el dato.
 * Valida cada campo por separado (regla 8 del blindaje): un dato malo se descarta, se cuenta y se registra.
 * REQ-10540: los textos del proveedor pierden las frases con URL, dominio, correo o teléfono (cláusula 7.2);
 * el nombre del operador NO se borra (REQ-10542). Pura y determinista: sin Intl ni fechas; el idioma llega por
 * parámetro y los textos por `tr` (el sistema de traducciones del sitio), así se calcula en el servidor (INC-001).
 */
import { z } from "zod";
import { guideLanguagesLabel } from "@/seo/lib/ficha-ld";
import { indexableEnrichment } from "@/seo/lib/enrichment";

export interface PracticalFact { key: string; label: string; value: string; clientOnly: boolean }
export interface ConditionsView {
  excludes: string[];
  cancellationPolicy: string | null;
  /** Horas mínimas para cancelar sin cargo; `varies` = las opciones del tour no piden lo mismo. */
  freeCancellation: { hours: number; varies: boolean } | null;
}
export type BeforeYouGoKey = "whatToBring" | "physicalRequirements" | "difficulty" | "providerNotes";
export interface BeforeYouGoView { items: { key: BeforeYouGoKey; text: string }[] }
export interface PracticalView {
  conditions: ConditionsView | null;
  beforeYouGo: BeforeYouGoView | null;
  facts: PracticalFact[];
  /** Campos con otra forma que se descartaron. */
  discarded: number;
}

export const EMPTY_PRACTICAL: Readonly<PracticalView> = Object.freeze({ conditions: null, beforeYouGo: null, facts: [], discarded: 0 });

// ───────── REQ-10540: marca blanca de contactos y enlaces ─────────
const URL = /\b(?:https?:\/\/|www\.)\S+/i;
const DOMAIN = /\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com|net|org|info|tours?|travel|ly|ar|cl|br|mx|pe|uy|co|es|io)(?:\.[a-z]{2})?\b/i;
const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const PHONE_RUN = /\+?\(?\d[\d\s().-]{6,}\d/g;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SENTENCE = /(?<=[.!?…])\s+/;
/** Abreviaturas que no cierran frase («tel. 11 4363…», «Av. Corrientes»): se unen con lo que sigue. */
const ABBREV = /\b(?:tel|tél|telf|tlf|cel|av|nro|sr|sra|dr)\.$/i;

function sentences(line: string): string[] {
  const out: string[] = [];
  for (const s of line.split(SENTENCE)) {
    if (out.length && ABBREV.test(out[out.length - 1])) out[out.length - 1] += ` ${s}`;
    else out.push(s);
  }
  return out;
}

/** Un tramo de 8 o más dígitos seguidos (con espacios, guiones, puntos o paréntesis) que no es una fecha AAAA-MM-DD. */
function hasPhone(text: string): boolean {
  for (const m of text.match(PHONE_RUN) ?? []) {
    const run = m.trim();
    if (ISO_DATE.test(run)) continue;
    // «1.500 m» o «09:00 - 13:00» no llegan a 8 dígitos; un teléfono sí.
    if ((run.match(/\d/g) ?? []).length >= 8) return true;
  }
  return false;
}

// REQ-10540
export function hasContact(text: string): boolean {
  return URL.test(text) || EMAIL.test(text) || DOMAIN.test(text) || hasPhone(text);
}

/** Texto del proveedor: se caen las frases con URL, dominio, correo o teléfono; si no queda nada, null. */
// REQ-10540
export function whiteLabelText(text: string | null | undefined): string | null {
  if (typeof text !== "string" || !text.trim()) return null;
  const kept = text
    .split(/\r?\n/)
    .map((line) => sentences(line).filter((s) => s.trim() && !hasContact(s)).join(" ").trim())
    .filter(Boolean)
    .join("\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  return kept || null;
}

/** Texto corto (punto de término, dificultad): si trae contacto o enlace, se descarta entero. */
// REQ-10540
export function whiteLabelShort(text: string | null | undefined): string | null {
  if (typeof text !== "string" || !text.trim()) return null;
  return hasContact(text) ? null : text.trim();
}

/** Renglones del proveedor: se descarta el que trae contacto o enlace; sin vacíos. */
// REQ-10540
export function whiteLabelList(items: readonly unknown[] | null | undefined): string[] {
  return (items ?? []).filter((s): s is string => typeof s === "string").map((s) => s.trim()).filter((s) => s && !hasContact(s));
}

// ───────── Validación campo por campo (regla 8) ─────────
const optionSchema = z.object({ startTime: z.string().nullish(), hoursCancelation: z.number().nullish() }).passthrough();
const rulesSchema = z.object({ options: z.array(z.unknown()) }).passthrough();
const stringList = z.array(z.unknown());

/** Lee un JSON guardado como texto (o ya convertido). `undefined` = vino con otra forma. */
function json(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  try { return JSON.parse(raw); } catch { return undefined; }
}

/** Opciones válidas de `availabilityRules`; cada opción con otra forma se ignora. */
function options(rules: unknown): z.infer<typeof optionSchema>[] {
  const r = rulesSchema.safeParse(rules);
  if (!r.success) return [];
  return r.data.options.flatMap((o) => { const p = optionSchema.safeParse(o); return p.success ? [p.data] : []; });
}

/** REQ-10536: horas mínimas para cancelar sin cargo entre las opciones; 0, negativas o nulas no cuentan. */
// REQ-10536
export function freeCancellation(rules: unknown): ConditionsView["freeCancellation"] {
  const hours = options(rules).map((o) => o.hoursCancelation).filter((h): h is number => typeof h === "number" && Number.isFinite(h) && h > 0);
  if (!hours.length) return null;
  return { hours: Math.min(...hours), varies: new Set(hours).size > 1 };
}

/** REQ-10538: horarios de salida distintos en HH:MM, ordenados; lo que no es una hora válida se ignora. */
// REQ-10538
export function departureTimes(rules: unknown): string[] {
  const out = new Set<string>();
  for (const o of options(rules)) {
    const m = /^(\d{1,2}):(\d{2})/.exec((o.startTime ?? "").trim());
    if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) continue;
    out.add(`${m[1].padStart(2, "0")}:${m[2]}`);
  }
  return [...out].sort();
}

const age = z.number().int().min(0).max(99);
/** REQ-10538: rango de edad válido (enteros 0–99, desde ≤ hasta y hasta > 0); si no, null. */
// REQ-10538
export function ageRange(from: unknown, to: unknown): { from: number; to: number } | null {
  const f = age.safeParse(from);
  const t = age.safeParse(to);
  if (!f.success || !t.success || t.data === 0 || f.data > t.data) return null;
  return { from: f.data, to: t.data };
}

const MAX_TIMES = 4;
const BEFORE_KEYS: readonly BeforeYouGoKey[] = ["whatToBring", "physicalRequirements", "difficulty", "providerNotes"];

/**
 * Fila de "Tour" → bloques y hechos de la ficha. `tr` resuelve las etiquetas con el sistema de traducciones.
 */
// REQ-10536, REQ-10537, REQ-10538, REQ-10539, REQ-10540
export function practicalInfo(raw: unknown, { lang, tr }: { lang: string; tr: (key: string) => string }): PracticalView {
  if (!raw || typeof raw !== "object") return { ...EMPTY_PRACTICAL, facts: [] };
  const row = raw as Record<string, unknown>;
  let discarded = 0;
  const bad = (field: string) => { discarded++; console.warn(`[ficha] dato descartado: ${field} con otra forma`); };
  const text = (field: string, short = false): string | null => {
    const v = row[field];
    if (v === null || v === undefined) return null;
    if (typeof v !== "string") { bad(field); return null; }
    return short ? whiteLabelShort(v) : whiteLabelText(v);
  };

  // REQ-10536
  let excludes: string[] = [];
  if (row.excludes !== null && row.excludes !== undefined) {
    const list = stringList.safeParse(json(row.excludes));
    if (list.success) excludes = whiteLabelList(list.data);
    else bad("excludes");
  }
  let rules: unknown = null;
  if (row.availabilityRules !== null && row.availabilityRules !== undefined) {
    rules = json(row.availabilityRules);
    if (!rulesSchema.safeParse(rules).success) { bad("availabilityRules"); rules = null; }
  }
  const cancellationPolicy = text("cancellationPolicy");
  const free = freeCancellation(rules);
  const conditions = excludes.length || cancellationPolicy || free ? { excludes, cancellationPolicy, freeCancellation: free } : null;

  // REQ-10537
  const items = BEFORE_KEYS.flatMap((key) => { const t = text(key, key === "difficulty"); return t ? [{ key, text: t }] : []; });
  const beforeYouGo = items.length ? { items } : null;

  // REQ-10538 / REQ-10539
  const facts: PracticalFact[] = [];
  const times = departureTimes(rules);
  if (times.length) {
    const shown = times.slice(0, MAX_TIMES).join(", ") + (times.length > MAX_TIMES ? ` +${times.length - MAX_TIMES}` : "");
    facts.push({ key: "horario-salida", label: tr(times.length > 1 ? "tours.departureTimes" : "tours.departureTime"), value: shown, clientOnly: false });
  }
  const endPoint = text("endPoint", true);
  if (endPoint) facts.push({ key: "punto-termino", label: tr("tours.endPoint"), value: endPoint, clientOnly: false });
  const range = (r: { from: number; to: number }) => tr("tours.agesRange").replace("{from}", String(r.from)).replace("{to}", String(r.to));
  const child = ageRange(row.childAgeFrom, row.childAgeTo);
  if (child) facts.push({ key: "edad-ninos", label: tr("tours.childAges"), value: range(child), clientOnly: false });
  const infant = ageRange(row.infantAgeFrom, row.infantAgeTo);
  if (infant) facts.push({ key: "edad-infantes", label: tr("tours.infantAges"), value: range(infant), clientOnly: false });
  const langs = guideLanguagesLabel(row.guideLanguages, lang).join(", ");
  // REQ-588: sin enriquecimiento (FREETOUR) el idioma del guía se pinta solo en el cliente y con data-nosnippet.
  const provider = typeof row.providerId === "string" ? row.providerId : null;
  if (langs) facts.push({ key: "idioma-guia", label: tr("tours.guideLanguage"), value: langs, clientOnly: !indexableEnrichment(provider) });

  return { conditions, beforeYouGo, facts, discarded };
}
