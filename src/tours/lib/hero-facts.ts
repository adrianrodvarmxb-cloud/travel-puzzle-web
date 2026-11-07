/**
 * Datos clave de la ficha de tour (tira bajo el H1). Puro y determinista (INC-001): `mounted` dice si ya se está
 * en el cliente, así el primer render es igual en servidor y cliente.
 * - REQ-578: con enriquecimiento, la duración legible y el idioma del guía vienen del servidor.
 * - REQ-588 (PO, 6 nov 2026, 22:29: «que se vea, solo no lo indexes»): sin enriquecimiento (FREETOUR) el idioma del
 *   guía se pinta solo en el cliente, como antes del #204, y él y el punto de encuentro llevan data-nosnippet.
 */
import { guideLanguagesLabel } from "@/seo/lib/ficha-ld";

export interface HeroFactsView {
  enrichment?: boolean;
  facts?: { duration: string | null; extra: { label: string; value: string }[]; clientOnly?: { label: string; codes: unknown } | null };
}
export interface HeroFact { key: string; label: string; value: string; nosnippet: boolean }

// REQ-578 REQ-588
export function heroFacts({ labels, tour, view, mounted, lang }: {
  labels: { duration: string; destination: string; meetingPoint: string; provider: string };
  tour: { duration?: string | null; destination?: string | null; meetingPoint?: string | null; provider?: string | null };
  view: HeroFactsView | null; mounted: boolean; lang: string;
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
  ];
  return all.filter((f): f is HeroFact => !!f && !!f.value);
}
