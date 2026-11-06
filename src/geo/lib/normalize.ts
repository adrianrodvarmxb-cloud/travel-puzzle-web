/**
 * Normalización determinista de topónimos para el cruce v2 (informe «Identidad geográfica del catálogo», paso 2). Puro.
 * Primero se normaliza (NFKD sin acentos, sin calificadores ni sufijos de estado) y solo después se usa fuzzy.
 */

const SPECIAL: Record<string, string> = { ß: "ss", æ: "ae", œ: "oe", ø: "o", ł: "l", đ: "d", ð: "d", þ: "th", ı: "i", ŀ: "l", ħ: "h" };

/**
 * REQ-122: nombre → tokens en minúsculas sin acentos ni puntuación; sin «(XX)», sin «, Estado» ni « - País».
 * Con `keepQualifiers` (nombres de GeoNames) el calificador se queda: «Zürich (Kreis 1)» no es «Zürich».
 */
export function normalizeName(text: string, opts: { keepQualifiers?: boolean } = {}): string {
  let s = text ?? "";
  if (!opts.keepQualifiers) s = s.replace(/\([^)]*\)/g, " ").replace(/\s+[-–—]\s+.*$/, "").replace(/,.*$/, "");
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ßæœøłđðþıŀħ]/g, (c) => SPECIAL[c] ?? c)
    .replace(/['’`´]s\b/g, "")
    .replace(/['’`´]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const SAINT = /^(st|saint|sankt|san|santo|santa|sao|ste|sainte|sv|sveti)\s+/;
const PREFIXES = /^(ciudad de|city of|isla de|isla|island of|isola di|ile de|old town of|centro de)\s+/;
const SUFFIXES = /\s+(city|ciudad|old town|town|island|isla|stadt)$/;

export interface NameKeys {
  exact: string;
  variants: string[];
}

/** REQ-122: llave exacta + variantes (San/St./Saint/Sankt unificados; sin prefijos «Isla de», «Ciudad de»; sin sufijos «City», «Old Town»). */
export function nameKeys(text: string, opts: { keepQualifiers?: boolean } = {}): NameKeys {
  const exact = normalizeName(text, opts);
  const out = new Set<string>();
  const add = (s: string) => {
    const t = s.trim();
    if (t && t !== exact) out.add(t);
  };
  if (opts.keepQualifiers) add(normalizeName(text));
  const saint = exact.replace(SAINT, "saint ");
  add(saint);
  for (const base of [exact, saint]) {
    const noPrefix = base.replace(PREFIXES, "");
    const noSuffix = base.replace(SUFFIXES, "");
    add(noPrefix);
    add(noSuffix);
    add(noPrefix.replace(SUFFIXES, ""));
  }
  return { exact, variants: [...out] };
}

/** REQ-122: similitud Jaro-Winkler (0 a 1). */
export function jaroWinkler(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const range = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const am = new Array<boolean>(a.length).fill(false);
  const bm = new Array<boolean>(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = Math.max(0, i - range); j < Math.min(b.length, i + range + 1); j++) {
      if (bm[j] || a[i] !== b[j]) continue;
      am[i] = bm[j] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;
  let t = 0;
  for (let i = 0, k = 0; i < a.length; i++) {
    if (!am[i]) continue;
    while (!bm[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  const jaro = (matches / a.length + matches / b.length + (matches - t / 2) / matches) / 3;
  let prefix = 0;
  while (prefix < 4 && a[prefix] === b[prefix]) prefix++;
  return jaro + prefix * 0.1 * (1 - jaro);
}
