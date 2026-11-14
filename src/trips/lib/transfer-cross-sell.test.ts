import { describe, expect, it } from "vitest";
import {
  MAX_COMPLEMENTS, TRANSFER_CATEGORY_IDS, complementItems, parseProviderTransfer, parseProviderTransfers,
  transferPrice, transferTitle, type ProviderTransfer,
} from "./transfer-cross-sell";

const row = (over: Record<string, unknown> = {}) => ({
  id: "tr-1", providerId: "freetour", categoryId: 29, cityName: "París", countryCode: "FR",
  titles: { es: "Traslado aeropuerto CDG → centro", en: "CDG airport transfer" },
  image: "https://img/1.webp", price: 24, currency: "EUR", reviews: 120, rating: 4.7, ...over,
});

const transfer = (id: string, city: string, reviews: number, over: Partial<ProviderTransfer> = {}): ProviderTransfer => ({
  id, title: `Traslado ${id}`, image: null, price: "EUR 24", cityName: city, countryCode: "FR", reviews, rating: 4.5, ...over,
});

const own = (id: string) => ({ id, path: `/viajes/x/${id}`, title: `Propio ${id}`, image: null, price: "MXN $630" });

describe("parseProviderTransfer", () => {
  it("REQ-3428: un traslado de proveedor válido sale con su precio público y sin el nombre del proveedor", () => {
    expect(parseProviderTransfer(row(), "es", {})).toEqual({
      id: "tr-1", title: "Traslado aeropuerto CDG → centro", image: "https://img/1.webp", price: "EUR 24",
      cityName: "París", countryCode: "FR", reviews: 120, rating: 4.7,
    });
  });

  it("REQ-3428: las dos categorías de proveedor que entran son traslado (29) y transporte turístico (30)", () => {
    expect([...TRANSFER_CATEGORY_IDS]).toEqual([29, 30]);
    expect(parseProviderTransfer(row({ categoryId: 30 }), "es", {})?.id).toBe("tr-1");
    expect(parseProviderTransfer(row({ categoryId: 4 }), "es", {})).toBeNull();
    expect(parseProviderTransfer(row({ categoryId: null }), "es", {})).toBeNull();
  });

  it("REQ-3428: nunca se filtra el nombre del proveedor en el título", () => {
    const r = parseProviderTransfer(row({ titles: { es: "Traslado aeropuerto (Freetour.com)" } }), "es", {});
    expect(r?.title).toBe("Traslado aeropuerto");
    expect(r?.title.toLowerCase()).not.toContain("freetour");
    // Título que solo era el nombre del proveedor: no queda nada que mostrar, se descarta.
    expect(parseProviderTransfer(row({ titles: { es: "FREETOUR" } }), "es", {})).toBeNull();
  });

  it("REQ-3428: un proveedor oculto por bandera no aparece (segundo candado del gate C, REQ-3311)", () => {
    const tangol = row({ providerId: "tangol" });
    expect(parseProviderTransfer(tangol, "es", {})).toBeNull();
    expect(parseProviderTransfer(tangol, "es", { TANGOL_ENABLED: "false" })).toBeNull();
    expect(parseProviderTransfer(tangol, "es", { TANGOL_ENABLED: "true" })?.id).toBe("tr-1");
  });

  it("REQ-3428: un registro malo se descarta, no tumba la página", () => {
    expect(parseProviderTransfer(null, "es", {})).toBeNull();
    expect(parseProviderTransfer("x", "es", {})).toBeNull();
    expect(parseProviderTransfer(row({ id: "" }), "es", {})).toBeNull();
    expect(parseProviderTransfer(row({ cityName: null }), "es", {})).toBeNull();
    expect(parseProviderTransfer(row({ countryCode: null }), "es", {})).toBeNull();
    expect(parseProviderTransfer(row({ titles: null }), "es", {})).toBeNull();
    // Precio o reseñas inválidos no descartan: el traslado sale sin precio y con 0 reseñas.
    const sinPrecio = parseProviderTransfer(row({ price: "ocho", reviews: "x", rating: null }), "es", {});
    expect(sinPrecio).toMatchObject({ price: null, reviews: 0, rating: null });
  });

  it("REQ-3428: título en el idioma pedido, con respaldo inglés y español", () => {
    expect(parseProviderTransfer(row(), "en", {})?.title).toBe("CDG airport transfer");
    expect(parseProviderTransfer(row(), "it", {})?.title).toBe("CDG airport transfer");
    expect(parseProviderTransfer(row({ titles: { es: "Solo español" } }), "it", {})?.title).toBe("Solo español");
  });

  it("REQ-3428: la lista cuenta cuántos registros descartó", () => {
    const { ok, dropped } = parseProviderTransfers([row(), row({ id: "tr-2", categoryId: 4 }), null], "es", {});
    expect(ok.map((t) => t.id)).toEqual(["tr-1"]);
    expect(dropped).toBe(2);
  });
});

