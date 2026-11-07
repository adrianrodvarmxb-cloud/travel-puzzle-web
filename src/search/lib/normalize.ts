/**
 * REQ-280: normalización del buscador tolerante. Puro.
 * NFKD + quitar marcas + minúsculas (nunca toLocale* ni Intl: regla INC-001). Las letras que NFKD no descompone
 * (ß, ø, ł, æ, œ…) se pliegan con una tabla fija. CJK y cirílico se conservan: la transliteración va en la ingesta (S5).
 */

const SPECIAL: Record<string, string> = { "ß": "ss", "ø": "o", "ł": "l", "đ": "d", "æ": "ae", "œ": "oe", "ı": "i", "þ": "th", "ð": "d", "ħ": "h" };
const SPECIAL_RE = /[ßøłđæœıþðħ]/g;

/** Texto → minúsculas sin marcas, con un espacio entre palabras (solo letras y números de cualquier alfabeto). */
// REQ-280
export function fold(text: string | undefined | null): string {
  return (text ?? "")
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(SPECIAL_RE, (c) => SPECIAL[c])
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Texto → palabras plegadas. */
// REQ-280
export const foldTokens = (text: string | undefined | null): string[] => {
  const f = fold(text);
  return f ? f.split(" ") : [];
};
