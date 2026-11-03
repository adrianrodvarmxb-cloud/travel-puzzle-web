/**
 * Traducción automática de los viajes (gate I). Se captura en español; el sitio traduce
 * a en/pt/de/fr/it al guardar. Cada texto traducido guarda la huella del español del que
 * salió y si se editó a mano (candado: nunca se vuelve a traducir solo). Puro.
 */
export const TARGET_LANGS = ["en", "pt", "de", "fr", "it"] as const;
export type TargetLang = (typeof TARGET_LANGS)[number];
export const LANG_NAME: Record<TargetLang, string> = { en: "English", pt: "Brazilian Portuguese", de: "German", fr: "French", it: "Italian" };
export const LANG_LABEL_ES: Record<TargetLang, string> = { en: "Inglés", pt: "Portugués", de: "Alemán", fr: "Francés", it: "Italiano" };

export interface Entry { text: string; src: string; manual: boolean }
export type Translations = Partial<Record<TargetLang, Record<string, Entry>>>;

interface Source {
  titleEs: string; summaryEs: string; descriptionEs: string; importantInfo: string; whatToBring: string; accessibility: string;
  visaInfo: string; priceNote: string; videoCaption: string; endPoint: string;
  highlights: string[]; includes: string[]; excludes: string[];
  itinerary: { title: string; text: string }[]; options: { id: string; name: string }[]; extras: { name: string }[];
  meetingPoints: { instructions: string }[];
}

/** Textos a traducir con llave estable ("title", "highlights.0", "options.<id>.name"…). Solo los no vacíos. */
export function sourceStrings(t: Source): Record<string, string> {
  const out: Record<string, string> = {};
  const put = (k: string, v: string | undefined) => { if (v && v.trim()) out[k] = v.trim(); };
  put("title", t.titleEs); put("summary", t.summaryEs); put("description", t.descriptionEs); put("importantInfo", t.importantInfo);
  put("whatToBring", t.whatToBring); put("accessibility", t.accessibility); put("visaInfo", t.visaInfo); put("priceNote", t.priceNote);
  put("videoCaption", t.videoCaption); put("endPoint", t.endPoint);
  t.highlights.forEach((v, i) => put(`highlights.${i}`, v));
  t.includes.forEach((v, i) => put(`includes.${i}`, v));
  t.excludes.forEach((v, i) => put(`excludes.${i}`, v));
  t.itinerary.forEach((d, i) => { put(`itinerary.${i}.title`, d.title); put(`itinerary.${i}.text`, d.text); });
  t.options.forEach((o) => put(`options.${o.id}.name`, o.name));
  t.extras.forEach((x, i) => put(`extras.${i}.name`, x.name));
  t.meetingPoints.forEach((p, i) => put(`meetingPoints.${i}.instructions`, p.instructions));
  return out;
}

/** Huella corta del texto en español (FNV-1a, 32 bits). */
export function fingerprint(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

/** Qué traducir: lo que falta o cambió y no está editado a mano. Los manuales con español nuevo se reportan. */
export function planTranslation(source: Record<string, string>, existing: Record<string, Entry> | undefined) {
  const todo: string[] = [];
  const outdatedManual: string[] = [];
  for (const [k, v] of Object.entries(source)) {
    const e = existing?.[k];
    const fresh = e && e.src === fingerprint(v);
    if (e?.manual) { if (!fresh) outdatedManual.push(k); }
    else if (!fresh) todo.push(k);
  }
  return { todo, outdatedManual };
}

/** Guarda traducciones nuevas; quita llaves que ya no existen; nunca pisa lo manual. */
export function applyTranslations(t: Translations, lang: TargetLang, results: Record<string, string>, source: Record<string, string>): Translations {
  const prev = t[lang] ?? {};
  const next: Record<string, Entry> = {};
  for (const k of Object.keys(source)) {
    if (prev[k]?.manual) next[k] = prev[k];
    else if (results[k]?.trim()) next[k] = { text: results[k].trim(), src: fingerprint(source[k]), manual: false };
    else if (prev[k]) next[k] = prev[k];
  }
  return { ...t, [lang]: next };
}

/** Corrección a mano: queda con candado. Texto vacío = quitar el candado (se vuelve a traducir solo). */
export function setManual(t: Translations, lang: TargetLang, key: string, text: string, sourceText: string): Translations {
  const prev = { ...(t[lang] ?? {}) };
  if (!text.trim()) delete prev[key];
  else prev[key] = { text: text.trim(), src: fingerprint(sourceText), manual: true };
  return { ...t, [lang]: prev };
}

/** Texto en el idioma pedido o, si no hay, el español. */
export function localized(t: Translations | null | undefined, lang: string, key: string, spanish: string): string {
  if (lang === "es") return spanish;
  return t?.[lang as TargetLang]?.[key]?.text || spanish;
}

/** Mensajes para el modelo: traducción fiel, glosario fijo y respuesta solo en JSON. */
export function buildPrompt(lang: TargetLang, items: Record<string, string>) {
  return [
    {
      role: "system" as const,
      content: [
        `You are a professional travel copywriter translating tour listings from Mexican Spanish into ${LANG_NAME[lang]}.`,
        "Rules: translate faithfully and naturally for travelers; keep the same meaning, tone and length; do not add or invent information.",
        'Never translate: "Travel Puzzle", "Free tour", brand names, people names, and place names that have no common translation.',
        "Keep every placeholder like ⟦0⟧, ⟦1⟧ exactly as it is, in the natural position of the sentence.",
        "Keep numbers, prices, currencies, times and dates exactly as written. Keep line breaks.",
        "Answer ONLY with a JSON object with the same keys and the translated strings as values.",
      ].join("\n"),
    },
    { role: "user" as const, content: JSON.stringify(items) },
  ];
}

/** Lee el JSON del modelo (aunque venga envuelto en texto o ```json) y se queda solo con las llaves pedidas. */
export function parseModelOutput(text: string, keys: string[]): Record<string, string> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return {};
  try {
    const obj = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    return Object.fromEntries(keys.filter((k) => typeof obj[k] === "string" && (obj[k] as string).trim()).map((k) => [k, obj[k] as string]));
  } catch {
    return {};
  }
}

