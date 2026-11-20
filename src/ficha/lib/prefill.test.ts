import { describe, expect, it } from "vitest";
import { fichaEjemplo } from "./fixtures";
import { leerPrefill, prefillQuery } from "./prefill";

const conOpciones = () => {
  const f = fichaEjemplo();
  f.options = [
    { id: "op-1", name: "Con traslado", price: { amount: 120, currency: "USD", per: "person" }, transferIncluded: true, startTime: "08:00" },
    { id: "op-2", name: "Sin traslado", price: { amount: 98, currency: "USD", per: "person" }, transferIncluded: false, startTime: "09:00" },
  ];
  return f;
};

describe("REQ-10820: prellenado de la ficha (?fecha&adultos&ninos&opcion)", () => {
  it("REQ-10820: lee fecha, adultos, niños y una opción que existe en la ficha", () => {
    const p = leerPrefill({ fecha: "2026-12-20", adultos: "2", ninos: "1", opcion: "op-2" }, conOpciones());
    expect(p).toEqual({ fecha: "2026-12-20", adultos: 2, ninos: 1, opcion: "op-2" });
  });

  it("REQ-10820: rechaza valores inválidos sin tumbar los válidos", () => {
    const p = leerPrefill({ fecha: "2026-02-30", adultos: "0", ninos: "-1", opcion: "no-existe" }, conOpciones());
    expect(p).toEqual({});
    expect(leerPrefill({ fecha: "20/12/2026", adultos: "3" }, conOpciones())).toEqual({ adultos: 3 });
    expect(leerPrefill({ adultos: "21" }, conOpciones())).toEqual({});
  });

  it("REQ-10820: la opción solo se acepta si la ficha tiene más de una y el id coincide exacto", () => {
    const una = fichaEjemplo();
    una.options = [{ id: "op-1", name: "Única", price: null, transferIncluded: null, startTime: null }];
    expect(leerPrefill({ opcion: "op-1" }, una)).toEqual({});
    expect(leerPrefill({ opcion: "OP-1" }, conOpciones())).toEqual({});
    expect(leerPrefill({ opcion: ["op-1", "op-2"] }, conOpciones())).toEqual({ opcion: "op-1" });
  });

  it("REQ-10820: niños solo acompañan a fecha o adultos (regla de REQ-150) y el vacío da {}", () => {
    expect(leerPrefill({ ninos: "2" }, conOpciones())).toEqual({});
    expect(leerPrefill({}, conOpciones())).toEqual({});
  });

  it("REQ-10820: la liga de vuelta solo lleva lo válido y en orden fijo", () => {
    expect(prefillQuery({ fecha: "2026-12-20", adultos: 2, ninos: 1, opcion: "op-2" })).toBe("fecha=2026-12-20&adultos=2&ninos=1&opcion=op-2");
    expect(prefillQuery({})).toBe("");
    expect(prefillQuery({ opcion: "a b" })).toBe("opcion=a+b");
  });
});
