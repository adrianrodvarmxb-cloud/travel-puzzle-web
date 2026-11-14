import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { freetourSourceId } from "./provider-source";

describe("REQ-10578: reseñas, eventos y datos de FREETOUR solo para tours de FREETOUR (INC-021)", () => {
  // Caso real: Tangol 47 «Balcón de Calafate en 4x4» pintaba 772 reseñas del free tour 47 de Bruselas.
  it("REQ-10578: un tour de FREETOUR (o sin proveedor, datos viejos) usa su número", () => {
    expect(freetourSourceId("freetour", 47)).toBe(47);
    expect(freetourSourceId(null, 47)).toBe(47);
    expect(freetourSourceId(undefined, 6782)).toBe(6782);
  });
  it("REQ-10578: un tour de otro proveedor con el mismo número NO consulta nada de FREETOUR", () => {
    expect(freetourSourceId("tangol", 47)).toBeNull();
    expect(freetourSourceId("otro", 1)).toBeNull();
  });
  it("REQ-10578: sin número no hay consulta", () => {
    expect(freetourSourceId("freetour", null)).toBeNull();
    expect(freetourSourceId("freetour", 0)).toBeNull();
  });
  it("REQ-10578: la carga de la ficha, el cliente y el refresco de reseñas usan la regla", () => {
    const props = readFileSync("src/tours/detail-props.ts", "utf8");
    expect(props).toContain("freetourSourceId(");
    expect(props).not.toMatch(/loadTourReviews\(externalId,/);
    const client = readFileSync("src/components/tours/one/TourDetailClient.tsx", "utf8");
    expect(client.match(/freetourSourceId\(/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(client).not.toMatch(/useEventsByTourFTData\(tour\?\.externalId/);
    const repo = readFileSync("src/reviews/repository.ts", "utf8");
    expect(repo).toMatch(/isActive: true, reviewsNumber: \{ gt: 0 \}, providerId: "freetour"/);
  });
});
