/**
 * Chips de tipos principales de /tours (PO, 6 nov 2026, 21:16: «que se vean las etiquetas principales y se actualicen
 * cada vez que hay nuevos»). Puro y sin el JSON del diccionario (lo usa un componente de cliente).
 * - Las opciones salen de los conteos por formato (catálogo + viajes): un tipo con resultados tiene chip, sin tocar código.
 * - Las etiquetas son las de la tarjeta (categoryLabel → FORMATO_CARD_LABEL): el chip y la tarjeta nunca difieren.
 * - Elegir un chip = ?formato= de T4 (mismo filtro del servidor y de los viajes, noindex con canonical a /tours).
 */
import { FORMATOS_FILTRO } from "@/taxonomy/lib/filters";
import { tripCopy } from "@/trips/lib/copy";
import { categoryLabel } from "./experience-card";
import { defLabel, type FormatDef } from "@/taxonomy/lib/format-defs";

export interface FormatChip {
  /** null = «Todo». */
  slug: string | null;
  label: string;
  count: number;
}

// REQ-546 REQ-547 REQ-549
// REQ-1256: con `defs` (del diccionario, armadas en el servidor) los tipos y sus nombres salen de ahí; sin ellas, la lista del código.
export function formatChips(counts: Readonly<Record<string, number>> | null | undefined, lang: string, defs?: readonly FormatDef[]): FormatChip[] {
  const slugs: readonly string[] = defs ? defs.map((d) => d.slug) : FORMATOS_FILTRO;
  const shown = slugs.map((slug) => ({ slug, count: counts?.[slug] ?? 0 })).filter((c) => c.count > 0);
  if (!shown.length) return [];
  const order = (s: string) => slugs.indexOf(s);
  const label = (s: string) => { const d = defs?.find((x) => x.slug === s); return d ? defLabel(d.corto, lang) : categoryLabel(s, lang); };
  shown.sort((a, b) =>
    (a.slug === "pieza-libre" ? -1 : b.slug === "pieza-libre" ? 1 : 0) || b.count - a.count || order(a.slug) - order(b.slug));
  const total = shown.reduce((s, c) => s + c.count, 0);
  return [
    { slug: null, label: tripCopy(lang).filterAll, count: total },
    ...shown.map((c) => ({ slug: c.slug, label: label(c.slug), count: c.count })),
  ];
}
