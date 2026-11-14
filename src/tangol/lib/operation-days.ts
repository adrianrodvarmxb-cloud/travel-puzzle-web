/**
 * REQ-10513: `OperationDays` de cada opción de `GetTourRates` llega como texto y Tangol no documenta su
 * formato. Se entienden los previsibles y lo demás queda en `null` (= «no se entendió», no restringe):
 *   - nombres o abreviaturas en español e inglés («Lunes, Miércoles y Viernes», «Mon,Tue»);
 *   - números 1-7 (1 = lunes … 7 = domingo) o 0 = domingo;
 *   - máscaras de 7 posiciones empezando en lunes: letras LMXJVSD (una por día, X = miércoles),
 *     S/N (sí/no) o 1/0;
 *   - «todos los días» / «daily».
 * Salida: días de la semana como `Date#getUTCDay` (0 = domingo … 6 = sábado), ordenados y sin repetir. Puro.
 */

const DIACRITICS = /[̀-ͯ]/g;
const plain = (s: string) => s.normalize("NFD").replace(DIACRITICS, "").toLowerCase().trim();

const NAMES: Record<string, number> = {
  domingo: 0, dom: 0, sunday: 0, sun: 0, su: 0,
  lunes: 1, lun: 1, monday: 1, mon: 1, mo: 1,
  martes: 2, mar: 2, tuesday: 2, tue: 2, tu: 2,
  miercoles: 3, mie: 3, mier: 3, wednesday: 3, wed: 3, we: 3,
  jueves: 4, jue: 4, thursday: 4, thu: 4, th: 4,
  viernes: 5, vie: 5, friday: 5, fri: 5, fr: 5,
  sabado: 6, sab: 6, saturday: 6, sat: 6, sa: 6,
};
const EVERY_DAY = /^(todos los dias|todos|diario|diaria|diariamente|daily|every ?day|all days)$/;
/** Máscara de 7 posiciones empezando en lunes: S/N, 1/0 o Y/N (las letras de los días las cubre «lmxjvsd»). */
const MASK_YES_NO = /^[sn]{7}$|^[01]{7}$|^[yn]{7}$/;
const ALL: readonly number[] = [0, 1, 2, 3, 4, 5, 6];

// REQ-10513
export function parseOperationDays(raw: string | null | undefined): number[] | null {
  const text = plain(raw ?? "");
  if (!text) return null;
  if (EVERY_DAY.test(text)) return [...ALL];

  // Máscara: la posición dice el día (lunes primero); la letra dice si opera.
  const compact = text.replace(/[\s,.;/|-]/g, "");
  if (MASK_YES_NO.test(compact)) {
    const days = [...compact].flatMap((c, i) => (c === "s" || c === "1" || c === "y" ? [(i + 1) % 7] : []));
    return days.length ? days.sort() : null;
  }
  if (compact === "lmxjvsd") return [...ALL];

  const days = new Set<number>();
  let understood = 0;
  for (const token of text.split(/[\s,.;/|&+-]+|\by\b|\band\b|\be\b/)) {
    const t = token.trim();
    if (!t) continue;
    if (/^[0-7]$/.test(t)) {
      days.add(Number(t) % 7);
      understood++;
    } else if (NAMES[t] !== undefined) {
      days.add(NAMES[t]);
      understood++;
    } else if (/^[lmxjvsd]+$/.test(t) && t.length > 1 && t.length <= 7 && new Set(t).size === t.length) {
      // Letras pegadas sin repetir («LMV» = lunes, miércoles, viernes).
      const LETTER: Record<string, number> = { l: 1, m: 2, x: 3, j: 4, v: 5, s: 6, d: 0 };
      for (const c of t) days.add(LETTER[c]);
      understood++;
    } else {
      return null; // algo que no se entiende: mejor no restringir que restringir mal
    }
  }
  return understood > 0 && days.size > 0 ? [...days].sort() : null;
}

/** Día de la semana (0 = domingo … 6 = sábado) de una fecha AAAA-MM-DD, o null si no es fecha. */
// REQ-10513
export function weekdayOf(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const d = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d.getUTCDay();
}
