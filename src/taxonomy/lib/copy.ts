/**
 * T5: copy y etiquetas por formato, tras TAXONOMY_LABELS_ENABLED (apagada; requiere TAXONOMY_PUBLISH_ENABLED). Puro.
 * - REQ-414: chips de formato dentro de «Tours» de la ciudad, solo con productos (REQ-412); temas, hasta firmar la muestra.
 * - REQ-415: etiqueta del formato fuera de la foto; el H1 sigue siendo el título real.
 * - REQ-416: «con un guía local» solo si hay guía en persona (no autoguiado, online, ni título con autoguiado/self-guided).
 * - REQ-433: sin MSI, pagos, «guía en español» ni la marca del proveedor.
 * - G-T9 = A: title «{título real} – Excursión desde {Ciudad}» en excursiones de un día (cambia REQ-099 solo para ese formato).
 */
import { SITE_META } from "@/seo/lib/meta";

const BRAND = SITE_META.name;
import { FORMATOS_FILTRO, formatoLabel, type FormatoFiltro } from "./filters";

/** Solo "true" exacto la enciende. Sin la publicación (T3) encendida no hace nada: las tarjetas no traen formato. */
export function taxonomyLabelsEnabled(env: { TAXONOMY_LABELS_ENABLED?: string; TAXONOMY_PUBLISH_ENABLED?: string }): boolean {
  return env.TAXONOMY_LABELS_ENABLED === "true" && env.TAXONOMY_PUBLISH_ENABLED === "true";
}

export interface FormatCard { formato?: string; guiaEnPersona?: boolean }
const isFiltro = (f: string | undefined): f is FormatoFiltro => !!f && (FORMATOS_FILTRO as readonly string[]).includes(f);

/** REQ-414 / REQ-412: chips de la sección «Tours» de la ciudad, con su conteo, nunca en cero. */
export function cityFormatChips(cards: readonly FormatCard[], lang = "es"): { slug: FormatoFiltro; label: string; count: number }[] {
  const n = new Map<string, number>();
  for (const c of cards) if (isFiltro(c.formato)) n.set(c.formato, (n.get(c.formato) ?? 0) + 1);
  return FORMATOS_FILTRO.filter((f) => (n.get(f) ?? 0) > 0).map((f) => ({ slug: f, label: formatoLabel(f, lang), count: n.get(f)! }));
}

/** REQ-416: intro de la ciudad; «con guías locales» solo si todo lo de «Tours» tiene guía en persona. */
export function cityIntro(city: string, free: number, tours: readonly FormatCard[]): string {
  const allGuided = tours.every((t) => t.guiaEnPersona !== false);
  return `${free} free tours y ${tours.length} ${allGuided ? "tours con guías locales" : "tours y experiencias"} en ${city}.`;
}

/** REQ-415: etiquetas de la ficha (el formato; los temas se agregan cuando el PO firme la muestra). */
export function tourLabels(formato: string | undefined, lang = "es"): string[] {
  return isFiltro(formato) ? [formatoLabel(formato, lang)] : [];
}

/** REQ-416: «Operado por un guía local · {proveedor}» solo con guía en persona; si no, «Operado por {proveedor}». */
export function operatedByFor(provider: string | null | undefined, guiaEnPersona: boolean, base: string): string {
  if (guiaEnPersona) return base;
  const name = base.split(" · ")[1];
  return name ? `Operado por ${name}` : "Operado por el proveedor";
}

/** REQ-416: descripción meta por formato. */
export function tourDescription(o: { formato?: string; guiaEnPersona: boolean; isFreeTour: boolean; city: string; notice?: string | null }): string {
  const what = o.isFreeTour ? "Free tour" : isFiltro(o.formato) ? formatoLabel(o.formato, "es") : "Tour";
  const how = o.guiaEnPersona ? " con un guía local" : o.formato === "autoguiado" ? ", a tu ritmo y sin guía en persona" : "";
  return `${what} en ${o.city}${how}. ${o.notice ?? ""}`.trim();
}

/** G-T9 = A: en excursiones de un día, «– Excursión desde {Ciudad}»; lo demás, el patrón firmado de REQ-099. */
export function tourTitleByFormat(o: { title: string; city: string; isFreeTour: boolean; formato?: string }): string | null {
  if (o.isFreeTour || o.formato !== "excursion-dia") return null;
  return `${o.title.trim()} – Excursión desde ${o.city.trim()} | ${BRAND}`;
}
