/**
 * Slugs puros para las URLs de destinos y tours (Ola 3, «La Primera Pieza»).
 * Formato: minúsculas, sin acentos, solo [a-z0-9-], sin guiones repetidos ni en los extremos.
 * El chino se pasa a pinyin sin tonos. Sin I/O.
 */
import { pinyin } from "pinyin-pro";

export const TOUR_SLUG_MAX = 60;
export const CITY_SLUG_MAX = 60;

/** Letras que la normalización NFKD no separa de su acento. */
const SPECIAL: Record<string, string> = {
  ß: "ss", æ: "ae", œ: "oe", ø: "o", ł: "l", đ: "d", ð: "d", þ: "th", ı: "i", ŀ: "l", ħ: "h",
};

const HAN_RUN = /[㐀-䶿一-鿿豈-﫿]+/g;
/** Hasta 3 caracteres se leen como una palabra (北京 → beijing, 张家界 → zhangjiajie). Más largos van por sílaba. */
const HAN_WORD_MAX = 3;

/** REQ-086: chino a pinyin sin tonos. */
function hanToPinyin(text: string): string {
  return text.replace(HAN_RUN, (run) => {
    const syllables = pinyin(run, { toneType: "none", type: "array" }); // «lü» pierde la diéresis con NFKD
    return ` ${run.length <= HAN_WORD_MAX ? syllables.join("") : syllables.join(" ")} `;
  });
}

/** REQ-086: texto → slug sin límite de largo. */
export function slugify(text: string): string {
  const latin = hanToPinyin(text ?? "")
    .toLowerCase()
    .replace(/&/g, " y ")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ßæœøłđðþıŀħ]/g, (c) => SPECIAL[c] ?? c);
  return latin
    .replace(/['’`´]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** REQ-086: recorta a `max` sin cortar una palabra a la mitad, si se puede. */
export function trimSlug(slug: string, max: number): string {
  if (slug.length <= max) return slug;
  const cut = slug.slice(0, max + 1);
  const lastHyphen = cut.lastIndexOf("-");
  const trimmed = lastHyphen > 0 ? cut.slice(0, lastHyphen) : slug.slice(0, max);
  return trimmed.replace(/-+$/g, "");
}

/** REQ-086: slug de un tour a partir de su título (≤ 60 caracteres). Vacío si el título no tiene letras latinas ni chino. */
export function tourSlug(title: string, max = TOUR_SLUG_MAX): string {
  return trimSlug(slugify(title), max);
}

/** REQ-086: si `base` ya está tomado, agrega un sufijo corto (-2, -3, …) sin pasar de `max`. */
export function uniqueSlug(base: string, taken: ReadonlySet<string>, max = TOUR_SLUG_MAX): string {
  const first = trimSlug(base, max);
  if (!taken.has(first)) return first;
  for (let n = 2; ; n++) {
    const suffix = `-${n}`;
    const candidate = `${trimSlug(base, max - suffix.length)}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** Huella corta y estable (FNV-1a, base 36) para el slug de reserva cuando el título no da letras. */
export function shortHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).padStart(7, "0").slice(0, 7);
}

/**
 * REQ-085/086: slug de reserva cuando el título no da letras (p. ej. solo griego o cirílico).
 * Se calcula con el id interno (tour_uid), nunca con el id del proveedor.
 */
export function fallbackTourSlug(tourUid: string): string {
  return `tour-${shortHash(tourUid)}`;
}
