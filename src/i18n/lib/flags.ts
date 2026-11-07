// REQ-650: URL por idioma tras LOCALE_URLS_ENABLED; cualquier valor distinto de "true" = como hoy (cookie). Puro.
export function localeUrlsEnabled(env: Record<string, string | undefined>): boolean {
  return env.LOCALE_URLS_ENABLED === "true";
}
