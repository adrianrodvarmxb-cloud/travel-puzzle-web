// REQ-122..126: la ventana del agente con la bandera, la llave y los interruptores. npx vitest run src/agente/rutas.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/agente/catalogo", async (orig) => {
  const real = await orig<typeof import("./catalogo")>();
  const card = (o: object) => ({ path: "/viajes/mexico/x", title: "Tour", summary: "", places: "México", cities: [], kind: "tour", agencyId: null,
    price: { main: "$1,000 MXN" }, durationDays: 1, dates: [], ...o });
  return { ...real, catalogoDeps: async () => ({
    tarjetas: async () => [card({ path: "/viajes/mexico/oaxaca", title: "Oaxaca mágico", cities: ["Oaxaca"], dates: ["2026-11-20"] }),
      card({ path: "/viajes/peru/cusco", title: "Cusco", cities: ["Cusco"], agencyId: "ag1" })],
    agencias: async () => [{ id: "ag1", name: "Agencia Uno" }] }) };
});
const { GET: buscar } = await import("@/app/api/agente/buscar/route");
const { GET: proveedores } = await import("@/app/api/agente/proveedores/route");
const { GET: viaje } = await import("@/app/api/agente/viaje/route");

const LLAVE = "k".repeat(32);
const req = (url: string, llave: string | null = LLAVE) => new NextRequest(`https://travelpuzzle.com.mx${url}`, { headers: llave ? { authorization: `Bearer ${llave}` } : {} });
const env = process.env as Record<string, string | undefined>;
beforeEach(() => { env.AGENTE_API_ENABLED = "true"; env.AGENTE_TOKEN = LLAVE; env.SITE_URL = "https://travelpuzzle.com.mx"; });
afterEach(() => { delete env.AGENTE_API_ENABLED; delete env.AGENTE_TOKEN; });

describe("REQ-126: bandera y llave", () => {
  it("REQ-126: con la bandera apagada no existe (404)", async () => {
    env.AGENTE_API_ENABLED = "false";
    expect((await buscar(req("/api/agente/buscar?q=oaxaca&proveedores=propios"))).status).toBe(404);
  });
  it("REQ-126: sin llave o con otra llave: 401", async () => {
    expect((await buscar(req("/api/agente/buscar?q=oaxaca&proveedores=propios", null))).status).toBe(401);
    expect((await proveedores(req("/api/agente/proveedores", "x".repeat(32)))).status).toBe(401);
  });
});

describe("REQ-122/123: proveedores y búsqueda", () => {
  it("REQ-122: lista los proveedores con FREETOUR bloqueado", async () => {
    const r = await (await proveedores(req("/api/agente/proveedores"))).json();
    expect(r.proveedores.map((p: { id: string }) => p.id)).toEqual(["propios", "agencia:ag1", "freetour"]);
  });
  it("REQ-123: busca solo en los proveedores encendidos y regresa la liga a la ficha", async () => {
    const r = await (await buscar(req("/api/agente/buscar?q=oaxaca&proveedores=propios,agencia:ag1"))).json();
    expect(r.resultados).toHaveLength(1);
    expect(r.resultados[0]).toMatchObject({ slug: "oaxaca", proveedor: "propios", precio: "$1,000 MXN", enlace: "https://travelpuzzle.com.mx/viajes/mexico/oaxaca#solicitar" });
    expect((await (await buscar(req("/api/agente/buscar?q=cusco&proveedores=propios"))).json()).resultados).toEqual([]);
  });
});

describe("REQ-124/125: revisión en vivo y liga prellenada", () => {
  it("REQ-125: fecha que sí sale → liga con fecha y personas", async () => {
    const r = await (await viaje(req("/api/agente/viaje?slug=oaxaca&proveedores=propios&fecha=2026-11-20&adultos=2&ninos=1"))).json();
    expect(r.fecha).toEqual({ disponible: true, alternativas: [] });
    expect(r.enlace).toBe("https://travelpuzzle.com.mx/viajes/mexico/oaxaca?fecha=2026-11-20&adultos=2&ninos=1#solicitar");
  });
  it("REQ-125: fecha que no sale → alternativas y la liga sin esa fecha", async () => {
    const r = await (await viaje(req("/api/agente/viaje?slug=oaxaca&proveedores=propios&fecha=2026-11-21&adultos=2"))).json();
    expect(r.fecha).toEqual({ disponible: false, alternativas: ["2026-11-20"] });
    expect(r.enlace).toBe("https://travelpuzzle.com.mx/viajes/mexico/oaxaca?adultos=2#solicitar");
  });
  it("REQ-122: un viaje de un proveedor apagado no se entrega", async () => {
    expect((await viaje(req("/api/agente/viaje?slug=cusco&proveedores=propios"))).status).toBe(404);
  });
});
