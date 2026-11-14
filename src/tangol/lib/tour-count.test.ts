import { describe, it, expect } from "vitest";
import { checkTourCounts, formatTourCountCheck } from "./tour-count";

describe("REQ-3505: cuadre de «tours que dice el destino» contra «tours que llegaron en la lista»", () => {
  it("REQ-3505: si todo cuadra, la línea lo dice y no hay destinos señalados", () => {
    const c = checkTourCounts([
      { id: 1, name: "Bariloche", declarados: 91, recibidos: 91, invalidos: 0 },
      { id: 2, name: "Ushuaia", declarados: 90, recibidos: 89, invalidos: 1 },
    ]);
    expect(c).toMatchObject({ declarados: 181, recibidos: 180, invalidos: 1, diferencia: 0, destinos: [] });
    expect(formatTourCountCheck(c)).toBe(
      "Cuadre de tours: el destino dice 181 · llegaron en la lista 180 (+1 tirados por validación) · diferencia 0 · cuadra",
    );
  });

  it("REQ-3505: una diferencia nunca pasa callada: sale la cifra y los destinos que no cuadran, de mayor a menor", () => {
    const c = checkTourCounts([
      { id: 1, name: "Buenos Aires", declarados: 184, recibidos: 150, invalidos: 0 },
      { id: 2, name: "Salta", declarados: 47, recibidos: 47, invalidos: 0 },
      { id: 3, name: "Cusco", declarados: 46, recibidos: 40, invalidos: 1 },
    ]);
    expect(c.diferencia).toBe(-39);
    expect(c.destinos).toEqual([
      { id: 1, name: "Buenos Aires", declarados: 184, recibidos: 150, invalidos: 0, diferencia: -34 },
      { id: 3, name: "Cusco", declarados: 46, recibidos: 40, invalidos: 1, diferencia: -5 },
    ]);
    const line = formatTourCountCheck(c);
    expect(line).toContain("el destino dice 277");
    expect(line).toContain("llegaron en la lista 237 (+1 tirados por validación)");
    expect(line).toContain("diferencia -39");
    expect(line).toContain("NO CUADRA en 2 destino(s)");
  });

  it("REQ-3505: un destino sin ToursQty o cuya lista falló no se mezcla en la cifra: se cuenta aparte", () => {
    const c = checkTourCounts([
      { id: 1, name: "Bariloche", declarados: 91, recibidos: 91, invalidos: 0 },
      { id: 2, name: "Sin dato", declarados: null, recibidos: 5, invalidos: 0 },
      { id: 3, name: "Falló", declarados: 30, recibidos: 0, invalidos: 0, fallo: true },
    ]);
    expect(c).toMatchObject({ declarados: 91, recibidos: 91, diferencia: 0, sinDato: 1, sinLista: 1, destinos: [] });
    const line = formatTourCountCheck(c);
    expect(line).toContain("1 destino(s) sin ToursQty");
    expect(line).toContain("1 destino(s) sin lista por error");
  });

  it("REQ-3505: un número que no es entero no negativo cuenta como sin dato (no truena la cuenta)", () => {
    const c = checkTourCounts([{ id: 1, name: "Raro", declarados: Number.NaN, recibidos: 3, invalidos: 0 }]);
    expect(c).toMatchObject({ declarados: 0, recibidos: 0, sinDato: 1 });
  });
});
