/**
 * Menú principal con la colección La Primera Pieza (decisión del PO, 5 nov 2026). Puro.
 * Con PRIMERA_PIEZA_ENABLED apagado el menú queda igual que hoy. No encender antes de que existan
 * las páginas /la-primera-pieza y /destinos (Ola 3 + Ola 4).
 */
import { ROUTES } from "@/destinations/lib/routes";

/** Nombre de la colección; no se traduce. Solo nombra el menú, el hub y la insignia (REQ-094). */
export const PRIMERA_PIEZA_LABEL = "La Primera Pieza";
const DESTINOS: Record<string, string> = { es: "Destinos", en: "Destinations", pt: "Destinos", de: "Reiseziele", fr: "Destinations", it: "Destinazioni" };

/**
 * REQ-600 (PO, 6 nov 2026, 21:16): «La Primera Pieza» ya no va en el menú principal; vive dentro de Experiencias.
 * Solo quita el enlace del menú: la página, sus sitemaps y robots siguen con PRIMERA_PIEZA_ENABLED.
 * Para regresarlo: `true`.
 */
export const MENU_PRIMERA_PIEZA = false;

export function isPrimeraPiezaEnabled(value: string | undefined): boolean {
  return value === "true";
}

// REQ-093 + REQ-174: Inicio · La Primera Pieza · Destinos · Experiencias · Traslados · Cómo Funciona
// REQ-600: con `showPrimeraPieza` en false (MENU_PRIMERA_PIEZA): Inicio · Destinos · Experiencias · Traslados · Cómo Funciona
export function withPrimeraPiezaLinks<L extends { href: string; label: string }>(links: L[], enabled: boolean, lang: string, showPrimeraPieza: boolean = MENU_PRIMERA_PIEZA): (L | { href: string; label: string })[] {
  if (!enabled) return links;
  const rest = links.filter((l) => l.href !== ROUTES.primeraPieza && l.href !== ROUTES.destinos);
  const add = [
    ...(showPrimeraPieza ? [{ href: ROUTES.primeraPieza, label: PRIMERA_PIEZA_LABEL }] : []),
    { href: ROUTES.destinos, label: DESTINOS[lang] ?? DESTINOS.en },
  ];
  const home = rest.findIndex((l) => l.href === "/");
  return home < 0 ? [...add, ...rest] : [...rest.slice(0, home + 1), ...add, ...rest.slice(home + 1)];
}

// REQ-601: el hub sigue enlazado en el HTML servido (pie), para que no quede huérfano sin el menú.
export function footerHubLinks(enabled: boolean): { href: string; label: string }[] {
  return enabled ? [{ href: ROUTES.primeraPieza, label: PRIMERA_PIEZA_LABEL }] : [];
}
