import type { TripCopy } from "./copy";

/** Datos derivados para la ficha de un viaje. Puro. */

type DurationInput = { kind: string; durationDays: number | null; options: { name: string }[]; importantInfo?: string | null };

/** «Duración aproximada: 2 h.», «1h 30 min.», «3h30.», «Día completo (el programa indica 11 h 45 min).» */
const INFO_DURATION = /^\s*duraci[oó]n[^:\n]*:([^\n]*)$/im;
const HOURS = /(\d{1,2})\s*h(?:oras?|rs?)?(?:\s*(\d{1,2})(?:\s*min)?)?(?![a-z])/i;

// REQ-821: horas reales de un viaje de un día desde la línea «Duración…» del import (el esquema solo tiene durationDays).
// Solo menos de 24 h; sin número de horas («por confirmar», «12.») no se inventa nada.
export function infoDurationMinutes(info: string | null | undefined): number | null {
  const line = (info ?? "").match(INFO_DURATION)?.[1] ?? "";
  const m = line.match(HOURS);
  if (!m) return null;
  const total = Number(m[1]) * 60 + (m[2] ? Number(m[2]) : 0);
  return total > 0 && total < 24 * 60 && (!m[2] || Number(m[2]) < 60) ? total : null;
}
const hoursText = (min: number) => (min % 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min / 60} h`);

const VALIDITY = /(\d+)\s*(horas?|h\b|días?|dias?)/i;

// REQ-145: en transporte (boletos con vigencia), el encabezado muestra el rango de las opciones («24–48 h», «1–2 días»).
// REQ-145 REQ-821
export function durationLabel(trip: DurationInput, c: TripCopy): string | null {
  const fallback = trip.durationDays ? c.days(trip.durationDays) : null;
  if (trip.kind !== "transporte") {
    const min = trip.durationDays === null || trip.durationDays <= 1 ? infoDurationMinutes(trip.importantInfo) : null;
    return min ? hoursText(min) : fallback;
  }
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
