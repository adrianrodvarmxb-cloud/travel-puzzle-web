import { describe, expect, it } from "vitest";
import { pairById } from "./cards";

describe("REQ-268 tarjetas de viajes sin desalinear", () => {
  it("REQ-268 un viaje que no se pudo leer no corre las traducciones de los demás", () => {
    const rows = [{ id: "a", translations: "ta" }, { id: "b", translations: "tb" }, { id: "c", translations: "tc" }];
    const trips = [{ id: "a" }, null, { id: "c" }];
    expect(pairById(rows, trips).map(({ row, trip }) => [trip.id, row.translations])).toEqual([["a", "ta"], ["c", "tc"]]);
  });
  it("REQ-268 un viaje sin fila no entra", () => {
    expect(pairById([{ id: "a" }], [{ id: "z" }])).toEqual([]);
  });
});
