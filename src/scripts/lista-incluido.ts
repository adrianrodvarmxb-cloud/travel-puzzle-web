/**
 * REQ-10728: arma la lista de etiquetas «incluido» con cantidad por proveedor, para firma del PO.
 * Uso: npx tsx src/scripts/lista-incluido.ts <carpeta de salida>. Solo lee `imports/*.json`; no escribe en la base.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { etiquetasIncluido, type ConceptoIncluido } from "../taxonomy/lib/incluido-cantidad";

type Fila = { ref: string; titulo: string; etiquetas: string[]; sin: ConceptoIncluido[] };
const NOMBRE: Record<ConceptoIncluido, string> = { desayuno: "desayuno", comida: "comida", cena: "cena", hotel: "hotel", tren: "tren", autobus: "autobús" };

/** Firmas del PO, una por proveedor (REQ-10728): respuesta literal a la pregunta de la lista. */
const FIRMAS = [
  { proveedor: "Fantástica China", respuesta: "Sí, firmo (Recomendado)", fecha: "16-11-2026 12:49" },
  { proveedor: "Exotic Escapes", respuesta: "Sí, firmo (Recomendado)", fecha: "16-11-2026 14:01" },
  { proveedor: "Destino Colombia", respuesta: "Sí, firmo (Recomendado)", fecha: "16-11-2026 14:02" },
  { proveedor: "Turismo Asiático", respuesta: "Sí, firmo (Recomendado)", fecha: "16-11-2026 14:02" },
  { proveedor: "Inca World Peru", respuesta: "Sí, firmo (Recomendado)", fecha: "16-11-2026 14:09" },
  { proveedor: "Extime Travel", respuesta: "Sí, firmo (Recomendado)", fecha: "16-11-2026 14:10" },
  { proveedor: "Big Bus Tours", respuesta: "Etiqueta «Autobús turístico incluido» (REQ-10733)", fecha: "16-11-2026 14:10" },
];

const salida = process.argv[2];
if (!salida) throw new Error("Falta la carpeta de salida");
const porAgencia = new Map<string, Map<string, Fila>>();
for (const archivo of readdirSync("imports").filter((f) => f.endsWith(".json")).sort()) {
  const data = JSON.parse(readFileSync(join("imports", archivo), "utf8")) as { agency: { name?: string } | string; trips: { ref: string; trip: Record<string, unknown> }[] };
  const agencia = typeof data.agency === "string" ? data.agency : data.agency.name ?? archivo;
  const filas = porAgencia.get(agencia) ?? new Map<string, Fila>();
  for (const { ref, trip } of data.trips) {
    if (!Array.isArray(trip.includes)) continue; // archivo que solo actualiza precio
    const r = etiquetasIncluido({
      includes: trip.includes as string[],
      itinerary: (trip.itinerary as { title?: string; text?: string }[] | undefined) ?? [],
      durationDays: trip.durationDays as number | undefined,
    });
    filas.set(ref, { ref, titulo: String(trip.titleEs ?? ""), etiquetas: r.etiquetas.map((e) => e.etiqueta), sin: r.sinCantidad });
  }
  porAgencia.set(agencia, filas);
}

const out: string[] = [
  "# Etiquetas «incluido» con cantidad: lista por proveedor para firma del PO",
  "",
  "Folios: **REQ-10707** y **REQ-10728**. Regla (PO, 15-11-2026: «Etiqueta con cantidad»): la etiqueta dice cuánto incluye el producto y nunca sugiere más; si la cantidad no se sabe, no hay etiqueta y el detalle se queda en «Incluye». Vale para todos los proveedores (REQ-10709).",
  "",
  "Esta lista sale de `npx tsx src/scripts/lista-incluido.ts` sobre los archivos de carga. **No está aplicada**: se aplica proveedor por proveedor con la firma del PO.",
  "",
  "## Firmas del PO (una por proveedor)",
  "",
  "| Proveedor | Respuesta literal | Fecha y hora (CDMX) |",
  "|---|---|---|",
  ...FIRMAS.map((f) => `| ${f.proveedor} | «${f.respuesta}» | ${f.fecha} |`),
  "",
  "## Resumen",
  "",
  "| Proveedor | Viajes | Con al menos una etiqueta | Sin etiqueta | Con algún concepto sin cantidad |",
  "|---|---|---|---|---|",
];
const detalle: string[] = [];
for (const [agencia, mapa] of porAgencia) {
  const filas = [...mapa.values()];
  const con = filas.filter((f) => f.etiquetas.length > 0).length;
  const duda = filas.filter((f) => f.sin.length > 0).length;
  out.push(`| ${agencia} | ${filas.length} | ${con} | ${filas.length - con} | ${duda} |`);
  detalle.push("", `## ${agencia}`, "", "| Clave | Viaje | Etiquetas | Menciona sin cantidad (sin etiqueta) |", "|---|---|---|---|");
  for (const f of filas) detalle.push(`| ${f.ref} | ${f.titulo.replace(/\|/g, "/")} | ${f.etiquetas.join(" · ") || "—"} | ${f.sin.map((s) => NOMBRE[s]).join(", ") || "—"} |`);
}
mkdirSync(salida, { recursive: true });
writeFileSync(join(salida, "README.md"), [...out, ...detalle, ""].join("\n"));
console.log(out.slice(6).join("\n"));
