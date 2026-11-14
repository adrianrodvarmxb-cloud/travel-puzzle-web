/**
 * REQ-10527 (solo lectura): ¿qué manda Tangol en `TourDetails` cuando la lista se pide con
 * `includeDetails`? Imprime solo la forma (llaves, tipos, largos), nunca el contenido. No escribe nada.
 * REQ-10539: además imprime los valores DISTINTOS de `TourLanguages` (son códigos cortos de idioma, no contenido
 * del tour) para poder mapearlos a ISO 639-1.
 * Uso: GATEWAY_URL=… GATEWAY_SECRET=… npx tsx src/scripts/forma-detalles-tangol.ts [destinos=3]
 */
import { createTangolApi } from "@/tangol/api";
import { shapeOf } from "@/tangol/lib/shape";
import { parseTourDetails } from "@/tangol/lib/details";

const { GATEWAY_URL, GATEWAY_SECRET } = process.env;
if (!GATEWAY_URL || !GATEWAY_SECRET) { console.error("Faltan GATEWAY_URL y GATEWAY_SECRET."); process.exit(1); }
const maxDestinos = Number(process.argv[2] ?? "3") || 3;

// REQ-10527
async function main() {
  const api = createTangolApi({ config: { gatewayUrl: GATEWAY_URL!, secret: GATEWAY_SECRET! }, fetch });
  const dest = await api.getDestinations("AR");
  let leidos = 0;
  // REQ-10539: códigos distintos de TourLanguages con cuántos tours los traen.
  const idiomas = new Map<string, number>();
  for (const d of dest.items.slice(0, maxDestinos)) {
    for (const [etiqueta, includeDetails] of [["con includeDetails", true], ["sin includeDetails", false]] as const) {
      const list = await api.getTourList({ destinationId: d.id, languageCode: 0, currency: 0, includeDetails });
      const conDetalle = list.items.filter((t) => t.details != null).length;
      console.log(`destino ${d.id} (${d.name}) ${etiqueta}: ${list.items.length} tours, con TourDetails ${conDetalle}, descartados ${list.discarded}`);
      if (includeDetails) for (const t of list.items.slice(0, 2)) console.log(`  tour ${t.tourId}: ${JSON.stringify(shapeOf(t.details, 3))}`);
      // REQ-10528: el camino nuevo. Solo largos y conteos, nunca el texto.
      if (includeDetails && list.items.length) {
        const ids = list.items.slice(0, 20).map((t) => t.tourId);
        const det = await api.getTourDetailsList({ tourIds: ids, languageCode: "0", currency: "USD" });
        console.log(`  GetTourDetailsList(${ids.length}) → ${det.length} detalle(s); forma del 1.º: ${JSON.stringify(shapeOf(det[0], 2))}`);
        for (const d of det) {
          const raw = (d as { TourLanguages?: unknown }).TourLanguages;
          const code = typeof raw === "string" ? raw.trim().slice(0, 16) : `(${raw === null ? "null" : typeof raw})`;
          idiomas.set(code, (idiomas.get(code) ?? 0) + 1);
          const p = parseTourDetails(d);
          console.log(`  detalle ${(d as { TourId?: number }).TourId}: descripción ${p.description?.length ?? 0} car., resumen ${p.brief?.length ?? 0}, fotos ${p.images.length}, punto ${p.startPoint ? "sí" : "no"}, cancelación ${p.cancellationPolicy ? "sí" : "no"}, reseñas ${p.reviewsNumber ?? 0}, idiomas ${p.languages.length}, descartado ${p.discarded ?? 0}`);
        }
      }
    }
    leidos++;
  }
  console.log(`Destinos leídos: ${leidos}`);
  console.log(`TourLanguages distintos (código → tours): ${JSON.stringify([...idiomas.entries()].sort((a, b) => b[1] - a[1]))}`);
}
main().catch((e) => { console.error(`No se pudo leer: ${(e as Error).message}`); process.exit(1); });
