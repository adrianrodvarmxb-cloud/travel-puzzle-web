/**
 * Código automático del viaje (gate H): AGENCIA-REGIÓN-TIPO+DÍAS-NÚM, p. ej. TP-MX-E01-007 (transporte = M, movilidad).
 * Se congela al publicar. Siglas de agencia sugeridas a partir del nombre. Puro.
 */
import { regionOf } from "./geo";
import type { TripKind } from "./trip";

export const TP_INITIALS = "TP";
const KIND_LETTER: Record<TripKind, string> = { tour: "T", circuito: "C", unica: "E", personalizado: "P", transporte: "M" };
const STOP = new Set(["de", "del", "la", "las", "el", "los", "y", "e", "en", "the", "and", "of", "sa", "cv", "s", "a"]);

const clean = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9 ]/g, " ");

/** "Europa Mundo Viajes" → "EMV"; "Andina" → "AND". Nunca TP ni una ya usada (agrega número). */
export function suggestInitials(name: string, taken: string[]): string {
  const words = clean(name).split(/\s+/).filter((w) => w && !STOP.has(w.toLowerCase()));
  let base = words.length >= 2 ? words.slice(0, 3).map((w) => w[0]).join("") : (words[0] ?? "AG").slice(0, 3);
  if (base.length < 2) base = (base + "X").slice(0, 2);
  const used = new Set([TP_INITIALS, ...taken.map((t) => t.toUpperCase())]);
  if (!used.has(base)) return base;
  for (let n = 2; n < 100; n++) if (!used.has(`${base}${n}`)) return `${base}${n}`;
  return `${base}${Date.now() % 1000}`;
}

export const INITIALS_RE = /^[A-Z][A-Z0-9]{1,4}$/;

export function tripCode(t: { initials: string; countries: string[]; kind: TripKind; durationDays: number | null; seq: number }): string {
  const days = String(Math.min(Math.max(t.durationDays ?? 0, 0), 99)).padStart(2, "0");
  return `${t.initials}-${regionOf(t.countries)}-${KIND_LETTER[t.kind]}${days}-${String(t.seq).padStart(3, "0")}`;
}
