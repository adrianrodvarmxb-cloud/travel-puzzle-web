/**
 * REQ-10815 · Ficha única, ola 7, bloque 5 «Datos clave» (plan §3): duración, horarios, idioma, temporada,
 * dificultad 1–5 (decisión 12) y edades, sin casillas vacías: la fila sin dato no sale y nunca dice «N/D».
 * Etiquetas en los seis idiomas del sitio aquí mismo (las traducciones de la ficha vieja no las tienen en todos);
 * duración sin `Intl` (INC-001). Puro.
 */
import type { FichaKeyFacts, FichaLang } from "./model";
import { cardDuration } from "@/tours/lib/experience-card";
import { guideLanguageName } from "@/tours/lib/filters-copy";

export type KeyFactId = "duracion" | "horarios" | "idiomas" | "temporada" | "dificultad" | "edades";
export interface KeyFactRow { id: KeyFactId; label: string; value: string }

interface Copy { labels: Record<KeyFactId, string>; of: string; years: (a: number, b: number) => string }
const COPY: Record<FichaLang, Copy> = {
  es: { labels: { duracion: "Duración", horarios: "Horarios", idiomas: "Idioma del guía", temporada: "Temporada", dificultad: "Dificultad", edades: "Edad de niño" }, of: "de", years: (a, b) => `${a} a ${b} años` },
  en: { labels: { duracion: "Duration", horarios: "Times", idiomas: "Guide language", temporada: "Season", dificultad: "Difficulty", edades: "Child age" }, of: "of", years: (a, b) => `${a} to ${b} years` },
  pt: { labels: { duracion: "Duração", horarios: "Horários", idiomas: "Idioma do guia", temporada: "Temporada", dificultad: "Dificuldade", edades: "Idade de criança" }, of: "de", years: (a, b) => `${a} a ${b} anos` },
  fr: { labels: { duracion: "Durée", horarios: "Horaires", idiomas: "Langue du guide", temporada: "Saison", dificultad: "Difficulté", edades: "Âge enfant" }, of: "sur", years: (a, b) => `${a} à ${b} ans` },
  de: { labels: { duracion: "Dauer", horarios: "Uhrzeiten", idiomas: "Sprache des Guides", temporada: "Saison", dificultad: "Schwierigkeit", edades: "Kinderalter" }, of: "von", years: (a, b) => `${a} bis ${b} Jahre` },
  it: { labels: { duracion: "Durata", horarios: "Orari", idiomas: "Lingua della guida", temporada: "Stagione", dificultad: "Difficoltà", edades: "Età bambino" }, of: "su", years: (a, b) => `${a}–${b} anni` },
};

const clean = (s: string | null | undefined) => (s ?? "").trim() || null;

// REQ-10815
export function keyFactsRows(f: FichaKeyFacts, lang: FichaLang): KeyFactRow[] {
  const c = COPY[lang] ?? COPY.es;
  const langs = [...new Set(f.languages.map((l) => l.trim().toLowerCase()).filter(Boolean))].map((l) => guideLanguageName(l, lang));
  const values: Record<KeyFactId, string | null> = {
    // REQ-10870: el texto del proveedor manda (es el mismo que lleva el marcado); si no, de los minutos.
    duracion: clean(f.durationText) ?? (f.durationMinutes ? cardDuration({ minutes: f.durationMinutes }, lang) : null),
    horarios: clean(f.schedule),
    idiomas: langs.length ? langs.join(", ") : null,
    temporada: clean(f.season),
    dificultad: f.difficulty ? `${f.difficulty} ${c.of} 5` : null,
    edades: f.ages && f.ages.childTo >= f.ages.childFrom ? c.years(f.ages.childFrom, f.ages.childTo) : null,
  };
  return (Object.keys(values) as KeyFactId[]).flatMap((id) => (values[id] ? [{ id, label: c.labels[id], value: values[id] as string }] : []));
}
