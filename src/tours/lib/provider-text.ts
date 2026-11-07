/**
 * D31 (PO): «Nunca mencionar FREETOUR al cliente». Limpia los textos del proveedor al pintar (descripción, resumen,
 * título, «incluye»); la base que escribe el sync no se toca. Mismo detector que reseñas y tarjetas (REQ-171,
 * `mentionsPlatform`): solo el nombre pegado («freetour», «freetours») o el dominio («freetour.com», «free tour .com»);
 * «free tour» como categoría genérica no. Pura y determinista.
 */
import { mentionsPlatform } from "@/reviews/lib/platform-mention";

/** El nombre o el dominio, con la URL completa si la trae. */
const TOKEN = /(?:https?:\/\/)?(?:www\.)?free[\s-]*tours?\s*\.\s*com(?:\/[^\s)\]]*)?|\bfreetours?\b/gi;
/** Paréntesis o corchetes (sin anidar). */
const BRACKETS = /\s*[([][^()[\]]*[)\]]/g;
/** Separadores sueltos que quedan al inicio o al final al quitar el nombre. */
const EDGES = /^[\s\-–—|:·,;/]+|[\s\-–—|:·,;/]+$/g;
const SENTENCE = /(?<=[.!?…])\s+/;

// REQ-1240
export function scrubDescription(text: string | null | undefined): string | null {
  if (!text) return null;
  if (!mentionsPlatform(text)) return text;
  const lines = text.split(/(\r?\n)/);
  const out: string[] = [];
  for (const part of lines) {
    if (/^\r?\n$/.test(part)) { out.push(part); continue; }
    if (!mentionsPlatform(part)) { out.push(part); continue; }
    const kept = part.split(SENTENCE).filter((s) => !mentionsPlatform(s)).join(" ");
    out.push(kept);
  }
  // Líneas que quedaron vacías: se van con su salto para no dejar huecos de más.
  const joined = out.join("")
    .replace(/(\r?\n)[ \t]+(?=\r?\n)/g, "$1")
    .replace(/((?:\r?\n){2})(?:\r?\n)+/g, "$1")
    .trim();
  return joined || null;
}

// REQ-1241
export function scrubName(text: string | null | undefined): string {
  if (!text) return "";
  if (!mentionsPlatform(text)) return text;
  return text
    .replace(BRACKETS, (m) => (mentionsPlatform(m) ? "" : m))
    .replace(TOKEN, " ")
    .replace(/\s{2,}/g, " ")
    .replace(EDGES, "")
    .trim();
}

// REQ-1242
export function scrubList(items: readonly string[] | null | undefined): string[] {
  return (items ?? []).filter((s) => !mentionsPlatform(s)).map((s) => s.trim()).filter(Boolean);
}

// REQ-1243
export function scrubTranslation<T extends { title?: string | null; brief?: string | null; description?: string | null }>(tr: T): T {
  return {
    ...tr,
    ...(tr.title !== undefined && { title: tr.title === null ? null : scrubName(tr.title) }),
    ...(tr.brief !== undefined && { brief: scrubDescription(tr.brief) }),
    ...(tr.description !== undefined && { description: scrubDescription(tr.description) }),
  };
}

// REQ-1243: fila de tour del repositorio (Prisma) lista para salir al cliente: traducciones e «incluye».
export function scrubTourRow<R extends { translations?: readonly { title?: string | null; brief?: string | null; description?: string | null }[]; includes?: unknown }>(row: R): R {
  const out = { ...row };
  if (Array.isArray(row.translations)) (out as { translations: unknown }).translations = row.translations.map(scrubTranslation);
  if (Array.isArray(row.includes)) (out as { includes: unknown }).includes = scrubList(row.includes.filter((x): x is string => typeof x === "string"));
  return out;
}
