/**
 * REQ-454 (decisión del PO, 6 nov 2026, 06:28): ningún carrusel del inicio muestra experiencias cuyo título diga
 * FreeTour, FREETOUR o «free tour»; se saltan y se toma la siguiente. Puro.
 * Equivalente provisional de `mentionsProviderBrand` que prepara otro PR (agente a41f4aa); al unirlos queda una sola.
 */
const BRAND = /\bfree[\s_-]*tours?\b/i;

// REQ-454
export function mentionsProviderBrand(text: string | null | undefined): boolean {
  return !!text && BRAND.test(text.normalize("NFD").replace(/[̀-ͯ]/g, ""));
}

/** REQ-454: títulos en cualquier idioma (mapa por idioma o lista). */
export function anyTitleMentionsProviderBrand(titles: Record<string, string | null | undefined> | readonly (string | null | undefined)[]): boolean {
  return (Array.isArray(titles) ? titles : Object.values(titles)).some(mentionsProviderBrand);
}
