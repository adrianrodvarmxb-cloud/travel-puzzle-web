/**
 * T6b: facetas de circuitos en la ficha de un viaje propio, tras TAXONOMY_CIRCUITS_ENABLED (apagada). Puro.
 * - REQ-421: tipo de grupo (en grupo · privado · a la medida) desde las opciones y el kind.
 * - REQ-422: dificultad 1–5 con su nombre y su línea (G-T8 = A desde los 3 valores de hoy); sin dato, nada.
 * - REQ-423: rango de días 1–5 · 6–9 · 10–14 · 15+; sin dato, nada.
 * - REQ-424: confort, tipo de guía, perfil y altitud quedan tras TAXONOMY_CIRCUIT_EXTRA_ENABLED (hoy sin dato: nada).
 * REQ-1520 (firma REQ-1519, 11-11): la dificultad sale SOLO de `difficultyLevel` (columna de la 0018, nivel revisado en el lote
 * REQ-1518). `difficulty` (facil · moderada · exigente) ya no se convierte. Sin nivel, o en un traslado, no se muestra.
 */
import type { Dictionary, TerminoFacetaCircuito } from "../schemas/dictionary";
import { dificultad, rangoDias, tipoGrupo } from "./circuits";

export function taxonomyCircuitsEnabled(env: { TAXONOMY_CIRCUITS_ENABLED?: string }): boolean {
  return env.TAXONOMY_CIRCUITS_ENABLED === "true";
}

export interface CircuitInput { kind: string; difficulty?: string | null; difficultyLevel?: number | null; durationDays?: number | null; options?: { mode?: string }[] }
export interface CircuitFacts { dificultad: string | null; grupo: string | null; dias: string | null }

const faceta = (d: Dictionary, slug: string) => d.terminos.find((t): t is TerminoFacetaCircuito => t.eje === "faceta-circuito" && t.slug === slug);

export function circuitFacts(trip: CircuitInput, dict: Dictionary, lang: string): CircuitFacts {
  const es = lang === "es";
  const nivelRevisado = trip.kind === "transporte" ? null : trip.difficultyLevel ?? null; // REQ-1520
  const dif = dificultad(nivelRevisado, dict);
  const nivel = dif ? faceta(dict, "circuito-dificultad")?.niveles?.find((n) => n.nivel === dif.nivel) : undefined;
  const multi = trip.kind === "circuito" || trip.kind === "personalizado" || (trip.durationDays ?? 0) >= 2;
  const modos = (trip.options ?? []).map((o) => (o.mode === "private" ? "private" : "group")) as ("group" | "private")[];
  const grupos = multi ? tipoGrupo({ kind: trip.kind, modos }) : [];
  const valores = faceta(dict, "circuito-grupo")?.valores ?? [];
  const rango = multi ? rangoDias(trip.durationDays ?? null, dict) : null;
  const rangoTerm = rango ? faceta(dict, "dur-dias")?.valores?.find((v) => v.slug === rango) : undefined;
  return {
    dificultad: dif && nivel ? (es ? `Dificultad ${dif.nivel} de 5 · ${nivel.termino_es}: ${nivel.definicion_es}` : `Difficulty ${dif.nivel}/5 · ${nivel.termino_en}`) : null,
    grupo: grupos.length ? `${es ? "Tipo de grupo" : "Group type"}: ${grupos.map((g) => { const v = valores.find((x) => x.slug === g); return v ? (es ? v.termino_es : v.termino_en) : g; }).join(" · ")}` : null,
    dias: rangoTerm ? (es ? rangoTerm.termino_es : rangoTerm.termino_en) : null,
  };
}
