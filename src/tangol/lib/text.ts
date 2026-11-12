/**
 * Marca: el cliente solo ve Travel Puzzle (decisión del PO, 4 nov 2026: sin afiliados, nada enlaza al
 * sitio del proveedor). Limpia el nombre y el dominio del proveedor de los textos de la respuesta antes
 * de que lleguen a `Tour`. Mismo criterio que `scrubName`/`scrubDescription` de Freetour
 * (`src/tours/lib/provider-text.ts`), con el token de Tangol. Puras y deterministas.
 */

/** El nombre pegado («tangol», «tangoltours») o el dominio, con la URL completa si la trae. */
const TOKEN = /(?:https?:\/\/)?(?:www\.)?tangol[a-z]*\s*\.\s*com(?:\.[a-z]{2,3})?(?:\/[^\s)\]]*)?|\btangol[a-z]*\b/gi;
/** Paréntesis o corchetes (sin anidar). */
const BRACKETS = /\s*[([][^()[\]]*[)\]]/g;
/** Separadores sueltos que quedan al inicio o al final al quitar el nombre. */
const EDGES = /^[\s\-–—|:·,;/]+|[\s\-–—|:·,;/]+$/g;
const SENTENCE = /(?<=[.!?…])\s+/;
const DIACRITICS = /[̀-ͯ]/g;
const PROVIDER = /tangol/;

const normalize = (s: string) => s.normalize("NFD").replace(DIACRITICS, "").toLowerCase();

// REQ-3372
export function mentionsProvider(text: string | null | undefined): boolean {
  return !!text && PROVIDER.test(normalize(text));
}

/** Título o texto corto: se quita el nombre y lo que lo envuelve; puede quedar vacío (entonces se descarta el tour). */
// REQ-3372
export function scrubProviderName(text: string | null | undefined): string {
  if (!text) return "";
  if (!mentionsProvider(text)) return text;
  return text
    .replace(BRACKETS, (m) => (mentionsProvider(m) ? "" : m))
    .replace(TOKEN, " ")
    .replace(/\s{2,}/g, " ")
    .replace(EDGES, "")
    .trim();
}

/** Descripción: solo caen las frases que nombran al proveedor; si no queda nada, `null`. */
// REQ-3372
export function scrubProviderDescription(text: string | null | undefined): string | null {
  if (!text) return null;
  if (!mentionsProvider(text)) return text;
  const kept = text
    .split(/(\r?\n)/)
    .map((part) => {
      if (/^\r?\n$/.test(part) || !mentionsProvider(part)) return part;
      return part.split(SENTENCE).filter((s) => !mentionsProvider(s)).join(" ");
    })
    .join("")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  return kept || null;
}
