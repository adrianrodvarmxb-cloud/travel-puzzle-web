import { describe, expect, it, vi } from "vitest";
import type { BookingRecord } from "@/booking/lib/booking-record";
import type { TripCard } from "@/trips/public-load";
import { candidatesFor, loadEmailCrossSell, type CrossSellLoaderDeps } from "./cross-sell";

const record: BookingRecord = {
  refNumber: "FT-1", tourExternalId: 77, eventId: 1, adults: 2, children: 0, price: 0, email: "ana@example.com", firstName: "Ana", lastName: "P",
  phone: null, eventDate: "2026-11-20 10:00:00", eventUtcDate: "2026-11-20 15:00:00", language: "Spanish", status: "active", manageToken: "tok_12345678",
  createdAt: new Date(0), updatedAt: new Date(0),
};
const card = (over: Partial<TripCard>): TripCard => ({
  id: "t", path: "/viajes/x", code: "X", kind: "tour", title: "Tour", summary: "", image: null, countries: ["PE"], places: "Perú", cities: ["Lima"],
  durationDays: 1, price: null, priceFrom: null, languages: ["es"], dates: ["2026-11-20"], group: "group", freeCancel: false, private: false,
  hotelPickup: false, createdAt: 0, durationMinutes: null, ...over,
});
const deps = (over: Partial<CrossSellLoaderDeps> = {}): CrossSellLoaderDeps => ({
  enabled: true, transfers: true, noPublicidad: async () => false, now: () => Date.parse("2026-11-10T00:00:00Z"),
  place: async () => ({ cityName: "Lima", country: "PE", cityCode: "lima" }),
  tripCards: async () => [
    card({ id: "a", path: "/viajes/city-tour-lima", title: "City Tour Virreinal de Lima" }),
    card({ id: "b", path: "/viajes/bus-lima", kind: "transporte", title: "Bus turístico de Lima", price: { main: "$450 MXN", original: null, rateNote: null } }),
    card({ id: "c", path: "/viajes/peru-8-dias", kind: "circuito", title: "Perú 8 días" }),
    card({ id: "d", path: "/viajes/cdmx", cities: ["Ciudad de México"], countries: ["MX"], title: "CDMX" }),
  ],
  ...over,
});
const SITE = "https://travelpuzzle.com.mx";

describe("REQ-263 candidatos del correo", () => {
  it("REQ-263 viajes propios de la ciudad (tour, única y transporte; sin circuitos) más el traslado", async () => {
    const c = candidatesFor({ cityName: "Lima", country: "PE", cityCode: "lima" }, await deps().tripCards("es"), true, "es");
    expect(c.map((x) => [x.source, x.category, x.url])).toEqual([
      ["own", "tour", "/viajes/city-tour-lima"], ["own", "transport", "/viajes/bus-lima"], ["affiliate", "transfer", "/traslados"],
    ]);
    expect(c.find((x) => x.category === "transport")?.priceLabel).toBe("Desde $450 MXN");
  });
  it("REQ-266 un precio convertido (con tipo de cambio) no se repite en el correo", () => {
    const c = candidatesFor({ cityName: "Lima", country: "PE", cityCode: null }, [card({ price: { main: "$9,000 MXN", original: "USD 500", rateNote: "Tipo de cambio" } })], false, "es");
    expect(c[0].priceLabel).toBeNull();
  });
  it("REQ-263 sin TRANSFERS_ENABLED no hay traslado", () => {
    expect(candidatesFor({ cityName: "Lima", country: "PE", cityCode: null }, [], false, "es")).toEqual([]);
  });
});

describe("REQ-264 / REQ-267 carga del bloque", () => {
  it("REQ-264 arma el bloque con UTM del correo", async () => {
    const b = await loadEmailCrossSell("confirmation", record, "es", SITE, deps());
    expect(b?.cards.map((x) => x.category)).toEqual(["tour", "transport", "transfer"]);
    expect(b?.cards[0].url).toContain("utm_campaign=venta-cruzada-confirmation");
  });
  it("REQ-264 apagada (o sin deps) no consulta nada", async () => {
    const place = vi.fn();
    expect(await loadEmailCrossSell("confirmation", record, "es", SITE, deps({ enabled: false, place }))).toBeNull();
    expect(await loadEmailCrossSell("confirmation", record, "es", SITE, undefined)).toBeNull();
    expect(place).not.toHaveBeenCalled();
  });
  it("REQ-267 sin forma de consultar la negativa, o con negativa, no hay bloque", async () => {
    expect(await loadEmailCrossSell("confirmation", record, "es", SITE, deps({ noPublicidad: undefined }))).toBeNull();
    expect(await loadEmailCrossSell("confirmation", record, "es", SITE, deps({ noPublicidad: async () => true }))).toBeNull();
  });
  it("REQ-264 si algo falla, el correo sale sin bloque (nunca lanza)", async () => {
    expect(await loadEmailCrossSell("confirmation", record, "es", SITE, deps({ place: async () => { throw new Error("D1"); } }))).toBeNull();
  });
  it("REQ-262 rechazo y cancelación nunca", async () => {
    for (const k of ["rejected", "canceled"] as const) expect(await loadEmailCrossSell(k, record, "es", SITE, deps())).toBeNull();
  });
});
