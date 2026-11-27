// REQ-10837: ruta /api/agente/detalle sobre el modelo común y el lector de Mila. npx vitest run src/agente/detalle.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import fixture from "../../tests/fixtures/trips/tas-mys-01-malasia-esencial.json";
import freetourFixture from "../../tests/fixtures/freetour/tour-30042-edimburgo.json";
import { freetourToFicha, type FreetourInput } from "@/ficha/adapters/freetour";
import { readMila } from "@/ficha/lib/readers/mila";
import { detalleAgente, proveedorDeViaje } from "./lib/detalle";
import { tripFichaModel } from "@/ficha/lib/trip-input";
import type { StoredTrip } from "@/trips/manage";

vi.mock("@/ficha/source", async (orig) => {
  const real = await orig<typeof import("@/ficha/source")>();
  return { ...real, tripFichaDeps: async () => ({
    tripBySlug: async (slug: string) => (slug === fixture.slug ? { trip: fixture as unknown as StoredTrip, translations: null, agencyName: fixture.agencyName } : null),
    env: { SITE_URL: "https://travelpuzzle.com.mx" }, now: () => new Date("2026-11-20T20:00:00Z"),
  }) };
});
// REQ-10845: la ruta también busca tours; aquí ninguno (los tours se prueban en detalle-tours.test.ts).
vi.mock("@/ficha/source-tour", async (orig) => {
  const real = await orig<typeof import("@/ficha/source-tour")>();
  return { ...real, tourFichaDeps: async () => ({ tourBySlug: async () => null, practicalRow: async () => null, env: {}, now: () => new Date("2026-11-20T20:00:00Z") }) };
});
const { GET: detalle } = await import("@/app/api/agente/detalle/route");

const LLAVE = "k".repeat(32);
const req = (url: string, llave: string | null = LLAVE) => new NextRequest(`https://travelpuzzle.com.mx${url}`, { headers: llave ? { authorization: `Bearer ${llave}` } : {} });
const env = process.env as Record<string, string | undefined>;
beforeEach(() => { env.AGENTE_API_ENABLED = "true"; env.AGENTE_TOKEN = LLAVE; env.SITE_URL = "https://travelpuzzle.com.mx"; });
afterEach(() => { delete env.AGENTE_API_ENABLED; delete env.AGENTE_TOKEN; });
const prov = proveedorDeViaje(fixture.agencyId);

describe("REQ-10837: ficha completa para Mila desde el modelo común", () => {
  it("REQ-10837: misma puerta que la ventana: sin bandera 404, sin llave 401, sin slug 400", async () => {
    env.AGENTE_API_ENABLED = "false";
    expect((await detalle(req(`/api/agente/detalle?slug=${fixture.slug}&proveedores=${prov}`))).status).toBe(404);
    env.AGENTE_API_ENABLED = "true";
    expect((await detalle(req(`/api/agente/detalle?slug=${fixture.slug}&proveedores=${prov}`, null))).status).toBe(401);
    expect((await detalle(req(`/api/agente/detalle?proveedores=${prov}`))).status).toBe(400);
  });
  it("REQ-10837: devuelve la ficha completa con lo mismo que ve el viajero (título, código, lugar, incluye, opciones, cancelación), fotos absolutas y liga", async () => {
    const res = await detalle(req(`/api/agente/detalle?slug=${fixture.slug}&proveedores=propios,${prov}`));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const r = await res.json();
    expect(r).toMatchObject({ slug: fixture.slug, codigo: fixture.code, titulo: fixture.titleEs, proveedor: prov, lugar: "Kuala Lumpur, Malasia", reserva: { modo: "request" } });
    expect(r.incluye.length).toBeGreaterThan(0);
    expect(r.itinerario.length).toBe(fixture.itinerary.length);
    expect(r.fotos.length).toBe(fixture.images.length);
    expect(r.fotos.every((f: { url: string }) => f.url.startsWith("https://travelpuzzle.com.mx/"))).toBe(true);
    expect(r.enlace).toBe(`https://travelpuzzle.com.mx/viajes/malasia/${fixture.slug}#solicitar`);
    expect(r.texto).toContain(fixture.titleEs);
  });
  it("REQ-10837: nunca neto, margen, teléfono ni correo en la respuesta", async () => {
    const r = await (await detalle(req(`/api/agente/detalle?slug=${fixture.slug}&proveedores=${prov}`))).json();
    const s = JSON.stringify(r);
    expect(s).not.toMatch(/neto|netPrice|margen|markup|comision|@[a-z0-9.-]+\.[a-z]{2,}|\+\d{2} ?\d{2} ?\d{4}/i);
  });
  it("REQ-10837: un viaje de un proveedor apagado o un slug desconocido no se entrega (404)", async () => {
    expect((await detalle(req(`/api/agente/detalle?slug=${fixture.slug}&proveedores=propios`))).status).toBe(404);
    expect((await detalle(req(`/api/agente/detalle?slug=no-existe&proveedores=${prov}`))).status).toBe(404);
  });
  it("REQ-10837: FREETOUR nunca llega a Mila: el lector da null y no hay respuesta que armar (decisión 42)", () => {
    const f = freetourToFicha({
      row: freetourFixture as unknown as FreetourInput["row"], translation: freetourFixture.translation,
      city: { slug: freetourFixture.city.slug, name: freetourFixture.city.name }, country: freetourFixture.country, lang: "es",
      taxonomy: { tipo: null, temas: [], atributos: [] }, map: null,
    });
    expect(readMila(f, { path: "/destinos/gb/edimburgo/x" })).toBeNull();
  });
  it("REQ-10837: el armado puro traduce la vista del lector a las llaves que Mila ya consume (titulo, fotos, enlace, incluye)", () => {
    const f = tripFichaModel({ trip: fixture as unknown as StoredTrip, translations: null, agencyName: fixture.agencyName }, { lang: "es", env: {}, siteUrl: "https://travelpuzzle.com.mx" });
    const read = readMila(f, { path: "/viajes/malasia/x" })!;
    const d = detalleAgente(f, read, { base: "https://travelpuzzle.com.mx", agencyId: null });
    expect(d.proveedor).toBe("propios");
    expect(d.enlace).toBe("https://travelpuzzle.com.mx/viajes/malasia/x#solicitar");
    expect(d.fotos[0].url).toMatch(/^https:\/\//);
    expect(d.texto).toBe(read.text);
  });
});
