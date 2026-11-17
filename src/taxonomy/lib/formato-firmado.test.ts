// REQ-10756: el formato firmado por el PO viaje por viaje gana sobre la regla por título (decisión 13, lista REQ-10748).
// npx vitest run src/taxonomy/lib/formato-firmado.test.ts
import { describe, expect, it } from "vitest";
import { formatoFirmado, FORMATO_FIRMADO } from "./formato-firmado";
import { tripFormatDecision } from "@/tours/lib/card-format";
import { idFor } from "@/trips/lib/bulk-import";

describe("REQ-10756: formato firmado por viaje", () => {
  it("REQ-10756: los dos viajes firmados el 17-11-2026 pasan a circuito; un viaje sin firma devuelve null", () => {
    expect(formatoFirmado("iwp-prog-trk-05")).toBe("circuito");
    expect(formatoFirmado("iwp-mp-04")).toBe("circuito");
    expect(formatoFirmado("iwp-lim-07")).toBeNull();
    expect(formatoFirmado(undefined)).toBeNull();
  });

  it("REQ-10756: las claves son Trip.id reales (idFor(initials, ref)) y cada firma trae fecha y respuesta literal", () => {
    expect(idFor("IWP", "PROG-TRK-05")).toBe("iwp-prog-trk-05");
    expect(idFor("IWP", "MP-04")).toBe("iwp-mp-04");
    for (const [id, v] of Object.entries(FORMATO_FIRMADO.viajes)) {
      expect(id).toBe(idFor(id.split("-")[0].toUpperCase(), v.ref));
      expect(v.firma).toMatch(/PO, \d{2}-\d{2}-\d{4}.*«/);
    }
  });

  it("REQ-10756: tripFormatDecision usa la firma cuando recibe el id y sigue igual sin él", () => {
    const lares = { kind: "personalizado", priceFrom: 900, durationDays: 5, titles: ["Lares Trek y Machu Picchu 5 días"] };
    expect(tripFormatDecision(lares).valor).toBe("a-la-medida");
    const con = tripFormatDecision({ ...lares, id: "iwp-prog-trk-05" });
    expect(con.valor).toBe("circuito");
    expect(con.regla).toMatch(/firma del PO/);
    expect(tripFormatDecision({ ...lares, id: "iwp-prog-trk-99" }).valor).toBe("a-la-medida");
  });
});

// REQ-10757: firma de Extime por bloques (17-11-2026): 24 cambian, 18 se quedan como hoy.
describe("REQ-10757: formato firmado de Extime", () => {
  it("REQ-10757: 24 viajes de Extime firmados (18 excursiones, 4 boletos, NDML visita guiada, CAA entradas) y 18 anotados como «se quedan»", () => {
    const ext = Object.entries(FORMATO_FIRMADO.viajes).filter(([, v]) => v.proveedor === "extime");
    expect(ext).toHaveLength(24);
    expect(ext.filter(([, v]) => v.formato === "excursion-dia")).toHaveLength(18);
    expect(ext.filter(([, v]) => v.formato === "entradas").map(([, v]) => v.ref).sort()).toEqual(["BBM", "BBP", "BVPN", "CAA", "ORC"]);
    expect(formatoFirmado(idFor("EXT", "NDML"))).toBe("visita-guiada");
    expect(Object.keys(FORMATO_FIRMADO.seQuedanComoHoy).filter((k) => k.startsWith("ext-"))).toHaveLength(18);
  });
  it("REQ-10757: lo que el PO dejó como hoy no tiene firma de cambio (VAC, transportes, bicitaxi, combos, comidas en la torre)", () => {
    for (const r of ["VAC", "NAVV", "NAVVJ", "ND", "ASN", "MFP", "TRT", "TRTM", "TRTS", "TRTE", "CDT", "CDTM", "CDTMC", "DJT", "MLTRT", "TEADJ", "TEA3DJ", "DJTEHB"]) {
      expect(formatoFirmado(idFor("EXT", r)), r).toBeNull();
      expect(FORMATO_FIRMADO.seQuedanComoHoy[idFor("EXT", r)], r).toMatch(/PO, 17-11-2026/);
    }
  });
});
