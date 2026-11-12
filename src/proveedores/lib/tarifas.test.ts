// REQ-1672, REQ-1581, REQ-1582
import { describe, it, expect } from "vitest";
import { pareceCambioTarifa, leerCambio, leerFecha, estadoInicial, renglonDelAviso, precioNuevo, puedeConfirmar, yaRige, textoAvisoPO, correoPideFecha, correoEnterados, leerComandoConfirmo, codigoAviso, type RenglonAnexo } from "./tarifas";

const rates = { pct: { programa: 0.3, tour: 0.3, privado: 0.25, traslado: 0.3 }, minTourUsd: 10 };
const anexo: RenglonAnexo[] = [
  { id: "a1", producto: "Triángulo de Oro", neto: 1000, moneda: "USD", kind: "programa", tripId: "t1", optionId: "o1" },
  { id: "a2", producto: "Kerala", neto: 800, moneda: "USD", kind: "programa", tripId: "t2", optionId: "o1" },
];

describe("REQ-1672: detectar y leer el aviso de cambio de tarifa", () => {
  it("REQ-1672: detecta avisos de cambio en español e inglés y no confunde un correo cualquiera", () => {
    expect(pareceCambioTarifa("Actualización de tarifas", "El Triángulo de Oro sube de 1,000 a 1,080 USD")).toBe(true);
    expect(pareceCambioTarifa("Rates", "Please note our new rate for Kerala: 850 USD")).toBe(true);
    expect(pareceCambioTarifa("Fotos", "Les mando las fotos del hotel")).toBe(false);
  });
  it("REQ-1672: lee antes, después, moneda y fecha", () => {
    expect(leerCambio("A partir del 1 de abril de 2027, el Triángulo de Oro sube de 1,000 a 1,080 USD.", "2026-11-11")).toEqual({ netoAntes: 1000, netoNuevo: 1080, moneda: "USD", desde: "2027-04-01" });
    expect(leerCambio("Kerala now costs EUR 850, effective from April 1st", "2026-11-11")).toMatchObject({ netoNuevo: 850, moneda: "EUR", desde: "2027-04-01" });
  });
  it("REQ-1582: sin año toma la siguiente fecha; sin fecha no la inventa", () => {
    expect(leerFecha("desde el 15 de diciembre", "2026-11-11")).toBe("2026-12-15");
    expect(leerFecha("a partir del 1 de enero", "2026-11-11")).toBe("2027-01-01");
    expect(leerFecha("ahora cuesta 1,080 USD", "2026-11-11")).toBeUndefined();
  });
  it("REQ-1582: sin fecha queda «falta_fecha»; sin monto «falta_monto»; completo «por_confirmar»", () => {
    expect(estadoInicial({ netoNuevo: 1080 })).toBe("falta_fecha");
    expect(estadoInicial({ desde: "2027-04-01" })).toBe("falta_monto");
    expect(estadoInicial({ netoNuevo: 1080, desde: "2027-04-01" })).toBe("por_confirmar");
  });
  it("REQ-1672: liga el aviso al producto del anexo solo si hay uno claro", () => {
    expect(renglonDelAviso("el triangulo de oro sube", anexo)?.id).toBe("a1");
    expect(renglonDelAviso("Triángulo de Oro y Kerala suben", anexo)).toBeNull();
    expect(renglonDelAviso("otro programa", anexo)).toBeNull();
  });
});

describe("REQ-1672/REQ-1581: confirmación y precio", () => {
  it("REQ-1581: si el neto baja, el precio baja con el mismo margen; un programa no baja del publicado del operador", () => {
    expect(precioNuevo(1080, "programa", rates)).toBe(1404);
    expect(precioNuevo(950, "programa", rates)).toBe(1235);
    expect(precioNuevo(950, "programa", rates, 1300)).toBe(1300);
  });
  it("REQ-1672: el comando solo corre con aviso completo, por confirmar y ligado al anexo", () => {
    const ok = { estado: "por_confirmar" as const, netoNuevo: 1080, desde: "2027-04-01", renglonId: "a1" };
    expect(puedeConfirmar(ok)).toEqual({ ok: true });
    expect(puedeConfirmar({ ...ok, estado: "confirmado" })).toMatchObject({ ok: false });
    expect(puedeConfirmar({ ...ok, estado: "falta_fecha", desde: null })).toMatchObject({ ok: false });
    expect(puedeConfirmar({ ...ok, renglonId: null })).toMatchObject({ ok: false, motivo: expect.stringMatching(/anexo/) });
  });
  it("REQ-1672: el precio cambia el día que rige, no antes", () => {
    expect(yaRige("2027-04-01", "2027-03-31T23:00:00Z")).toBe(false);
    expect(yaRige("2027-04-01", "2027-04-01T06:00:00Z")).toBe(true);
  });
  it("REQ-1672: textos al PO, «quedamos enterados» y petición de fecha", () => {
    const t = textoAvisoPO({ codigo: "T-12", proveedor: "Exotic Escapes", producto: "Triángulo de Oro", netoAntes: 1000, netoNuevo: 1080, moneda: "USD", desde: "2027-04-01", precioAntes: 1300, precioNuevo: 1404 });
    expect(t).toBe("Exotic Escapes avisa cambio de tarifa (T-12): Triángulo de Oro de 1,000 USD a 1,080 USD a partir del 2027-04-01. En la página: de 1,300 a 1,404. Para aceptarlo: botón Confirmar en /admin/tarifas o responde «confirmo T-12».");
    expect(t).not.toMatch(/\n/);
    expect(correoEnterados("es", { contacto: "Angela", producto: "Triángulo de Oro", netoNuevo: 1080, moneda: "USD", desde: "2027-04-01" })).toMatch(/^Hola, Angela:\n\nQuedamos enterados de la nueva tarifa de Triángulo de Oro: 1,080 USD a partir del 2027-04-01/);
    expect(correoPideFecha("en")).toMatch(/from which the new rate applies/);
  });
  it("REQ-1580: lee el comando «confirmo T-12»", () => {
    expect(leerComandoConfirmo("Confirmo t-12")).toBe("T-12");
    expect(leerComandoConfirmo("confirmo")).toBeNull();
    expect(codigoAviso(12)).toBe("T-12");
  });
});
