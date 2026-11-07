/**
 * Auditoría de tipos (REQ-865…874): corre el clasificador actual (src/taxonomy) sobre un respaldo de producción y los
 * imports de agencias, y escribe un CSV con formato, regla, temas y atributos por producto. Solo lectura: no toca la
 * base. Los tours gratis de FREETOUR no se listan (siempre son «Pieza libre», precedencia #6).
 *
 *   npx tsx src/scripts/auditoria-tipos.ts <carpeta-respaldo con Tour.json y TourTranslation.json> <salida.csv> [antes.csv]
 *
 * Con `antes.csv` (una corrida anterior de este mismo script) agrega «formato_antes» y «cambio» por fila y escribe
 * junto a la salida `<salida>.conteos.json` con los conteos por proveedor y formato (REQ-871, `diffAuditoria`).
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_DICTIONARY, DEFAULT_MAPPINGS } from "@/taxonomy/data/index";
import { classify } from "@/taxonomy/lib/classify";
import { tourToInput } from "@/taxonomy/lib/run-plan";
import type { ClassifyInput, ClassifyResult } from "@/taxonomy/lib/types";
import { diffAuditoria, type AuditRow } from "@/taxonomy/lib/audit-diff";

type Row = { proveedor: string; id: string; titulo: string; duracion: string; categoria: string; r: ClassifyResult };

const csv = (v: string) => `"${String(v).replace(/"/g, '""')}"`;

/** Lee un CSV de este script (campos entre comillas, coma como separador). */
function readCsv(path: string): Record<string, string>[] {
  const text = readFileSync(path, "utf8").replace(/^\ufeff/, "");
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; continue; }
    if (ch === '"') q = true; else if (ch === ",") { row.push(cell); cell = ""; } else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

async function main() {
  const [dir, out, antesPath] = process.argv.slice(2);
  if (!dir || !out) throw new Error("uso: auditoria-tipos.ts <respaldo> <salida.csv>");
  const tours = JSON.parse(readFileSync(join(dir, "Tour.json"), "utf8")) as Record<string, unknown>[];
  const paid = tours.filter((t) => t.isActive && Number(t.priceValue ?? 0) > 0 && (t.providerId ?? "freetour") === "freetour");
  const ids = new Set(paid.map((t) => t.id as string));
  // TourTranslation.json es grande (80 MB): se lee una vez y se guardan solo es/en de los tours de pago.
  const tr = JSON.parse(readFileSync(join(dir, "TourTranslation.json"), "utf8")) as { tourId: string; language: string; title: string | null; brief: string | null }[];
  const byTour = new Map<string, { es?: { title: string | null; brief: string | null }; en?: { title: string | null; brief: string | null } }>();
  for (const x of tr) {
    if (!ids.has(x.tourId) || (x.language !== "es" && x.language !== "en")) continue;
    const m = byTour.get(x.tourId) ?? {};
    m[x.language] = { title: x.title, brief: x.brief };
    byTour.set(x.tourId, m);
  }
  const rows: Row[] = [];
  for (const t of paid) {
    const m = byTour.get(t.id as string) ?? {};
    const input = tourToInput({
      id: t.id as string, categoryId: Number(t.categoryId), priceValue: t.priceValue as number, durationMinutes: (t.durationMinutes as number | null) ?? null,
      titleEs: m.es?.title ?? null, titleEn: m.en?.title ?? null, briefEs: m.es?.brief ?? null, briefEn: m.en?.brief ?? null,
      guideLanguages: (t.guideLanguages as string | null) ?? null, rating: t.rating as number | null, reviewsNumber: (t.reviewsNumber as number | null) ?? 0,
    });
    const min = (t.durationMinutes as number | null) ?? null;
    rows.push({ proveedor: "FREETOUR (pago)", id: String(t.externalId ?? t.id), titulo: m.es?.title ?? m.en?.title ?? "", duracion: min === null ? "" : `${Math.floor(min / 60)} h ${min % 60} min`, categoria: `cat=${t.categoryId}`, r: classify(input, DEFAULT_DICTIONARY, DEFAULT_MAPPINGS) });
  }
  const seen = new Map<string, number>();
  // Viajes de agencias (imports/*.json): mismo mapeo «propios» que la tarjeta (kind + resumen).
  for (const f of readdirSync("imports").filter((n) => n.endsWith(".json")).sort()) {
    const d = JSON.parse(readFileSync(join("imports", f), "utf8")) as { agency: { name: string }; trips: { ref?: string; trip: Record<string, unknown> }[] };
    for (const { trip, ref } of d.trips ?? []) {
      // El código se repite entre temporadas: id = ref (o código) + #n si ya salió, igual en todas las corridas.
      const base = String(ref ?? trip.code ?? trip.slug ?? "");
      const n = (seen.get(`${d.agency.name}|${base}`) ?? 0) + 1;
      seen.set(`${d.agency.name}|${base}`, n);
      const uid = n === 1 ? base : `${base}#${n}`;
      const input: ClassifyInput = {
        proveedor: "propios", categoriaId: trip.kind as string, precio: (trip.priceFrom as number | null) ?? null, durationDays: (trip.durationDays as number | null) ?? null,
        titulo: `${trip.titleEs ?? ""} | ${trip.titleEn ?? ""}`, resumen: `${trip.summaryEs ?? ""} ${trip.summaryEn ?? ""}`,
      };
      rows.push({ proveedor: d.agency.name, id: uid, titulo: String(trip.titleEs ?? ""), duracion: trip.durationDays ? `${trip.durationDays} d` : "", categoria: `kind=${trip.kind}`, r: classify(input, DEFAULT_DICTIONARY, DEFAULT_MAPPINGS) });
    }
  }
  const antes = antesPath ? readCsv(antesPath).map((r): AuditRow => ({ proveedor: r.proveedor, id: r.id, formato: r.formato })) : null;
  const prev = new Map((antes ?? []).map((r) => [`${r.proveedor}\u0000${r.id}`, r.formato]));
  const head = ["proveedor", "id", "titulo", "duracion", "categoria", ...(antes ? ["formato_antes"] : []), "formato", ...(antes ? ["cambio"] : []), "regla", "temas", "atributos"];
  const body = rows.map((x) => {
    const before = prev.get(`${x.proveedor}\u0000${x.id}`) ?? "";
    return [x.proveedor, x.id, x.titulo, x.duracion, x.categoria, ...(antes ? [before] : []), x.r.formato, ...(antes ? [before && before !== x.r.formato ? "sí" : ""] : []), x.r.reglaFormato, x.r.temas.join(" "), x.r.atributos.join(" ")].map(csv).join(",");
  });
  writeFileSync(out, "\ufeff" + [head.join(","), ...body].join("\n") + "\n");
  if (antes) {
    const d = diffAuditoria(antes, rows.map((x) => ({ proveedor: x.proveedor, id: x.id, formato: x.r.formato })));
    writeFileSync(out.replace(/\.csv$/, "") + ".conteos.json", JSON.stringify({ cambios: d.cambios.length, movimientos: d.movimientos, conteos: d.conteos }, null, 2));
    console.log(`${d.cambios.length} cambios de formato`);
  }
  console.log(`${rows.length} filas → ${out}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
