// REQ-10944 (ola 12, PR 2, paso 3): precio público y traslado de cada opción de Tangol desde TourOption.
// npx vitest run src/ficha/lib/option-records.test.ts
import { describe, expect, it } from "vitest";
import { optionsWithRecords, tourOptionRecord } from "./option-records";
import { transferAddonFromOptions } from "./addons";
import type { FichaOption } from "./model";

const opciones: FichaOption[] = [
  { id: "CT", name: "Glaciar · 08:00", price: null, transferIncluded: null, startTime: "08:00" },
  { id: "ST", name: "Glaciar · 08:30", price: null, transferIncluded: null, startTime: "08:30" },
  { id: "ZZ", name: "Glaciar", price: null, transferIncluded: null, startTime: null },
];
const filas = [
  { code: "CT", description: "Con traslado", startTime: "08:00", currency: "usd", rackAdult: 52, transferIncluded: 1 },
  { code: "ST", description: "Sin traslado", startTime: "08:30", currency: "USD", rackAdult: 40, transferIncluded: 0 },
  { code: "NU", description: "Nueva en Tangol", startTime: "14:00", currency: "USD", rackAdult: 45, transferIncluded: null },
  { code: "", description: "sin código", startTime: null, currency: null, rackAdult: null, transferIncluded: null },
];

describe("REQ-10944: registros de TourOption en la ficha", () => {
  it("REQ-10944: una fila cruda se tipa (1/0/null → true/false/null, moneda en mayúsculas); sin código, null", () => {
    expect(tourOptionRecord(filas[0])).toEqual({ code: "CT", description: "Con traslado", startTime: "08:00", currency: "USD", rackAdult: 52, transferIncluded: true });
    expect(tourOptionRecord(filas[1])?.transferIncluded).toBe(false);
    expect(tourOptionRecord(filas[2])?.transferIncluded).toBeNull();
    expect(tourOptionRecord(filas[3])).toBeNull();
    expect(tourOptionRecord(null)).toBeNull();
    expect(tourOptionRecord({ code: "A", rackAdult: "12.5", transferIncluded: true })).toMatchObject({ rackAdult: 12.5, transferIncluded: true, currency: null });
  });

  it("REQ-10944: las opciones toman precio público y traslado de su fila por código; sin fila no cambian; una fila sin opción se suma al final", () => {
    const recs = filas.map(tourOptionRecord).filter((r) => r !== null);
    const out = optionsWithRecords(opciones, recs, "Glaciar");
    expect(out.map((o) => o.id)).toEqual(["CT", "ST", "ZZ", "NU"]);
    expect(out[0]).toEqual({ id: "CT", name: "Glaciar · 08:00", price: { amount: 52, currency: "USD", per: "person" }, transferIncluded: true, startTime: "08:00" });
    expect(out[1]).toMatchObject({ price: { amount: 40, currency: "USD", per: "person" }, transferIncluded: false });
    expect(out[2]).toEqual(opciones[2]);
    expect(out[3]).toEqual({ id: "NU", name: "Glaciar · 14:00", price: { amount: 45, currency: "USD", per: "person" }, transferIncluded: null, startTime: "14:00" });
    // Con precio y traslado en las dos opciones, el traslado sale como adicional por la diferencia (REQ-10881).
    expect(transferAddonFromOptions(out, "es")).toMatchObject({ kind: "transfer", price: { amount: 12, currency: "USD", per: "person" } });
  });

  it("REQ-10944: una fila sin tarifa o sin moneda no pone precio (nunca se inventa); sin filas, las opciones quedan igual", () => {
    const sinTarifa = [tourOptionRecord({ code: "CT", rackAdult: null, currency: "USD", transferIncluded: 1 })!, tourOptionRecord({ code: "ST", rackAdult: 40, currency: null, transferIncluded: 0 })!];
    const out = optionsWithRecords(opciones, sinTarifa, "Glaciar");
    expect(out[0]).toMatchObject({ price: null, transferIncluded: true });
    expect(out[1]).toMatchObject({ price: null, transferIncluded: false });
    expect(transferAddonFromOptions(out, "es")).toBeNull();
    expect(optionsWithRecords(opciones, [], "Glaciar")).toEqual(opciones);
  });
});
