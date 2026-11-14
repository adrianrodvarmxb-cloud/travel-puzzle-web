/**
 * Datos clave de la ficha de tour (tira bajo el H1). Puro y determinista (INC-001): `mounted` dice si ya se está
 * en el cliente, así el primer render es igual en servidor y cliente.
 * - REQ-578: con enriquecimiento, la duración legible y el idioma del guía vienen del servidor.
 * - REQ-588 (PO, 6 nov 2026, 22:29: «que se vea, solo no lo indexes»): sin enriquecimiento (FREETOUR) el idioma del
 *   guía se pinta solo en el cliente, como antes del #204, y él y el punto de encuentro llevan data-nosnippet.
 * - REQ-10538 / REQ-10539: los hechos prácticos (horario de salida, punto de término, edades, idiomas del guía) llegan
 *   ya armados del servidor (`practicalInfo`); en /destinos el idioma del guía lo trae la ficha y no se repite.
 * - REQ-10541: ninguna casilla vacía; la rejilla no tiene columnas fijas (`heroFactsLayout`).
 */
import { guideLanguagesLabel } from "@/seo/lib/ficha-ld";
import type { PracticalFact } from "./practical-info";

export interface HeroFactsView {
  enrichment?: boolean;
  facts?: { duration: string | null; extra: { label: string; value: string }[]; clientOnly?: { label: string; codes: unknown } | null };
}
export interface HeroFact { key: string; label: string; value: string; nosnippet: boolean }

// REQ-578 REQ-588 REQ-10538 REQ-10539 REQ-10541
export function heroFacts({ labels, tour, view, mounted, lang, practical = [] }: {
  labels: { duration: string; destination: string; meetingPoint: string; provider: string };
  tour: { duration?: string | null; destination?: string | null; meetingPoint?: string | null; provider?: string | null };
  view: HeroFactsView | null; mounted: boolean; lang: string;
  practical?: readonly PracticalFact[];
}): HeroFact[] {
  const hidden = !!view && view.enrichment === false;
  const client = hidden && mounted && view?.facts?.clientOnly ? view.facts.clientOnly : null;
  const clientValue = client ? guideLanguagesLabel(client.codes, lang).join(", ") : "";
  const all: (HeroFact | null)[] = [
    { key: "duracion", label: labels.duration, value: view?.facts?.duration ?? tour.duration ?? "", nosnippet: false },
    { key: "destino", label: labels.destination, value: tour.destination ?? "", nosnippet: false },
    { key: "punto-encuentro", label: labels.meetingPoint, value: tour.meetingPoint ?? "", nosnippet: hidden },
    { key: "proveedor", label: labels.provider, value: tour.provider ?? "", nosnippet: false },
    ...(view?.facts?.extra ?? []).map((f) => ({ key: "idioma-guia", label: f.label, value: f.value, nosnippet: false })),
    client && clientValue ? { key: "idioma-guia", label: client.label, value: clientValue, nosnippet: true } : null,
    // REQ-10539: con ficha de /destinos el idioma del guía ya viene de `view` (REQ-578/588); no se repite.
    ...practical
      .filter((p) => !(view && p.key === "idioma-guia"))
      .filter((p) => !p.clientOnly || mounted)
      .map((p) => ({ key: p.key, label: p.label, value: p.value, nosnippet: p.clientOnly })),
  ];
  // REQ-10541: un valor vacío o de solo espacios no genera casilla.
  return all.filter((f): f is HeroFact => !!f && !!f.value && !!f.value.trim());
}

/**
 * REQ-10541 (captura del PO: Duración / Destino / Proveedor + una 4.ª casilla gris vacía en un tour de Tangol).
 * Causa: la rejilla tenía columnas fijas (`grid-cols-2` / `md:grid-cols-4`) sobre un fondo gris (`bg-white/10` con
 * `gap-px`); con 3 casillas la 4.ª columna quedaba vacía y se veía el fondo. Ahora es flex con salto de línea y cada
 * casilla crece hasta llenar su fila, así nunca queda hueco, tenga las casillas que tenga. Clases literales (Tailwind).
 */
// REQ-10541
export function heroFactsLayout(): { list: string; item: string } {
  return {
    list: "mt-8 flex flex-wrap gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10",
    item: "min-w-0 grow basis-[9.5rem] bg-[#0A1330] p-4 md:p-5",
  };
}
