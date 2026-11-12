/**
 * Corrida de SOLO LECTURA: catálogo de tipos de Tangol (REQ-3487).
 *
 * Pide países → destinos → lista de tours por destino, por la pasarela firmada (nunca directo a Tangol),
 * y cuenta los `TypeCode`/`SubTypeCode`/`TourType` distintos con tres títulos de ejemplo. No escribe nada:
 * ni base, ni R2, ni archivos del repo. Imprime una tabla para pegar en el gate de taxonomía.
 *
 * Uso: GATEWAY_URL=... GATEWAY_SECRET=... npx tsx src/scripts/tipos-tangol.ts [maxDestinos]
 */
import { createTangolApi } from "@/tangol/api";
import { tallyTourTypes, formatTypeTally, type TourTypeInput } from "@/tangol/lib/types-report";

const { GATEWAY_URL, GATEWAY_SECRET } = process.env;
if (!GATEWAY_URL || !GATEWAY_SECRET) {
  console.error("Faltan GATEWAY_URL y GATEWAY_SECRET.");
  process.exit(1);
}
const maxDestinos = Number(process.argv[2] ?? "0") || Infinity;

// REQ-3487
async function main() {
  const api = createTangolApi({ config: { gatewayUrl: GATEWAY_URL!, secret: GATEWAY_SECRET! }, fetch });
  const countries = await api.getCountries();
  console.log(`Países: ${countries.items.length} (descartados ${countries.discarded})`);

  const tours: TourTypeInput[] = [];
  let destinos = 0;
  let fallos = 0;
  for (const c of countries.items) {
    if (destinos >= maxDestinos) break;
    const dest = await api.getDestinations(c.isoCode).catch((e) => { console.error(`${c.isoCode}: ${(e as Error).message}`); fallos++; return null; });
    for (const d of dest?.items ?? []) {
      if (destinos >= maxDestinos) break;
      destinos++;
      const list = await api.getTourList({ destinationId: d.id, languageCode: 0, currency: 0 })
        .catch((e) => { console.error(`destino ${d.id}: ${(e as Error).message}`); fallos++; return null; });
      for (const t of list?.items ?? []) {
        tours.push({ typeCode: t.typeCode, subTypeCode: t.subTypeCode, tourType: t.tourType, title: t.name, destination: d.name });
      }
      if (destinos % 20 === 0) console.log(`… ${destinos} destinos, ${tours.length} tours`);
    }
  }
  console.log(`\nDestinos leídos: ${destinos} — tours: ${tours.length} — llamadas con error: ${fallos}\n`);
  console.log(formatTypeTally(tallyTourTypes(tours), tours.length));
}

main().catch((e) => { console.error(`No se pudo leer: ${(e as Error).message}`); process.exit(1); });
