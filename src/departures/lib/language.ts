/**
 * REQ-114: Freetour manda el idioma de cada salida con su nombre completo en inglés ("Spanish", "German"…).
 * Antes se tomaban las 2 primeras letras ("sp", "ge") y los filtros de español, alemán, portugués, etc. salían vacíos.
 * Puro: nombre (inglés o nativo) o código → ISO 639-1; lo desconocido regresa null (no se inventa).
 */
const NAMES: Record<string, string> = {
  english: "en", spanish: "es", "español": "es", espanol: "es", castellano: "es", french: "fr", "français": "fr", francais: "fr",
  german: "de", deutsch: "de", italian: "it", italiano: "it", portuguese: "pt", "português": "pt", portugues: "pt",
  russian: "ru", "русский": "ru", chinese: "zh", mandarin: "zh", "中文": "zh", japanese: "ja", "日本語": "ja", korean: "ko", "한국어": "ko",
  dutch: "nl", nederlands: "nl", polish: "pl", polski: "pl", catalan: "ca", "català": "ca", greek: "el", turkish: "tr", czech: "cs",
  hungarian: "hu", swedish: "sv", norwegian: "no", danish: "da", finnish: "fi", hebrew: "he", arabic: "ar", ukrainian: "uk",
  romanian: "ro", croatian: "hr", serbian: "sr", bulgarian: "bg", slovak: "sk", slovenian: "sl", lithuanian: "lt", latvian: "lv",
  estonian: "et", basque: "eu", galician: "gl", hindi: "hi", thai: "th", vietnamese: "vi", indonesian: "id",
};
const ISO = new Set(Object.values(NAMES));

// REQ-114
export function languageCode(raw: string): string | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v) return null;
  if (NAMES[v]) return NAMES[v];
  const base = v.split(/[-_]/)[0];
  return base.length === 2 && ISO.has(base) ? base : null;
}
