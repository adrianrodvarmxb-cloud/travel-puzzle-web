/**
 * Menú principal con la colección La Primera Pieza (decisión del PO, 5 nov 2026). Puro.
 * Con PRIMERA_PIEZA_ENABLED apagado el menú queda igual que hoy. No encender antes de que existan
 * las páginas /la-primera-pieza y /destinos (Ola 3 + Ola 4).
 */
import { ROUTES } from "@/destinations/lib/routes";

/** Nombre de la colección; no se traduce. Solo nombra el menú, el hub y la insignia (REQ-094). */
export const PRIMERA_PIEZA_LABEL = "La Primera Pieza";
const DESTINOS: Record<string, string> = { es: "Destinos", en: "Destinations", pt: "Destinos", de: "Reiseziele", fr: "Destinations", it: "Destinazioni" };

export function isPrimeraPiezaEnabled(value: string | undefined): boolean {
  return value === "true";
}

// REQ-093 + REQ-174: Inicio · La Primera Pieza · Destinos · Experiencias · Traslados · Cómo Funciona
export function withPrimeraPiezaLinks<L extends { href: string; label: string }>(links: L[], enabled: boolean, lang: string): (L | { href: string; label: string })[] {
  if (!enabled) return links;
  const rest = links.filter((l) => l.href !== ROUTES.primeraPieza && l.href !== ROUTES.destinos);
  const add = [
    { href: ROUTES.primeraPieza, label: PRIMERA_PIEZA_LABEL },
    { href: ROUTES.destinos, label: DESTINOS[lang] ?? DESTINOS.en },
  ];
  const home = rest.findIndex((l) => l.href === "/");
  return home < 0 ? [...add, ...rest] : [...rest.slice(0, home + 1), ...add, ...rest.slice(home + 1)];
}