describe("transferTitle / transferPrice", () => {
  it("REQ-3428: el precio es el público del catálogo, con su moneda; 0 o inválido no se pinta", () => {
    expect(transferPrice(24, "EUR")).toBe("EUR 24");
    expect(transferPrice(24.5, "USD")).toBe("USD 24.50");
    expect(transferPrice(24, null)).toBe("EUR 24");
    expect(transferPrice(0, "EUR")).toBeNull();
    expect(transferPrice(null, "EUR")).toBeNull();
  });
  it("REQ-3428: sin títulos no hay traslado", () => {
    expect(transferTitle({}, "es")).toBeNull();
    expect(transferTitle({ es: "   " }, "es")).toBeNull();
  });
});

describe("complementItems", () => {
  it("REQ-3428: una ciudad con traslado propio y traslado de proveedor muestra los dos, el propio primero", () => {
    const r = complementItems([own("bus-par")], [transfer("tr-1", "Paris", 120)], { city: "París", country: "FR" });
    expect(r.map((x) => x.path)).toEqual(["/viajes/x/bus-par", "/tours/tr-1"]);
    expect(r[1]).toEqual({ id: "tr-1", path: "/tours/tr-1", title: "Traslado tr-1", image: null, price: "EUR 24" });
  });

  it("REQ-3428: una ciudad con solo traslados de proveedor también ofrece complementos", () => {
    const r = complementItems([], [transfer("tr-1", "París", 10), transfer("tr-2", "Lyon", 900)], { city: "Paris", country: "FR" });
    expect(r.map((x) => x.id)).toEqual(["tr-1"]);
  });

  it("REQ-3428: los de proveedor se ordenan por reseñas (desc), luego calificación y luego id", () => {
    const rows = [
      transfer("c", "París", 10, { rating: 4.9 }), transfer("a", "París", 500), transfer("b", "París", 10, { rating: 4.9 }),
      transfer("d", "París", 300),
    ];
    expect(complementItems([], rows, { city: "París", country: "FR" }).map((x) => x.id)).toEqual(["a", "d", "b", "c"]);
  });

  it("REQ-3428: la lista se recorta al máximo y los propios nunca se pierden por el recorte", () => {
    const rows = Array.from({ length: 9 }, (_, i) => transfer(`t${i}`, "París", 100 - i));
    const r = complementItems([own("p1"), own("p2")], rows, { city: "París", country: "FR" });
    expect(r).toHaveLength(MAX_COMPLEMENTS);
    expect(r.slice(0, 2).map((x) => x.id)).toEqual(["p1", "p2"]);
    expect(r.slice(2).map((x) => x.id)).toEqual(["t0", "t1", "t2", "t3"]);
    expect(complementItems([], rows, { city: "París", country: "FR" }, 2).map((x) => x.id)).toEqual(["t0", "t1"]);
  });

  it("REQ-3428: si no hay nada en la ciudad, sirve el mismo país; si tampoco, no hay complementos", () => {
    const rows = [transfer("ly", "Lyon", 10), transfer("ni", "Niza", 20)];
    expect(complementItems([], rows, { city: "Burdeos", country: "FR" }).map((x) => x.id)).toEqual(["ni", "ly"]);
    expect(complementItems([], rows, { city: "Lima", country: "PE" })).toEqual([]);
    expect(complementItems([], [], { city: "París", country: "FR" })).toEqual([]);
  });

  it("REQ-3428: un traslado repetido no sale dos veces", () => {
    const dup = { id: "tr-1", path: "/tours/tr-1", title: "ya estaba", image: null, price: null };
    expect(complementItems([dup], [transfer("tr-1", "París", 5)], { city: "París", country: "FR" })).toEqual([dup]);
  });
});
