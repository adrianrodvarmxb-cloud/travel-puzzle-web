/**
 * REQ-753, REQ-754: denominación ORIGINAL del proveedor de cada registro importado y lo que el registro declara en
 * vocabulario de Travel Puzzle. Puro. Solo se lee de campos que vienen del proveedor (códigos, URL del producto o
 * `original.categoria` capturada del documento); si no hay, devuelve null: nunca se inventa una categoría.
 */
import { FORMATOS, TEMAS } from "@/taxonomy/lib/types";
import extimeCodigos from "@/taxonomy/data/extime-codigos.json";

export interface Original { field: string; value: string; matchedTerm: string | null }

type EntryLike = { ref?: unknown; source?: unknown; original?: { categoria?: unknown } | null; taxonomia?: unknown };

/** Reglas por proveedor: código del proveedor (ref) o URL del producto (source) → denominación del documento original. */
const RULES: Record<string, { field: "ref" | "source"; rx: RegExp; value: string }[]> = {
  bigbus: [{ field: "source", rx: /tour-tickets-and-passes|tickets-passes/, value: "tour-tickets-and-passes" }],
  fantasticachina: [{ field: "ref", rx: /^FCH-R/, value: "TOUR REGULAR" }, { field: "ref", rx: /^FCH-L/, value: "TOUR GRAN LUJO" }],
  destinocolombia: [{ field: "ref", rx: /^PC(?=-?\d)/, value: "PC" }],
  incaworld: [{ field: "ref", rx: /^PROG-/, value: "PROGRAMA" }, { field: "ref", rx: /^(LIM|CUS|MP|PUN|AQP|NAZ|CHH)-\d/, value: "SERVICIO" }],
};

/** REQ-10749: Extime no trae la línea de producto en el código, sino en la columna INTL de su programa oficial; tabla Tour Code → línea. */
const EXTIME_CODIGOS: Record<string, string> = (extimeCodigos as { codigos: Record<string, string> }).codigos;

// REQ-753
export function originalOf(provider: string, entry: EntryLike): Original | null {
  const explicit = entry.original?.categoria;
  if (typeof explicit === "string" && explicit.trim()) return { field: "original.categoria", value: explicit.trim(), matchedTerm: null };
  if (provider === "extime" && typeof entry.ref === "string") {
    // REQ-10749: el código del programa (VAM, P1V, 5D4N…) identifica la línea de producto del documento original.
    const linea = EXTIME_CODIGOS[entry.ref.trim().toUpperCase()];
    if (linea) return { field: "ref", value: linea, matchedTerm: entry.ref.trim() };
  }
  for (const r of RULES[provider] ?? []) {
    const text = entry[r.field];
    if (typeof text !== "string") continue;
    const m = r.rx.exec(text);
    if (m) return { field: r.field, value: r.value, matchedTerm: m[0] };
  }
  return null;
}

// REQ-754
export function declaredOf(entry: EntryLike): string | null {
  const t = entry.taxonomia as { formato?: unknown; temas?: unknown } | undefined;
  if (!t || typeof t !== "object") return null;
  const formato = typeof t.formato === "string" && (FORMATOS as readonly string[]).includes(t.formato) ? t.formato : null;
  const temas = Array.isArray(t.temas) ? t.temas.filter((x): x is string => typeof x === "string" && (TEMAS as readonly string[]).includes(x)) : [];
  if (!formato && temas.length === 0) return null;
  return JSON.stringify({ ...(formato ? { formato } : {}), ...(temas.length ? { temas } : {}) });
}
