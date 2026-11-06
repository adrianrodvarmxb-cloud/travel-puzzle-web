import type { TripCopy } from "./copy";

/** Datos derivados para la ficha de un viaje. Puro. */

type DurationInput = { kind: string; durationDays: number | null; options: { name: string }[] };

const VALIDITY = /(\d+)\s*(horas?|h\b|días?|dias?)/i;

// REQ-145: en transporte (boletos con vigencia), el encabezado muestra el rango de las opciones («24–48 h», «1–2 días»).
export function durationLabel(trip: DurationInput, c: TripCopy): string | null {
  const fallback = trip.durationDays ? c.days(trip.durationDays) : null;
  if (trip.kind !== "transporte") return fallback;
  const parsed = trip.options.map((o) => o.name.match(VALIDITY)).filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({ n: Number(m[1]), hours: /^h/i.test(m[2]) }));
  if (parsed.length === 0) return fallback;
  const allHours = parsed.every((p) => p.hours);
  const values = parsed.map((p) => (allHours ? p.n : p.hours ? p.n / 24 : p.n));
  if (!allHours && values.some((v) => !Number.isInteger(v))) return fallback;
  const min = Math.min(...values), max = Math.max(...values);
  if (min === max) return allHours ? (min % 24 === 0 ? c.days(min / 24) : `${min} h`) : c.days(min);
  return allHours ? `${min}–${max} h` : `${min}–${c.days(max)}`;
}

type LangInput = { kind: string; titleEs: string };

// REQ-146: el bus hop-on hop-off no lleva guía, lleva audioguía.
export function isAudioGuided(trip: LangInput): boolean {
  return trip.kind === "transporte" && /hop-?on\s+hop-?off/i.test(trip.titleEs);
}

// REQ-146
export function languagesLabel(trip: LangInput, c: TripCopy): string {
  return isAudioGuided(trip) ? c.audioGuide : c.languages;
}
