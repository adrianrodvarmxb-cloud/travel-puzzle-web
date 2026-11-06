import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D } from "../data/index";
import { dificultad, rangoDias, tipoGrupo } from "./circuits";

describe("REQ-421 facetas de circuitos", () => {
  it("REQ-421 tipo de grupo desde options.mode y kind personalizado; puede tener más de uno; sin dato, nada", () => {
    expect(tipoGrupo({ kind: "circuito", modos: ["group"] })).toEqual(["en-grupo"]);
    expect(tipoGrupo({ kind: "circuito", modos: ["group", "private"] })).toEqual(["en-grupo", "privado"]);
    expect(tipoGrupo({ kind: "personalizado" })).toEqual(["a-la-medida"]);
    expect(tipoGrupo({ kind: "circuito" })).toEqual([]);
  });
  it("REQ-422 dificultad con G-T8 A: facil→2, moderada→3, exigente→4, con nombre y línea", () => {
    expect(dificultad("facil", D)).toMatchObject({ nivel: 2, termino_es: "Ligero" });
    expect(dificultad("moderada", D)).toMatchObject({ nivel: 3, termino_es: "Moderado" });
    expect(dificultad("exigente", D)).toMatchObject({ nivel: 4, termino_es: "Exigente", definicion_es: "Caminatas largas, desnivel o altura." });
    expect(dificultad(1, D)?.termino_es).toBe("Relajado");
    expect(dificultad(5, D)?.termino_es).toBe("Muy exigente");
  });
  it("REQ-422 sin dato (o dato inválido) no se muestra nada", () => {
    for (const v of [null, undefined, "", "media", 0, 6, 2.5]) expect(dificultad(v as never, D)).toBeNull();
  });
  it("REQ-260 G-T8 B: los 3 valores de hoy no se traducen; solo el nivel declarado", () => {
    expect(dificultad("moderada", D, "B")).toBeNull();
    expect(dificultad(3, D, "B")?.nivel).toBe(3);
  });
  it("REQ-423 rangos de días 1–5 · 6–9 · 10–14 · 15+ con sus límites", () => {
    const casos: [number, string][] = [[1, "1-5"], [5, "1-5"], [6, "6-9"], [9, "6-9"], [10, "10-14"], [14, "10-14"], [15, "15-mas"], [40, "15-mas"]];
    for (const [d, r] of casos) expect(rangoDias(d, D)).toBe(r);
    for (const v of [null, undefined, 0, -1, 2.5]) expect(rangoDias(v as never, D)).toBeNull();
  });
});
