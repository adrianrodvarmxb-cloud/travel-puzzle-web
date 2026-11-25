/**
 * REQ-10874 · Ficha única, ola 9 (plan §7: «país del visitante»; decisión 32, REQ-10610). El país del visitante sale de
 * la cabecera `cf-ipcountry` que pone el borde de Cloudflare en cada petición. Se lee SOLO en rutas que el borde no
 * guarda (`/api/*`, REQ-3318): el HTML de la ficha es el mismo para todos y el precio local se pide aparte. Puro:
 * recibe un lector de cabeceras, no toca `headers()` ni `process.env`.
 */

/** Valores especiales de Cloudflare que no son un país: desconocido y red Tor. */
const NOT_A_COUNTRY = new Set(["XX", "T1"]);

/** ISO 3166-1 alfa-2 en mayúsculas, o null si la cabecera falta o no es un país. */
// REQ-10874
export function visitorCountryFrom(get: (name: string) => string | null | undefined): string | null {
  const raw = (get("cf-ipcountry") ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(raw) || NOT_A_COUNTRY.has(raw)) return null;
  return raw;
}
