import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { experienciasDisponibles } from "./available";
import { catalogExperiencesTotal } from "./available-catalog";
import type { CatalogEntry } from "@/catalog/lib/query";

// REQ-1346 (INC-008): un solo total «experiencias disponibles» = tours de Experiencias (sin transporte) + viajes sin transporte.
const entry = (id: string, formato: string): CatalogEntry => ({ id, cityId: 1, countryId: 1, categoryId: 1, price: 0, rating: null, reviews: 0, durationMinutes: 60, createdAt: 0, updatedAt: 0, text: "", formato });

describe("REQ-1346: un solo total de experiencias", () => {
  it("REQ-1346: tours + viajes, sin transporte (8,024 + 236 = 8,260)", () => {
    const trips = [...Array(236).fill({ kind: "circuito" }), ...Array(33).fill({ kind: "transporte" })];
    expect(experienciasDisponibles(8024, trips)).toBe(8260);
  });
  it("REQ-1346: un viaje de tipo tour con formato de transporte (Louvre + bus turístico) tampoco cuenta: no tiene chip", () => {
    const trips = [{ kind: "tour", formato: "visita-guiada" }, { kind: "tour", formato: "transporte" }, { kind: "tour", formato: "traslado" }, { kind: "circuito" }];
    expect(experienciasDisponibles(10, trips)).toBe(12);
  });
  it("REQ-1346: el total de tours es el mismo índice que lista /tours (sin traslados ni por revisar)", () => {
    const entries = [entry("a", "pieza-libre"), entry("b", "caminata"), entry("c", "traslado"), entry("d", "en-linea"), entry("e", "por-revisar")];
    const n = catalogExperiencesTotal(entries, true);
    expect(n).toBe(3); // pieza-libre, caminata y en-linea (REQ-1262); fuera traslado y por-revisar
    expect(catalogExperiencesTotal(entries, false)).toBe(5); // bandera apagada: como lista /tours sin taxonomía
  });
  it("REQ-1346: el inicio, el encabezado de /tours y el filtro usan la misma función", () => {
    expect(readFileSync("src/app/page.tsx", "utf8")).toContain("experienciasDisponibles(");
    const client = readFileSync("src/components/tours/ToursPageClient.tsx", "utf8");
    expect(client).toMatch(/total=\{experienciasDisponibles\(/);
  });
});
