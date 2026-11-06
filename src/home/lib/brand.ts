/**
 * REQ-219 (PO, 6 nov 2026): en el inicio no se muestra nada cuyo título visible diga «FreeTour» / «Free Tour»
 * (marca del proveedor; para ir a la segura también el «free tour» genérico). Pura y exportable: la usan
 * src/home/load.ts y cualquier carrusel del inicio. La ficha conserva el título real (regla C4).
 */
const BRAND = /free[\s-]*tours?/;

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// REQ-219
export function mentionsProviderBrand(title: string | null | undefined): boolean {
  return typeof title === "string" && BRAND.test(fold(title));
}

// REQ-219: un tour (o viaje) con la marca en el título de cualquier idioma queda fuera del inicio.
export function titlesMentionBrand(titles: Record<string, string> | readonly (string | null | undefined)[]): boolean {
  return (Array.isArray(titles) ? titles : Object.values(titles)).some((t) => mentionsProviderBrand(t));
}
