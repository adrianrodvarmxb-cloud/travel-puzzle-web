import { describe, expect, it, vi } from "vitest";
import { createSharedCache } from "@/cache/lib/shared-cache";
import { withRetry } from "@/tours/lib/d1-load";
import { createTripBySlugLoader, loadPublishedTripBySlug, reviveTripDates, type TripBySlugDeps } from "./trip-by-slug";

const VIS = { own: true, transport: true };
const row = { id: "t1", status: "published", kind: "circuit", agencyId: "a1", translations: { en: { title: "Golden" } } };
const trip = { id: "t1", slug: "triangulo", kind: "circuit", createdAt: new Date("2026-11-01T10:00:00Z"), updatedAt: new Date("2026-11-06T16:49:00Z") };

function deps(over: Partial<TripBySlugDeps> = {}): TripBySlugDeps {
  return {
    vis: VIS,
    isKindVisible: (k, v) => (k === "transport" ? v.transport : v.own),
    findRowBySlug: vi.fn(async () => row),
    findTripById: vi.fn(async () => trip as never),
    findAgencyName: vi.fn(async () => "Exotic Escapes"),
    ...over,
  };
}

describe("Ficha de viaje propio: datos publicados (REQ-306, misma salida que antes)", () => {
  it("REQ-306: publicado y visible → viaje, traducciones y agencia", async () => {
    expect(await loadPublishedTripBySlug("triangulo", deps())).toEqual({ trip, translations: row.translations, agencyName: "Exotic Escapes" });
  });
  it("REQ-306: sin publicar, de un tipo apagado o inexistente → null", async () => {
    expect(await loadPublishedTripBySlug("x", deps({ findRowBySlug: async () => ({ ...row, status: "draft" }) }))).toBeNull();
    expect(await loadPublishedTripBySlug("x", deps({ vis: { own: false, transport: true } }))).toBeNull();
    expect(await loadPublishedTripBySlug("x", deps({ findRowBySlug: async () => null }))).toBeNull();
  });
  it("REQ-306: sin agencia no consulta la agencia", async () => {
    const d = deps({ findRowBySlug: async () => ({ ...row, agencyId: null }) });
    expect((await loadPublishedTripBySlug("x", d))?.agencyName).toBeNull();
    expect(d.findAgencyName).not.toHaveBeenCalled();
  });
});

describe("Ficha de viaje propio tolerante a D1 saturada (REQ-306, observación del 6 nov 2026)", () => {
  const OVERLOADED = new Error("D1_ERROR: D1 DB is overloaded. Too many resources consumed within a 10 second window");
  const make = (d: TripBySlugDeps) => {
    const shared = createSharedCache({ l2: { get: async () => null, put: async () => {} } });
    return createTripBySlugLoader({
      load: (slug) => loadPublishedTripBySlug(slug, d),
      key: (slug) => `tripBySlug:${slug}`,
      cache: (key, load) => shared.get(key, { ttlSec: 120, staleSec: 3600 }, load),
      retry: (fn) => withRetry(fn, { sleep: async () => {}, jitter: () => 0 }),
    });
  };

  it("REQ-306: si D1 responde «overloaded», reintenta y la página recibe el viaje (antes: 500)", async () => {
    let n = 0;
    const d = deps({ findRowBySlug: vi.fn(async () => { if (n++ < 2) throw OVERLOADED; return row; }) });
    expect((await make(d)("triangulo"))?.trip.id).toBe("t1");
    expect(d.findRowBySlug).toHaveBeenCalledTimes(3);
  });

  it("REQ-306: una sola carga por petición: metadatos y página comparten la consulta", async () => {
    const d = deps();
    const load = make(d);
    const [a, b] = await Promise.all([load("triangulo"), load("triangulo")]);
    expect(a).toEqual(b);
    expect(d.findRowBySlug).toHaveBeenCalledTimes(1);
    expect(d.findTripById).toHaveBeenCalledTimes(1);
  });

  it("REQ-306: un error que no es de saturación no se reintenta (se ve en el aviso con Reintentar)", async () => {
    const d = deps({ findRowBySlug: vi.fn(async () => { throw new Error("no such column"); }) });
    await expect(make(d)("triangulo")).rejects.toThrow("no such column");
    expect(d.findRowBySlug).toHaveBeenCalledTimes(1);
  });
});

describe("reviveTripDates (REQ-306)", () => {
  it("REQ-306: la copia de la caché compartida (JSON) vuelve con fechas reales", () => {
    const copy = JSON.parse(JSON.stringify({ trip, translations: {}, agencyName: null }));
    const r = reviveTripDates(copy);
    expect(r.trip.createdAt).toBeInstanceOf(Date);
    expect((r.trip.updatedAt as Date).toISOString()).toBe("2026-11-06T16:49:00.000Z");
    expect(reviveTripDates(null)).toBeNull();
  });
});
