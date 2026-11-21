// REQ-10849: /api/agente/buscar también encuentra tours de Tangol (decisión 40) desde el índice ligero del modelo común.
// npx vitest run src/agente/buscar-tours.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import tangol from "../../tests/fixtures/tangol/tour-43-glaciar-perito-moreno.json";
import { aTourAgente, buscarViajes, proveedorDe, FREETOUR, type TourIndiceRow, type ViajeAgente } from "./lib/catalogo";

const fila = (o: Partial<TourIndiceRow> = {}): TourIndiceRow => ({
  id: tangol.id, slug: tangol.slug, providerId: "tangol", title: tangol.translation.title, brief: tangol.translation.brief,
  priceValue: tangol.priceValue, priceCurrency: tangol.priceCurrency, durationMinutes: tangol.durationMinutes, departureDates: "[]",
  citySlug: tangol.city.slug, cityTranslations: JSON.stringify({ es: tangol.city.name, en: "El Calafate" }),
  countryIso2: tangol.country.code, countryTranslations: JSON.stringify({ es: tangol.country.name, en: "Argentina" }),
  ...o,
});

const viaje = (o: Partial<ViajeAgente>): ViajeAgente => ({ slug: "x", path: "/viajes/mexico/x", title: "Tour", summary: "", places: "México", cities: [], kind: "tour",
  agencyId: null, price: "$1,000 MXN", durationDays: 1, dates: [], ...o });

vi.mock("@/agente/catalogo", async (orig) => {
  const real = await orig<typeof import("./catalogo")>();
  return { ...real, catalogoDeps: async () => ({
    tarjetas: async () => [{ path: "/viajes/argentina/patagonia-completa", title: "Patagonia completa", summary: "Glaciares y El Calafate", places: "Argentina", cities: ["El Calafate"], kind: "tour",
      agencyId: null, price: { main: "$45,000 MXN" }, durationDays: 7, dates: ["2027-01-10"] }],
    agencias: async () => [],
    tours: async () => [fila(), fila({ id: "t2", slug: "ushuaia-tren-fin-del-mundo", title: "Tren del Fin del Mundo", brief: "<p>Ushuaia</p>", citySlug: "ushuaia", cityTranslations: JSON.stringify({ es: "Ushuaia" }), priceValue: 60 })],
  }) };
});
const { GET: buscar } = await import("@/app/api/agente/buscar/route");

const LLAVE = "k".repeat(32);
const req = (url: string) => new NextRequest(`https://travelpuzzle.com.mx${url}`, { headers: { authorization: `Bearer ${LLAVE}` } });
const env = process.env as Record<string, string | undefined>;
beforeEach(() => { env.AGENTE_API_ENABLED = "true"; env.AGENTE_TOKEN = LLAVE; env.SITE_URL = "https://travelpuzzle.com.mx"; });
afterEach(() => { delete env.AGENTE_API_ENABLED; delete env.AGENTE_TOKEN; });

describe("REQ-10849: el índice de tours entra a la búsqueda del agente como un viaje más (puro)", () => {
  it("REQ-10849: una fila del índice se vuelve un ViajeAgente con proveedor `tangol`, ruta pública, precio público y resumen sin HTML", () => {
    const v = aTourAgente(fila(), "es")!;
    expect(v).toMatchObject({ slug: "glaciar-perito-moreno", path: "/destinos/ar/el-calafate/glaciar-perito-moreno", title: "Glaciar Perito Moreno", places: "Argentina", cities: ["El Calafate"], kind: "tour", agencyId: null, durationDays: 1, dates: [] });
    expect(v.summary).toContain("Glaciar Perito Moreno");
    expect(v.summary).not.toMatch(/<[a-z]/i);
    expect(v.price).toMatch(/98/);
    expect(v.price).toMatch(/USD|US\$/);
    expect(proveedorDe(v)).toBe("tangol");
  });
  it("REQ-10849: sin slug, ciudad o país la fila no sirve (null) y nunca sale de FREETOUR", () => {
    expect(aTourAgente(fila({ slug: null }), "es")).toBeNull();
    expect(aTourAgente(fila({ citySlug: null }), "es")).toBeNull();
    expect(aTourAgente(fila({ countryIso2: null }), "es")).toBeNull();
    expect(aTourAgente(fila({ providerId: FREETOUR }), "es")).toBeNull();
  });
  it("REQ-10849: `buscarViajes` solo lo encuentra con `tangol` entre los proveedores encendidos; los viajes siguen con `propios`", () => {
    const cat = [viaje({ slug: "oaxaca", title: "Oaxaca mágico", cities: ["Oaxaca"] }), aTourAgente(fila(), "es")!];
    expect(buscarViajes(cat, { q: "calafate", proveedores: ["propios", "tangol"] }).map((r) => r.slug)).toEqual(["glaciar-perito-moreno"]);
    expect(buscarViajes(cat, { q: "calafate", proveedores: ["propios"] })).toEqual([]);
    expect(buscarViajes(cat, { q: "oaxaca", proveedores: ["tangol"] })).toEqual([]);
  });
});

describe("REQ-10849: /api/agente/buscar mezcla viajes y tours de Tangol", () => {
  it("REQ-10849: con `tangol` encendido, buscar «El Calafate» trae el viaje propio y el tour, cada uno con su proveedor y su liga", async () => {
    const r = await (await buscar(req("/api/agente/buscar?q=algo en el calafate&proveedores=propios,tangol"))).json();
    const porSlug = Object.fromEntries(r.resultados.map((x: { slug: string }) => [x.slug, x]));
    expect(porSlug["patagonia-completa"]).toMatchObject({ proveedor: "propios", enlace: "https://travelpuzzle.com.mx/viajes/argentina/patagonia-completa#solicitar" });
    expect(porSlug["glaciar-perito-moreno"]).toMatchObject({ proveedor: "tangol", tipo: "tour", precio: expect.stringMatching(/98/), enlace: expect.stringMatching(/^https:\/\/travelpuzzle\.com\.mx\/destinos\/ar\/el-calafate\/glaciar-perito-moreno/) });
    expect(porSlug["ushuaia-tren-fin-del-mundo"]).toBeUndefined();
  });
  it("REQ-10849: sin `tangol` entre los proveedores encendidos no sale ningún tour (igual que una agencia apagada)", async () => {
    const r = await (await buscar(req("/api/agente/buscar?q=calafate&proveedores=propios"))).json();
    expect(r.resultados.map((x: { slug: string }) => x.slug)).toEqual(["patagonia-completa"]);
  });
  it("REQ-10849: nunca neto, margen, teléfono ni correo en los resultados", async () => {
    const r = await (await buscar(req("/api/agente/buscar?q=ushuaia&proveedores=tangol"))).json();
    expect(r.resultados.map((x: { slug: string }) => x.slug)).toEqual(["ushuaia-tren-fin-del-mundo"]);
    expect(JSON.stringify(r)).not.toMatch(/neto|netPrice|margen|markup|comision|@[a-z0-9.-]+\.[a-z]{2,}|\+\d{2} ?\d{2} ?\d{4}/i);
  });
});
