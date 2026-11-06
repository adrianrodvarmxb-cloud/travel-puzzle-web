import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D } from "../data/index";
import { circuitFacts, taxonomyCircuitsEnabled } from "./circuit-facts";

describe("T6b facetas de circuitos en la ficha (REQ-421, REQ-422, REQ-423, REQ-424)", () => {
  it("REQ-421 banderas TAXONOMY_CIRCUITS_ENABLED y TAXONOMY_CIRCUIT_EXTRA_ENABLED en \"false\"", () => {
    expect(taxonomyCircuitsEnabled({})).toBe(false);
    expect(taxonomyCircuitsEnabled({ TAXONOMY_CIRCUITS_ENABLED: "true" })).toBe(true);
    const w = readFileSync("wrangler.jsonc", "utf8");
    expect(w).toMatch(/"TAXONOMY_CIRCUITS_ENABLED":\s*"(true|false)"/);
    expect(w).toMatch(/"TAXONOMY_CIRCUIT_EXTRA_ENABLED":\s*"false"/);
  });
  it("REQ-422 / REQ-421 / REQ-423 circuito de 8 días, moderado, con opciones en grupo y privada", () => {
    expect(circuitFacts({ kind: "circuito", difficulty: "moderada", durationDays: 8, options: [{ mode: "group" }, { mode: "private" }] }, D, "es")).toEqual({
      dificultad: "Dificultad 3 de 5 · Moderado: Varias horas a pie o algo de altura.",
      grupo: "Tipo de grupo: En grupo · Privado",
      dias: "6 a 9 días",
    });
  });
  it("REQ-421 a la medida; REQ-423 límites 5/6 y 14/15", () => {
    expect(circuitFacts({ kind: "personalizado", durationDays: 5 }, D, "es")).toMatchObject({ grupo: "Tipo de grupo: A la medida", dias: "1 a 5 días" });
    expect(circuitFacts({ kind: "circuito", durationDays: 15 }, D, "es").dias).toBe("15 días o más");
    expect(circuitFacts({ kind: "circuito", durationDays: 14 }, D, "es").dias).toBe("10 a 14 días");
  });
  it("REQ-422 sin dato no se muestra nada (ni «sin dato»); un tour de un día no lleva grupo ni días", () => {
    expect(circuitFacts({ kind: "circuito", difficulty: null, durationDays: null }, D, "es")).toEqual({ dificultad: null, grupo: null, dias: null });
    expect(circuitFacts({ kind: "tour", difficulty: "facil", durationDays: 1, options: [{ mode: "group" }] }, D, "es")).toEqual({ dificultad: "Dificultad 2 de 5 · Ligero: Caminatas cortas en terreno plano.", grupo: null, dias: null });
  });
  it("REQ-422 en inglés, nombre del nivel sin la línea (la línea se traduce en el flujo de traducción)", () => {
    expect(circuitFacts({ kind: "circuito", difficulty: "exigente", durationDays: 3 }, D, "en")).toMatchObject({ dificultad: "Difficulty 4/5 · Demanding", dias: "1–5 days" });
  });
});
