/**
 * REQ-3438: ensayo contra la empresa de prueba de Ventrata (EdinExplore) con la llave de prueba.
 * Corre en GitHub Actions (bigbus-octo-ensayo.yml) con el secreto BIGBUS_OCTO_TEST_KEY; nunca imprime la llave.
 * Siempre con Octo-Env: test (no consume lugares, el código no sirve y no se factura).
 *   1) Lectura: proveedor, catálogo, monedas (REQ-3437), calendario y disponibilidad.
 *   2) Reservas de prueba: apartar → confirmar → consultar → cancelar (lo que pide la certificación).
 * Uso: BIGBUS_OCTO_TEST_KEY=… npx tsx src/scripts/bigbus-octo-ensayo.ts [--reservas]
 */
import { createOctoApi, OctoError } from "../octo/api";
import { VENTRATA_OCTO_BASE_URL } from "../octo/lib/config";
import { chooseCurrency, fromPrice, guestPrice, isFullyPriced } from "../octo/lib/pricing";
import { deliverables } from "../octo/lib/booking-flow";
import { pickAvailability } from "../octo/lib/purchase";

const key = process.env.BIGBUS_OCTO_TEST_KEY?.trim();
const baseUrl = (process.env.BIGBUS_OCTO_TEST_URL?.trim() || VENTRATA_OCTO_BASE_URL).replace(/\/+$/, "");
const conReservas = process.argv.includes("--reservas");

function out(title: string, data: unknown) {
  console.log(`\n### ${title}\n${JSON.stringify(data, null, 2)}`);
}

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function main() {
  if (!key) throw new Error("Falta el secreto BIGBUS_OCTO_TEST_KEY");
  const api = createOctoApi({ config: { baseUrl, apiKey: key, env: "test" }, fetch });

  const supplier = (await api.getSupplier()) as { id?: string; name?: string } | null;
  out("Proveedor", { id: supplier?.id, name: supplier?.name, baseUrl });

  const cat = await api.getProducts();
  const resumen = cat.items.map((p) => ({
    id: p.id,
    nombre: p.internalName,
    disponibilidad: p.availabilityType,
    entrega: p.deliveryMethods,
    formatos: p.deliveryFormats,
    monedas: p.availableCurrencies,
    monedaBase: p.defaultCurrency,
    monedaElegida: chooseCurrency(p),
    precioCompleto: isFullyPriced(p),
    desde: fromPrice(p, chooseCurrency(p)),
    opciones: p.options.map((o) => ({ id: o.id, nombre: o.internalName, unidades: o.units.map((u) => `${u.type}:${u.id}`), corte: o.cancellationCutoff })),
  }));
  out("Catálogo", { productos: cat.items.length, descartados: cat.discarded, sinUSD: resumen.filter((r) => r.monedaElegida !== "USD").map((r) => r.nombre) });
  out("Productos", resumen.slice(0, 15));

  const today = new Date().toISOString().slice(0, 10);
  const product = cat.items.find((p) => isFullyPriced(p) && p.options[0]?.units.some((u) => u.type === "ADULT"));
  if (!product) {
    out("Sin producto para probar", "Ningún producto con precio completo y unidad ADULT");
    return;
  }
  const option = product.options[0];
  const adult = option.units.find((u) => u.type === "ADULT")!;
  const currency = chooseCurrency(product) ?? undefined;
  const units = [{ id: adult.id, quantity: 2 }];

  const cal = await api.availabilityCalendar({ productId: product.id, optionId: option.id, localDateStart: addDays(today, 1), localDateEnd: addDays(today, 30), units, currency });
  const open = cal.items.filter((d) => d.available);
  out("Calendario (30 días)", { producto: product.internalName, moneda: currency, dias: cal.items.length, abiertos: open.length, primeros: open.slice(0, 5).map((d) => ({ fecha: d.localDate, desde: d.pricingFrom ? guestPrice(d.pricingFrom) : null })) });
  const date = open[0]?.localDate;
  if (!date) return;

  const av = await api.availability({ productId: product.id, optionId: option.id, localDateStart: date, localDateEnd: date, units, currency });
  const pick = pickAvailability(av.items, date);
  out("Disponibilidad", { fecha: date, salidas: av.items.length, elegida: pick ? { id: pick.id, estado: pick.status, total: pick.pricing ? guestPrice(pick.pricing) : null } : null });
  if (!pick || !conReservas) return;

  const uuid = crypto.randomUUID();
  const ref = `TP-ENSAYO-${today.replace(/-/g, "")}-${uuid.slice(0, 4).toUpperCase()}`;
  const hold = await api.reserve({ uuid, productId: product.id, optionId: option.id, availabilityId: pick.id, units, resellerReference: ref });
  out("1. Apartado", { uuid, estado: hold.status, vence: hold.utcExpiresAt, testMode: hold.testMode });
  const conf = await api.confirm(uuid, { contact: { fullName: "Prueba Travel Puzzle", emailAddress: "info@travelpuzzle.com.mx", locales: ["es"] }, resellerReference: ref });
  out("2. Confirmada", { estado: conf.status, supplierReference: conf.supplierReference, testMode: conf.testMode, entrega: deliverables(conf) });
  // REQ-3453: la certificación pide una reserva actualizada: se cambia a 3 personas.
  const upd = await api.update(uuid, { units: [{ id: adult.id, quantity: 3 }] });
  out("3. Actualizada (3 personas)", { estado: upd.status, personas: upd.unitItems.length, total: upd.pricing ? guestPrice(upd.pricing) : null });
  const live = await api.getBooking(uuid);
  out("4. Consulta", { estado: live.status, cancelable: live.cancellable });
  const canc = await api.cancel(uuid, "Ensayo de certificación Travel Puzzle");
  out("5. Cancelada", { estado: canc.status, supplierReference: canc.supplierReference });
}

main().catch((e) => {
  const detail = e instanceof OctoError ? { status: e.status, codigo: e.errorCode, mensaje: e.message } : { mensaje: (e as Error).message };
  console.error("\n### ERROR\n" + JSON.stringify(detail, null, 2));
  process.exit(1);
});
