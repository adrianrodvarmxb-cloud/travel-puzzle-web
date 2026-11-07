import { describe, expect, it, vi } from "vitest";
import { loadNearbyCandidates, loadOriginPoint, type NearbyDb } from "./nearby-load";

const row = (over: Record<string, unknown> = {}) => ({
  id: "t1", slug: "city-tour-cusco-iw-pe-t01-001", kind: "tour", titleEs: "City Tour en Cusco", countries: ["PE"], cities: ["Cusco"],
  priceFrom: 35, currency: "USD", images: [{ key: "trips/1-abc.jpg", alt: "" }], meetingPoints: [{ name: "Plaza", lat: -13.5166, lng: -71.9785 }],
  durationDays: 1, agency: { name: "Inca World Peru" }, ...over,
});
const db = (rows: unknown[], tour?: Partial<NearbyDb["tour"]>): NearbyDb => ({
  trip: { findMany: vi.fn(async () => rows) },
  tour: { findUnique: vi.fn(async () => null), findMany: vi.fn(async () => []), ...tour },
});
const ALL = { own: true, transport: true };

describe("Lectura de experiencias cercanas (REQ-320, REQ-322)", () => {
  it("REQ-320: arma el candidato con ficha, foto, punto y agencia; solo publicados", async () => {
    const d = db([row()]);
    const [c] = await loadNearbyCandidates(d, ALL);
    expect(c).toMatchObject({
      provider: "trip", id: "t1", title: "City Tour en Cusco", path: "/viajes/peru/city-tour-cusco-iw-pe-t01-001",
      image: "/api/viajes/foto/trips/1-abc.jpg", point: { lat: -13.5166, lng: -71.9785 }, agencyName: "Inca World Peru", currency: "USD",
    });
    expect((d.trip.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0].where).toEqual({ status: "published" });
  });

  it("REQ-320: respeta los interruptores (transporte aparte) y descarta registros malos sin tumbar la lista", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const rows = [row(), row({ id: "bb", kind: "transporte" }), row({ id: "bad", titleEs: "" }), null];
    expect((await loadNearbyCandidates(db(rows), { own: true, transport: false })).map((c) => c.id)).toEqual(["t1"]);
    expect((await loadNearbyCandidates(db(rows), { own: false, transport: true })).map((c) => c.id)).toEqual(["bb"]);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it("REQ-320: si la base falla, lista vacía (la tarjeta cae al asesor)", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const d: NearbyDb = { ...db([]), trip: { findMany: async () => { throw new Error("D1"); } } };
    expect(await loadNearbyCandidates(d, ALL)).toEqual([]);
    err.mockRestore();
  });

  it("REQ-322: el origen es el punto de encuentro del tour; con relleno o sin él, la mediana de su ciudad", async () => {
    expect(await loadOriginPoint(db([], { findUnique: async () => ({ cityId: 9, meetingPoint: { coordinates: "-11.8343,31.4529" } }) }), 77)).toEqual({ lat: -11.8343, lng: 31.4529 });
    const city = db([], {
      findUnique: async () => ({ cityId: 9, meetingPoint: JSON.stringify({ coordinates: "51.478,0.0015" }) }),
      findMany: async () => [{ meetingPoint: { coordinates: "51.5,-0.12" } }, { meetingPoint: { coordinates: "51.52,-0.14" } }, { meetingPoint: {} }],
    });
    expect(await loadOriginPoint(city, 77)).toEqual({ lat: 51.51, lng: -0.13 });
    expect(await loadOriginPoint(db([]), null)).toBeNull();
    expect(await loadOriginPoint(db([], { findUnique: async () => { throw new Error("D1"); } }), 77)).toBeNull();
  });
});
