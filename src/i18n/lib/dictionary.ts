import type { SupportedLanguage } from "@/types";

/**
 * REQ-10869 (ola 15, REQ-1562/REQ-1563): el navegador solo descarga el diccionario del idioma que usa.
 * Antes el cliente del layout cargaba los 6 diccionarios en cada página (~70 KB sin comprimir).
 * Funciones puras: sin `import()`, sin `window`.
 */
export type Dictionary = Record<string, string>;
export type Dictionaries = Partial<Record<SupportedLanguage, Dictionary>>;

/** Mismo resultado que antes (`translations[lang]?.[key] || fallback || key`), con los diccionarios ya cargados. */
// REQ-10869
export function translate(dicts: Dictionaries, lang: SupportedLanguage, key: string, fallback?: string): string {
  const v = dicts[lang]?.[key];
  if (v) return v;
  return fallback !== undefined ? fallback : key;
}

/** Diccionarios con los que arranca el cliente: español siempre y, si el servidor pintó otro idioma, ese también. */
// REQ-10869
export function initialDictionaries(es: Dictionary, lang?: SupportedLanguage, dict?: Dictionary): Dictionaries {
  if (!lang || lang === "es" || !dict) return { es };
  return { es, [lang]: dict };
}

/** Agrega un diccionario sin mutar el estado anterior. */
// REQ-10869
export function withDictionary(dicts: Dictionaries, lang: SupportedLanguage, dict: Dictionary): Dictionaries {
  if (dicts[lang] === dict) return dicts;
  return { ...dicts, [lang]: dict };
}
