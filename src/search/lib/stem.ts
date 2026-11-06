/**
 * REQ-360: stemmer Snowball para español (algoritmo de M. Porter, snowballstem.org, licencia BSD), en TypeScript puro
 * y sin dependencias: corre igual en Node, en el navegador y en Workers. Se verifica contra la implementación de
 * referencia (src/search/data/stem-es-snowball.json, generado con el paquete oficial `snowballstemmer`).
 * Versionado: cambiar esta función obliga a reconstruir el índice (`STEM_VERSION` va en la columna y en la caché).
 */

export const STEM_VERSION = 1;

const VOWELS = new Set([..."aeiouáéíóúü"]);
const isV = (c: string | undefined) => !!c && VOWELS.has(c);

interface Regions { rv: number; r1: number; r2: number }

function regions(w: string[]): Regions {
  const n = w.length;
  let r1 = n, r2 = n, rv = n;
  for (let i = 1; i < n; i++) if (isV(w[i - 1]) && !isV(w[i])) { r1 = i + 1; break; }
  for (let i = r1 + 1; i < n; i++) if (isV(w[i - 1]) && !isV(w[i])) { r2 = i + 1; break; }
  if (n >= 2) {
    if (!isV(w[1])) { for (let j = 2; j < n; j++) if (isV(w[j])) { rv = j + 1; break; } }
    else if (isV(w[0])) { for (let j = 2; j < n; j++) if (!isV(w[j])) { rv = j + 1; break; } }
    else rv = Math.min(3, n);
  }
  return { rv, r1, r2 };
}

const byLength = (xs: string[]) => [...xs].sort((a, b) => [...b].length - [...a].length);
const ends = (w: string, s: string) => w.endsWith(s);
const at = (w: string, s: string) => [...w].length - [...s].length; // posición (en letras) donde empieza el sufijo

/** Sufijo más largo de la lista con el que termina la palabra (y que empieza en `min` o después). */
function longest(w: string, list: string[], min = 0): string | null {
  for (const s of list) if (ends(w, s) && at(w, s) >= min) return s;
  return null;
}
const cut = (w: string, s: string) => w.slice(0, w.length - s.length);

const PRONOUNS = byLength(["me", "se", "sela", "selo", "selas", "selos", "la", "le", "lo", "las", "les", "los", "nos"]);
const PRONOUN_VERB: [string, string][] = [["iéndo", "iendo"], ["ándo", "ando"], ["ár", "ar"], ["ér", "er"], ["ír", "ir"], ["ando", "ando"], ["iendo", "iendo"], ["ar", "ar"], ["er", "er"], ["ir", "ir"], ["yendo", "yendo"]];
const PRONOUN_VERB_SORTED = [...PRONOUN_VERB].sort((a, b) => [...b[0]].length - [...a[0]].length);

type Rule = { suffixes: string[]; apply: (w: string, s: string, r: Regions) => string | null };
const R2 = (w: string, s: string, r: Regions) => at(w, s) >= r.r2;
const R1 = (w: string, s: string, r: Regions) => at(w, s) >= r.r1;
const RV = (w: string, s: string, r: Regions) => at(w, s) >= r.rv;

const STANDARD: Rule[] = [
  { suffixes: ["anza", "anzas", "ico", "ica", "icos", "icas", "ismo", "ismos", "able", "ables", "ible", "ibles", "ista", "istas", "oso", "osa", "osos", "osas", "amiento", "amientos", "imiento", "imientos"],
    apply: (w, s, r) => (R2(w, s, r) ? cut(w, s) : null) },
  { suffixes: ["adora", "ador", "ación", "adoras", "adores", "aciones", "ante", "antes", "ancia", "ancias"],
    apply: (w, s, r) => { if (!R2(w, s, r)) return null; let x = cut(w, s); if (ends(x, "ic") && R2(x, "ic", r)) x = cut(x, "ic"); return x; } },
  { suffixes: ["logía", "logías"], apply: (w, s, r) => (R2(w, s, r) ? cut(w, s) + "log" : null) },
  { suffixes: ["ución", "uciones"], apply: (w, s, r) => (R2(w, s, r) ? cut(w, s) + "u" : null) },
  { suffixes: ["encia", "encias"], apply: (w, s, r) => (R2(w, s, r) ? cut(w, s) + "ente" : null) },
  { suffixes: ["amente"], apply: (w, s, r) => {
      if (!R1(w, s, r)) return null;
      let x = cut(w, s);
      const t = longest(x, ["iv", "os", "ic", "ad"]);
      if (t && R2(x, t, r)) { x = cut(x, t); if (t === "iv" && ends(x, "at") && R2(x, "at", r)) x = cut(x, "at"); }
      return x;
    } },
  { suffixes: ["mente"], apply: (w, s, r) => {
      if (!R2(w, s, r)) return null;
      let x = cut(w, s);
      const t = longest(x, ["ante", "able", "ible"]);
      if (t && R2(x, t, r)) x = cut(x, t);
      return x;
    } },
  { suffixes: ["idad", "idades"], apply: (w, s, r) => {
      if (!R2(w, s, r)) return null;
      let x = cut(w, s);
      const t = longest(x, ["abil", "ic", "iv"]);
      if (t && R2(x, t, r)) x = cut(x, t);
      return x;
    } },
  { suffixes: ["iva", "ivo", "ivas", "ivos"], apply: (w, s, r) => {
      if (!R2(w, s, r)) return null;
      let x = cut(w, s);
      if (ends(x, "at") && R2(x, "at", r)) x = cut(x, "at");
      return x;
    } },
];
const STANDARD_SUFFIXES = byLength(STANDARD.flatMap((r) => r.suffixes));
const STANDARD_RULE = new Map(STANDARD.flatMap((r) => r.suffixes.map((s) => [s, r] as const)));

