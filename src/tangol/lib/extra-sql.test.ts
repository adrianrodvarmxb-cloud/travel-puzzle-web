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
  endPoint: "Plaza de Mayo", whatToBring: "Agua", physicalRequirements: "Caminar 2 km", difficulty: "Baja", providerNotes: "Sale con lluvia.",
  childAgeFrom: 3, childAgeTo: 11, infantAgeFrom: 0, infantAgeTo: 2,
  ...over,
});

describe("REQ-10514: UPDATE de las columnas de la 0031 y guideLanguages por tour", () => {
  it("REQ-10514: una sentencia por tour, acotada a (proveedor, número), con los JSON como texto", () => {
    // REQ-10537 / REQ-10538: el mismo UPDATE ahora también escribe las 9 columnas de la 0032.
    const vacia = { excludes: [], cancellationPolicy: null, availabilityRules: null, guideLanguages: [], endPoint: null, whatToBring: null, physicalRequirements: null, difficulty: null, providerNotes: null, childAgeFrom: null, childAgeTo: null, infantAgeFrom: null, infantAgeTo: null };
    const stmts = tangolExtraStatements([fila(12345), fila(999, vacia)]);
    expect(stmts).toHaveLength(2);
    expect(stmts[0].sql).toBe(
      'UPDATE "Tour" SET "excludes" = ?, "cancellationPolicy" = ?, "availabilityRules" = ?, "guideLanguages" = ?, "endPoint" = ?, "whatToBring" = ?, "physicalRequirements" = ?, "difficulty" = ?, "providerNotes" = ?, "childAgeFrom" = ?, "childAgeTo" = ?, "infantAgeFrom" = ?, "infantAgeTo" = ? WHERE "providerId" = ? AND "externalId" = ?'
    );
    expect(stmts[0].params).toEqual([
      '["Propinas"]',
      "Sin cargo hasta 48 h antes.",
      JSON.stringify(fila(12345).availabilityRules),
      '["es","en"]',
      "Plaza de Mayo", "Agua", "Caminar 2 km", "Baja", "Sale con lluvia.", 3, 11, 0, 2,
      "tangol",
      12345,
    ]);
    expect(stmts[1].params).toEqual(["[]", null, null, "[]", null, null, null, null, null, null, null, null, null, "tangol", 999]);
  });

  it("REQ-10514: las columnas que escribe son exactamente las de la migración 0031 más guideLanguages y (REQ-10537) las de la 0032", () => {
    expect(TANGOL_EXTRA_COLUMNS).toEqual([
      "excludes", "cancellationPolicy", "availabilityRules", "guideLanguages",
      "endPoint", "whatToBring", "physicalRequirements", "difficulty", "providerNotes", "childAgeFrom", "childAgeTo", "infantAgeFrom", "infantAgeTo",
    ]);
  });

  it("REQ-10537: cada columna de la 0032 está en la migración (no se escribe una columna que no existe)", async () => {
    const { readFileSync } = await import("node:fs");
    const sql = readFileSync("migrations/0032_tour_info_practica.sql", "utf8");
    for (const c of TANGOL_EXTRA_COLUMNS.slice(4)) expect(sql).toContain(`ADD COLUMN "${c}"`);
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
  it("REQ-10537: si aun sin reglas no cabe (textos enormes del proveedor), los textos largos van en NULL y se reporta; nunca pasa el tope", () => {
    const enorme = "x".repeat(40_000);
    const t = fila(77, { whatToBring: enorme, providerNotes: enorme, physicalRequirements: enorme });
    const { stmts, recortados } = tangolExtraStatementsAcotadas([t]);
    const bytes = (s: { sql: string; params: unknown[] }) => s.sql.length + s.params.reduce<number>((n, p) => n + String(p ?? "").length, 0);
    expect(bytes(stmts[0])).toBeLessThan(MAX_STMT_BYTES);
    expect(recortados).toEqual([77]);
    const p = Object.fromEntries(TANGOL_EXTRA_COLUMNS.map((c, i) => [c, stmts[0].params[i]]));
    expect(p).toMatchObject({ whatToBring: null, providerNotes: null, physicalRequirements: null, endPoint: "Plaza de Mayo", childAgeFrom: 3, excludes: '["Propinas"]' });
  });

  it("REQ-10525: tangolExtraStatements sigue devolviendo lo mismo que antes para filas normales", () => {
    expect(tangolExtraStatementsAcotadas([fila(1)]).stmts).toEqual(tangolExtraStatements([fila(1)]));
  });
});
