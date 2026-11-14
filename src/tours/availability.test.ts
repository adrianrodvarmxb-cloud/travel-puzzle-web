// REQ-3468, REQ-3470 — la carga de la disponibilidad: una llamada por tour, caché compartida y la ficha no se cae.
import { describe, expect, it, vi } from "vitest";
import { loadProviderAvailability, type AvailabilityDeps } from "./availability";

/** Respuesta de ejemplo con la forma de `parseTourRates`. Nunca se llama a Tangol ni a la pasarela. */
const tarifasDeEjemplo = {
  currency: "USD",
  blackouts: [{ from: "2026-12-24", to: "2026-12-25" }],
  hoursBooking: 24,
  rates: [{ option: "A", validFrom: "2026-11-15", validTo: "2027-02-28", rackAdult: 110, currency: "USD" }],
};

/** Caché de verdad pero en memoria: la misma llave no vuelve a cargar. */
function cacheFalsa() {
  const store = new Map<string, unknown>();
  const llaves: string[] = [];
  return {
    llaves,
    cached: async <T>(key: string, load: () => Promise<T>): Promise<T> => {
      llaves.push(key);
      if (!store.has(key)) store.set(key, await load());
      return store.get(key) as T;
    },
  };
}

function deps(over: Partial<AvailabilityDeps> = {}): AvailabilityDeps {
  const c = cacheFalsa();
  return { rangeRates: null, cached: c.cached, today: "2026-11-12", log: () => {}, ...over };
}

const tourTangol = { providerId: "tangol", externalId: 4312 };

describe("REQ-3468: carga de la disponibilidad de un tour de proveedor", () => {
  it("REQ-3468: con tarifas con rango devuelve el calendario del mes con precio por día", async () => {
    const rangeRates = vi.fn(async () => tarifasDeEjemplo);
    const cal = await loadProviderAvailability(tourTangol, { months: 2 }, deps({ rangeRates }));
    expect(cal!.months.map((m) => m.month)).toEqual(["2026-11", "2026-12"]);
    expect(cal!.months[0].days.find((d) => d.date === "2026-11-20")).toMatchObject({ bookable: true, from: 110, currency: "USD" });
    expect(cal!.currency).toBe("USD");
  });

  it("REQ-3468: las tarifas se piden UNA sola vez por tour y van por la caché compartida", async () => {
    const rangeRates = vi.fn(async () => tarifasDeEjemplo);
    const c = cacheFalsa();
    const d = deps({ rangeRates, cached: c.cached });
    await loadProviderAvailability(tourTangol, { months: 6 }, d);
    await loadProviderAvailability(tourTangol, { months: 6 }, d);
    expect(rangeRates).toHaveBeenCalledTimes(1);
    expect(rangeRates).toHaveBeenCalledWith(4312);
    expect(new Set(c.llaves).size).toBe(1);
    expect(c.llaves[0]).toContain("tangol");
    expect(c.llaves[0]).toContain("4312");
  });

  it("REQ-3468: un proveedor de fechas sueltas no llama a nadie", async () => {
    const rangeRates = vi.fn(async () => tarifasDeEjemplo);
    const cal = await loadProviderAvailability(
      { providerId: "freetour", externalId: 9, departureDates: ["2026-11-20"], fromPrice: { adult: 0, currency: "EUR" } },
      { months: 1 },
      deps({ rangeRates }),
    );
    expect(rangeRates).not.toHaveBeenCalled();
    expect(cal!.months[0].days.filter((d) => d.bookable).map((d) => d.date)).toEqual(["2026-11-20"]);
  });
});

describe("REQ-3470: si las tarifas no cargan, la ficha no se cae", () => {
  it("REQ-3470: una llamada que falla devuelve null y se registra", async () => {
    const log = vi.fn();
    const rangeRates = vi.fn(async () => {
      throw new Error("la pasarela respondió 504");
    });
    const cal = await loadProviderAvailability(tourTangol, { months: 2 }, deps({ rangeRates, log }));
    expect(cal).toBeNull();
    expect(log).toHaveBeenCalledTimes(1);
    expect(String(log.mock.calls[0][1])).toContain("504");
  });

  it("REQ-3470: sin forma de pedir tarifas (bandera apagada) devuelve null sin inventar precios", async () => {
    const log = vi.fn();
    expect(await loadProviderAvailability(tourTangol, { months: 2 }, deps({ rangeRates: null, log }))).toBeNull();
    expect(log).not.toHaveBeenCalled();
  });

  it("REQ-3470: un tour sin fechas de salida ni precio devuelve null", async () => {
    expect(await loadProviderAvailability({ providerId: "freetour", externalId: 9 }, { months: 2 }, deps())).toBeNull();
  });
});
