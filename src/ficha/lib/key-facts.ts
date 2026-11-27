/**
 * REQ-10815 · Ficha única, ola 7, bloque 5 «Datos clave» (plan §3): duración, horarios, idioma, temporada,
 * dificultad 1–5 (decisión 12), edades y, REQ-10898, hora de salida y mínimo de personas, sin casillas vacías: la fila sin dato no sale y nunca dice «N/D».
 * Etiquetas en los seis idiomas del sitio aquí mismo (las traducciones de la ficha vieja no las tienen en todos);
 * duración sin `Intl` (INC-001). Puro.
 */
import type { FichaKeyFacts, FichaLang } from "./model";
import { cardDuration } from "@/tours/lib/experience-card";
import { guideLanguageName } from "@/tours/lib/filters-copy";

export type KeyFactId = "duracion" | "horarios" | "idiomas" | "minimo" | "temporada" | "dificultad" | "edades";
export interface KeyFactRow { id: KeyFactId; label: string; value: string }

interface Copy { labels: Record<KeyFactId, string>; of: string; years: (a: number, b: number) => string; people: (n: number) => string }
const COPY: Record<FichaLang, Copy> = {
  es: { labels: { duracion: "Duración", horarios: "Hora de salida", idiomas: "Idioma del guía", minimo: "Mínimo de personas", temporada: "Temporada", dificultad: "Dificultad", edades: "Edad de niño" }, of: "de", years: (a, b) => `${a} a ${b} años`, people: (n) => `${n} ${n === 1 ? "persona" : "personas"}` },
  en: { labels: { duracion: "Duration", horarios: "Departure time", idiomas: "Guide language", minimo: "Minimum group", temporada: "Season", dificultad: "Difficulty", edades: "Child age" }, of: "of", years: (a, b) => `${a} to ${b} years`, people: (n) => `${n} ${n === 1 ? "person" : "people"}` },
  pt: { labels: { duracion: "Duração", horarios: "Hora de saída", idiomas: "Idioma do guia", minimo: "Mínimo de pessoas", temporada: "Temporada", dificultad: "Dificuldade", edades: "Idade de criança" }, of: "de", years: (a, b) => `${a} a ${b} anos`, people: (n) => `${n} ${n === 1 ? "pessoa" : "pessoas"}` },
  fr: { labels: { duracion: "Durée", horarios: "Heure de départ", idiomas: "Langue du guide", minimo: "Minimum de personnes", temporada: "Saison", dificultad: "Difficulté", edades: "Âge enfant" }, of: "sur", years: (a, b) => `${a} à ${b} ans`, people: (n) => `${n} ${n === 1 ? "personne" : "personnes"}` },
  de: { labels: { duracion: "Dauer", horarios: "Abfahrtszeit", idiomas: "Sprache des Guides", minimo: "Mindestteilnehmer", temporada: "Saison", dificultad: "Schwierigkeit", edades: "Kinderalter" }, of: "von", years: (a, b) => `${a} bis ${b} Jahre`, people: (n) => `${n} ${n === 1 ? "Person" : "Personen"}` },
  it: { labels: { duracion: "Durata", horarios: "Orario di partenza", idiomas: "Lingua della guida", minimo: "Minimo di persone", temporada: "Stagione", dificultad: "Difficoltà", edades: "Età bambino" }, of: "su", years: (a, b) => `${a}–${b} anni`, people: (n) => `${n} ${n === 1 ? "persona" : "persone"}` },
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
    minimo: f.minPax && f.minPax > 0 ? c.people(f.minPax) : null, // REQ-10898
    temporada: clean(f.season),
    dificultad: f.difficulty ? `${f.difficulty} ${c.of} 5` : null,
    edades: f.ages && f.ages.childTo >= f.ages.childFrom ? c.years(f.ages.childFrom, f.ages.childTo) : null,
  };
  return (Object.keys(values) as KeyFactId[]).flatMap((id) => (values[id] ? [{ id, label: c.labels[id], value: values[id] as string }] : []));
}