const Y_VERB = byLength(["ya", "ye", "yan", "yen", "yeron", "yendo", "yo", "yó", "yas", "yes", "yais", "yamos"]);
const VERB_GU = ["en", "es", "éis", "emos"];
const VERB_PLAIN = [
  "arían", "arías", "arán", "arás", "aríais", "aría", "aréis", "aríamos", "aremos", "ará", "aré",
  "erían", "erías", "erán", "erás", "eríais", "ería", "eréis", "eríamos", "eremos", "erá", "eré",
  "irían", "irías", "irán", "irás", "iríais", "iría", "iréis", "iríamos", "iremos", "irá", "iré",
  "aba", "ada", "ida", "ía", "ara", "iera", "ad", "ed", "id", "ase", "iese", "aste", "iste", "an", "aban", "ían", "aran", "ieran",
  "asen", "iesen", "aron", "ieron", "ado", "ido", "ando", "iendo", "ió", "ar", "er", "ir", "as", "abas", "adas", "idas", "ías",
  "aras", "ieras", "ases", "ieses", "ís", "áis", "abais", "íais", "arais", "ierais", "aseis", "ieseis", "asteis", "isteis",
  "ados", "idos", "amos", "ábamos", "íamos", "imos", "áramos", "iéramos", "iésemos", "ásemos",
];
const VERB = byLength([...VERB_GU, ...VERB_PLAIN]);
const VERB_GU_SET = new Set(VERB_GU);
const RESIDUAL = byLength(["os", "a", "o", "á", "í", "ó", "e", "é"]);
const ACCENTS: Record<string, string> = { á: "a", é: "e", í: "i", ó: "o", ú: "u" };

/** Raíz de una palabra en minúsculas (con o sin acentos). Palabras de menos de 3 letras quedan igual. */
// REQ-360
export function stemEs(word: string): string {
  let w = (word ?? "").toLowerCase();
  if ([...w].length < 3) return w.replace(/[áéíóú]/g, (c) => ACCENTS[c]);
  const r = regions([...w]);

  // paso 0: pronombre pegado (comiéndoselo → comiendo)
  const p = longest(w, PRONOUNS);
  if (p) {
    const base = cut(w, p);
    const v = PRONOUN_VERB_SORTED.find(([s]) => ends(base, s));
    if (v && at(base, v[0]) >= r.rv) {
      if (v[0] === "yendo") { if (ends(cut(base, "yendo"), "u")) w = base; }
      else w = cut(base, v[0]) + v[1];
    }
  }

  // paso 1, si no 2a, si no 2b
  let done = false;
  const s1 = longest(w, STANDARD_SUFFIXES);
  if (s1) { const x = STANDARD_RULE.get(s1)!.apply(w, s1, r); if (x !== null) { w = x; done = true; } }
  if (!done) {
    const y = longest(w, Y_VERB, r.rv);
    if (y && ends(cut(w, y), "u")) { w = cut(w, y); done = true; }
  }
  if (!done) {
    const v = longest(w, VERB, r.rv);
    if (v) {
      w = cut(w, v);
      if (VERB_GU_SET.has(v) && ends(w, "gu")) w = cut(w, "u");
    }
  }

  // paso 3: residuo
  const s3 = longest(w, RESIDUAL);
  if (s3 && RV(w, s3, r)) {
    w = cut(w, s3);
    if ((s3 === "e" || s3 === "é") && ends(w, "gu") && at(w, "u") >= r.rv) w = cut(w, "u");
  }
  return w.replace(/[áéíóú]/g, (c) => ACCENTS[c]);
}