/** Lotes de hasta `max` textos y `maxChars` caracteres. */
export function chunk(items: Record<string, string>, max: number, maxChars: number): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  let cur: Record<string, string> = {};
  let n = 0, size = 0;
  for (const [k, v] of Object.entries(items)) {
    if (n && (n >= max || size + v.length > maxChars)) { out.push(cur); cur = {}; n = 0; size = 0; }
    cur[k] = v; n++; size += v.length;
  }
  if (n) out.push(cur);
  return out;
}

/** Avance por idioma para el gestor. */
export function translationStatus(source: Record<string, string>, t: Translations) {
  const total = Object.keys(source).length;
  return Object.fromEntries(TARGET_LANGS.map((l) => {
    const { todo, outdatedManual } = planTranslation(source, t[l]);
    return [l, { done: total - todo.length - outdatedManual.length, pending: todo.length, outdatedManual: outdatedManual.length }];
  })) as Record<TargetLang, { done: number; pending: number; outdatedManual: number }>;
}

const FIELD_LABEL: Record<string, string> = {
  title: "Título", summary: "Resumen", description: "Descripción", importantInfo: "Información importante", whatToBring: "Qué llevar",
  accessibility: "Accesibilidad", visaInfo: "Visa y requisitos", priceNote: "Nota del precio", videoCaption: "Descripción del video", endPoint: "Punto de término",
};

/** Nombre legible de la llave para el gestor ("highlights.0" → "Destacado 1"). */
export function keyLabel(key: string): string {
  if (FIELD_LABEL[key]) return FIELD_LABEL[key];
  const [kind, a, b] = key.split(".");
  const n = Number(a) + 1;
  switch (kind) {
    case "highlights": return `Destacado ${n}`;
    case "includes": return `Incluye ${n}`;
    case "excludes": return `No incluye ${n}`;
    case "itinerary": return `Día ${n} · ${b === "title" ? "título" : "texto"}`;
    case "options": return "Nombre de la opción";
    case "extras": return `Extra ${n}`;
    case "meetingPoints": return `Punto de encuentro ${n} · indicaciones`;
    default: return key;
  }
}

/** Términos que nunca se traducen (se mandan a la IA como marcadores ⟦0⟧, ⟦1⟧…). */
export const GLOSSARY = ["Travel Puzzle", "Free tour"];
const GLOSSARY_RE = new RegExp(GLOSSARY.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "gi");

export function protectTerms(text: string): { text: string; terms: string[] } {
  const terms: string[] = [];
  const out = text.replace(GLOSSARY_RE, (m) => { terms.push(m); return `⟦${terms.length - 1}⟧`; });
  return { text: out, terms };
}

/** Repone los términos; null si la IA perdió algún marcador (esa traducción se rechaza). */
export function restoreTerms(text: string, terms: string[]): string | null {
  let out = text;
  for (let i = 0; i < terms.length; i++) {
    const token = `⟦${i}⟧`;
    if (!out.includes(token)) return null;
    out = out.split(token).join(terms[i]);
  }
  return out;
}
