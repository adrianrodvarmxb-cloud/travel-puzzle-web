// REQ-10845: /api/agente/detalle también entrega tours de Tangol (decisión 40) desde el modelo común. npx vitest run src/agente/detalle-tours.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import tangol from "../../tests/fixtures/tangol/tour-43-glaciar-perito-moreno.json";
import type { TourRowWithRelations } from "@/ficha/lib/tour-input";
import { listaProveedores, FREETOUR } from "./lib/catalogo";
import { detalleAgente } from "./lib/detalle";
import { tourFichaModel } from "@/ficha/lib/tour-input";
import { readMila } from "@/ficha/lib/readers/mila";

const { translation, city, country, whatToBring, physicalRequirements, difficulty, providerNotes, childAgeFrom, childAgeTo, ...tour } = tangol;
const row = (): TourRowWithRelations => ({
  ...tour,
  translations: [{ language: "es", title: translation.title, brief: translation.brief, description: translation.description }],
  city: { slug: city.slug, translations: { es: city.name }, lat: -50.34, lng: -72.26 },
  country: { code: "ARG", iso2: country.code, translations: { es: country.name } },
} as unknown as TourRowWithRelations);
const practical = { whatToBring, physicalRequirements, difficulty, providerNotes, childAgeFrom, childAgeTo };

vi.mock("@/ficha/source", async (orig) => {
  const real = await orig<typeof import("@/ficha/source")>();
  return { ...real, tripFichaDeps: async () => ({ tripBySlug: async () => null, env: { SITE_URL: "https://travelpuzzle.com.mx" }, now: () => new Date("2026-11-21T09:00:00Z") }) };
});
vi.mock("@/ficha/source-tour", async (orig) => {
  const real = await orig<typeof import("@/ficha/source-tour")>();
  return { ...real, tourFichaDeps: async () => ({
    tourBySlug: async (slug: string) => (slug === tangol.slug ? row() : null),
    practicalRow: async () => practical,
    env: { SITE_URL: "https://travelpuzzle.com.mx", ZONE_MAP_ENABLED: "true" }, now: () => new Date("2026-11-21T09:00:00Z"),
  }) };
});
const { GET: detalle } = await import("@/app/api/agente/detalle/route");

const LLAVE = "k".repeat(32);
const req = (url: string) => new NextRequest(`https://travelpuzzle.com.mx${url}`, { headers: { authorization: `Bearer ${LLAVE}` } });
const env = process.env as Record<string, string | undefined>;
beforeEach(() => { env.AGENTE_API_ENABLED = "true"; env.AGENTE_TOKEN = LLAVE; env.SITE_URL = "https://travelpuzzle.com.mx"; });
afterEach(() => { delete env.AGENTE_API_ENABLED; delete env.AGENTE_TOKEN; });

describe("REQ-10845: Mila ve e informa sobre los tours de Tangol (decisión 40)", () => {
  it("REQ-10845: con `tangol` entre los proveedores encendidos, el slug de un tour devuelve la ficha completa y la liga a la ficha pública", async () => {
    const res = await detalle(req(`/api/agente/detalle?slug=${tangol.slug}&proveedores=propios,tangol`));
    expect(res.status).toBe(200);
    const r = await res.json();
    expect(r).toMatchObject({ slug: tangol.slug, titulo: "Glaciar Perito Moreno", proveedor: "tangol", lugar: "El Calafate, Argentina", operador: "Tangol Tours", reserva: { modo: "request" } });
    expect(r.codigo).toMatch(/43/);
    expect(r.queLlevar).toHaveLength(4);
    expect(r.fotos.length).toBe(6);
    expect(r.fotos.every((f: { url: string }) => f.url.startsWith("https://"))).toBe(true);
    expect(r.enlace).toMatch(/^https:\/\/travelpuzzle\.com\.mx\/destinos\/ar\/el-calafate\/glaciar-perito-moreno/);
    expect(r.texto).toContain("Glaciar Perito Moreno");
  });
  it("REQ-10845: sin `tangol` entre los proveedores encendidos, el tour no se entrega (404), igual que un viaje de agencia apagada", async () => {
    expect((await detalle(req(`/api/agente/detalle?slug=${tangol.slug}&proveedores=propios`))).status).toBe(404);
  });
  it("REQ-10845: nunca neto, margen, teléfono ni correo; el aviso del proveedor (nota de Tangol) tampoco sale como teléfono", async () => {
    const r = await (await detalle(req(`/api/agente/detalle?slug=${tangol.slug}&proveedores=tangol`))).json();
    expect(JSON.stringify(r)).not.toMatch(/neto|netPrice|margen|markup|comision|@[a-z0-9.-]+\.[a-z]{2,}|\+\d{2} ?\d{2} ?\d{4}/i);
  });
  it("REQ-10845: `listaProveedores` ofrece `tangol` solo cuando el sitio lo tiene encendido (TANGOL_ENABLED), antes de FREETOUR bloqueado", () => {
    expect(listaProveedores([{ id: "a", name: "A" }], { tangol: true }).map((p) => p.id)).toEqual(["propios", "agencia:a", "tangol", FREETOUR]);
    expect(listaProveedores([{ id: "a", name: "A" }], { tangol: false }).map((p) => p.id)).toEqual(["propios", "agencia:a", FREETOUR]);
    expect(listaProveedores([]).map((p) => p.id)).toEqual(["propios", FREETOUR]);
  });
  it("REQ-10845: el armado puro etiqueta el proveedor del tour con su id (no `propios`)", () => {
    const f = tourFichaModel({ tour: row(), practical }, { lang: "es", env: {} })!;
    const read = readMila(f, { path: "/destinos/ar/el-calafate/glaciar-perito-moreno" })!;
    const d = detalleAgente(f, read, { base: "https://travelpuzzle.com.mx", agencyId: null, proveedor: "tangol" });
    expect(d.proveedor).toBe("tangol");
    expect(d.operador).toBe("Tangol Tours");
  });
});
