/** REQ-056: textos de los filtros estilo Civitatis en 6 idiomas. Puro. */
const C = {
  es: { title: "Filtros", type: "Tipo de actividad", features: "Características", freeCancel: "Cancelación gratuita", private: "Servicio privado", pickup: "Recogida en el hotel", novelty: "Novedad", language: "Idioma del guía", anyLanguage: "Cualquier idioma", date: "Fecha", anyDate: "Cualquier fecha", duration: "Duración", clear: "Quitar filtros", see: (n: number) => `Ver ${n.toLocaleString("es-MX")} experiencias` /* REQ-3509 */, back: "Volver" },
  en: { title: "Filters", type: "Activity type", features: "Features", freeCancel: "Free cancellation", private: "Private service", pickup: "Hotel pickup", novelty: "New", language: "Guide language", anyLanguage: "Any language", date: "Date", anyDate: "Any date", duration: "Duration", clear: "Clear filters", see: (n: number) => `See ${n.toLocaleString("en-US")} experiences`, back: "Back" },
  pt: { title: "Filtros", type: "Tipo de atividade", features: "Características", freeCancel: "Cancelamento gratuito", private: "Serviço privado", pickup: "Busca no hotel", novelty: "Novidade", language: "Idioma do guia", anyLanguage: "Qualquer idioma", date: "Data", anyDate: "Qualquer data", duration: "Duração", clear: "Limpar filtros", see: (n: number) => `Ver ${n.toLocaleString("pt-BR")} experiências`, back: "Voltar" },
  de: { title: "Filter", type: "Aktivitätstyp", features: "Merkmale", freeCancel: "Kostenlose Stornierung", private: "Privater Service", pickup: "Abholung vom Hotel", novelty: "Neu", language: "Sprache des Guides", anyLanguage: "Jede Sprache", date: "Datum", anyDate: "Jedes Datum", duration: "Dauer", clear: "Filter entfernen", see: (n: number) => `${n.toLocaleString("de-DE")} Erlebnisse ansehen`, back: "Zurück" },
  fr: { title: "Filtres", type: "Type d'activité", features: "Caractéristiques", freeCancel: "Annulation gratuite", private: "Service privé", pickup: "Prise en charge à l'hôtel", novelty: "Nouveauté", language: "Langue du guide", anyLanguage: "Toutes les langues", date: "Date", anyDate: "Toutes les dates", duration: "Durée", clear: "Effacer les filtres", see: (n: number) => `Voir ${n.toLocaleString("fr-FR")} expériences`, back: "Retour" },
  it: { title: "Filtri", type: "Tipo di attività", features: "Caratteristiche", freeCancel: "Cancellazione gratuita", private: "Servizio privato", pickup: "Prelievo in hotel", novelty: "Novità", language: "Lingua della guida", anyLanguage: "Qualsiasi lingua", date: "Data", anyDate: "Qualsiasi data", duration: "Durata", clear: "Rimuovi filtri", see: (n: number) => `Vedi ${n.toLocaleString("it-IT")} esperienze`, back: "Indietro" },
};
export type FiltersCopy = (typeof C)["es"];
export const filtersCopy = (lang: string): FiltersCopy => C[(lang in C ? lang : "en") as keyof typeof C];

/** Nombre del idioma del guía en el idioma del sitio (sin Intl en el cliente, INC-001). */
const LANG_NAMES: Record<string, Record<string, string>> = {
  es: { es: "Español", en: "Inglés", fr: "Francés", de: "Alemán", it: "Italiano", pt: "Portugués", ru: "Ruso", zh: "Chino", ja: "Japonés", ko: "Coreano", nl: "Neerlandés", pl: "Polaco" },
  en: { es: "Spanish", en: "English", fr: "French", de: "German", it: "Italian", pt: "Portuguese", ru: "Russian", zh: "Chinese", ja: "Japanese", ko: "Korean", nl: "Dutch", pl: "Polish" },
  pt: { es: "Espanhol", en: "Inglês", fr: "Francês", de: "Alemão", it: "Italiano", pt: "Português", ru: "Russo", zh: "Chinês", ja: "Japonês", ko: "Coreano", nl: "Holandês", pl: "Polonês" },
  de: { es: "Spanisch", en: "Englisch", fr: "Französisch", de: "Deutsch", it: "Italienisch", pt: "Portugiesisch", ru: "Russisch", zh: "Chinesisch", ja: "Japanisch", ko: "Koreanisch", nl: "Niederländisch", pl: "Polnisch" },
  fr: { es: "Espagnol", en: "Anglais", fr: "Français", de: "Allemand", it: "Italien", pt: "Portugais", ru: "Russe", zh: "Chinois", ja: "Japonais", ko: "Coréen", nl: "Néerlandais", pl: "Polonais" },
  it: { es: "Spagnolo", en: "Inglese", fr: "Francese", de: "Tedesco", it: "Italiano", pt: "Portoghese", ru: "Russo", zh: "Cinese", ja: "Giapponese", ko: "Coreano", nl: "Olandese", pl: "Polacco" },
};
export const guideLanguageName = (code: string, lang: string) => (LANG_NAMES[lang] ?? LANG_NAMES.en)[code] ?? code;

/** Paradas del deslizador de duración (minutos), como Civitatis: de 0 h a varios días. */
export const DURATION_STOPS = [0, 60, 120, 240, 480, 1440, 2880, 4320, 10080, 44640] as const;
export function durationStopLabel(min: number, lang: string): string {
  if (min === 0) return "0 h";
  if (min < 1440) return `${min / 60} h`;
  const d = min / 1440;
  return `${d} ${lang === "en" ? (d === 1 ? "day" : "days") : lang === "de" ? (d === 1 ? "Tag" : "Tage") : lang === "fr" ? "j" : lang === "it" ? (d === 1 ? "giorno" : "giorni") : d === 1 ? "día" : "días"}`;
}
