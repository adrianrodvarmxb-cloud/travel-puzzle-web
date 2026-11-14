/**
 * REQ-10527 (solo lectura): ¿qué manda Tangol en `TourDetails` cuando la lista se pide con
 * `includeDetails`? Imprime solo la forma (llaves, tipos, largos), nunca el contenido. No escribe nada.
 * Uso: GATEWAY_URL=… GATEWAY_SECRET=… npx tsx src/scripts/forma-detalles-tangol.ts [destinos=3]
 */
import { createTangolApi } from "@/tangol/api";
import { shapeOf } from "@/tangol/lib/shape";

const { GATEWAY_URL, GATEWAY_SECRET } = process.env;
if (!GATEWAY_URL || !GATEWAY_SECRET) { console.error("Faltan GATEWAY_URL y GATEWAY_SECRET."); process.exit(1); }
const maxDestinos = Number(process.argv[2] ?? "3") || 3;

// REQ-10527
async function main() {
  const api = createTangolApi({ config: { gatewayUrl: GATEWAY_URL!, secret: GATEWAY_SECRET! }, fetch });
  const dest = await api.getDestinations("AR");
  let leidos = 0;
  for (const d of dest.items.slice(0, maxDestinos)) {
    for (const [etiqueta, includeDetails] of [["con includeDetails", true], ["sin includeDetails", false]] as const) {
      const list = await api.getTourList({ destinationId: d.id, languageCode: 0, currency: 0, includeDetails });
      const conDetalle = list.items.filter((t) => t.details != null).length;
      console.log(`destino ${d.id} (${d.name}) ${etiqueta}: ${list.items.length} tours, con TourDetails ${conDetalle}, descartados ${list.discarded}`);
      if (includeDetails) for (const t of list.items.slice(0, 2)) console.log(`  tour ${t.tourId}: ${JSON.stringify(shapeOf(t.details, 3))}`);
    }
    leidos++;
  }
  console.log(`Destinos leídos: ${leidos}`);
}
main().catch((e) => { console.error(`No se pudo leer: ${(e as Error).message}`); process.exit(1); });
