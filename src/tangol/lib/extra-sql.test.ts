import { describe, it, expect } from "vitest";
import { tangolExtraStatements, tangolExtraStatementsAcotadas, MAX_STMT_BYTES, TANGOL_EXTRA_COLUMNS } from "./extra-sql";
import type { TangolTourRow } from "./tour-rows";

const fila = (externalId: number, over: Partial<TangolTourRow> = {}): TangolTourRow => ({
  providerId: "tangol", externalId, providerTitle: "Travel Puzzle", providerPhone: null, priceValue: 22, priceCurrency: "USD",
  duration: "3 Horas", durationMinutes: 180, titleImageURL: null, categoryId: 0, rating: 4.7, reviewsNumber: 120,
  cityId: 10, countryId: 1, meetingPoint: { title: "Obelisco", coordinates: "", googlePlaceId: "" }, includes: ["Guía"], POIs: null, images: [], videoURL: null,
  isActive: true, lastSeenAt: new Date("2026-11-13T18:00:00Z"),
  excludes: ["Propinas"], cancellationPolicy: "Sin cargo hasta 48 h antes.", guideLanguages: ["es", "en"],
  availabilityRules: { options: [{ code: "REG", startTime: "09:00", operationDays: [1, 3, 5], operationDaysRaw: "L, X, V", hoursBooking: 48, hoursCancelation: 24 }], validity: [], blackouts: [] },
  ...over,
});

describe("REQ-10514: UPDATE de las columnas de la 0031 y guideLanguages por tour", () => {
  it("REQ-10514: una sentencia por tour, acotada a (proveedor, número), con los JSON como texto", () => {
    const stmts = tangolExtraStatements([fila(12345), fila(999, { excludes: [], cancellationPolicy: null, availabilityRules: null, guideLanguages: [] })]);
    expect(stmts).toHaveLength(2);
    expect(stmts[0].sql).toBe(
      'UPDATE "Tour" SET "excludes" = ?, "cancellationPolicy" = ?, "availabilityRules" = ?, "guideLanguages" = ? WHERE "providerId" = ? AND "externalId" = ?'
    );
    expect(stmts[0].params).toEqual([
      '["Propinas"]',
      "Sin cargo hasta 48 h antes.",
      JSON.stringify(fila(12345).availabilityRules),
      '["es","en"]',
      "tangol",
      12345,
    ]);
    expect(stmts[1].params).toEqual(["[]", null, null, "[]", "tangol", 999]);
  });

  it("REQ-10514: las columnas que escribe son exactamente las de la migración 0031 más guideLanguages", () => {
    expect(TANGOL_EXTRA_COLUMNS).toEqual(["excludes", "cancellationPolicy", "availabilityRules", "guideLanguages"]);
  });

  it("REQ-10514: sin filas, sin sentencias", () => {
    expect(tangolExtraStatements([])).toEqual([]);
  });
});

describe("REQ-10525: ninguna sentencia pasa el límite de D1 (100 KB); un tour enorme no tumba la escritura de todos", () => {
  it("REQ-10525: reglas de disponibilidad que no caben se escriben como NULL y se reportan; el resto del tour se escribe", () => {
    const blackouts = Array.from({ length: 6000 }, (_, i) => ({ from: `2${String(i).padStart(3, "0")}-01-01`, to: `2${String(i).padStart(3, "0")}-01-02` }));
    const grande = fila(2490, { availabilityRules: { options: [], validity: [], blackouts } });
    const chico = fila(7);
    const { stmts, recortados } = tangolExtraStatementsAcotadas([grande, chico]);
    expect(stmts).toHaveLength(2);
    const bytes = (s: { sql: string; params: unknown[] }) => s.sql.length + s.params.reduce<number>((n, p) => n + String(p ?? "").length, 0);
    for (const s of stmts) expect(bytes(s)).toBeLessThan(MAX_STMT_BYTES);
    expect(stmts[0].params[2]).toBeNull(); // availabilityRules del tour grande
    expect(stmts[0].params[0]).toBe(JSON.stringify(["Propinas"])); // lo demás del tour sí se escribe
    expect(stmts[1].params[2]).toBe(JSON.stringify(chico.availabilityRules));
    expect(recortados).toEqual([2490]);
  });
  it("REQ-10525: tangolExtraStatements sigue devolviendo lo mismo que antes para filas normales", () => {
    expect(tangolExtraStatementsAcotadas([fila(1)]).stmts).toEqual(tangolExtraStatements([fila(1)]));
  });
});
