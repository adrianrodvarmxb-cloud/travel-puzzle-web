import { describe, expect, it } from "vitest";
import { keyFactsRows } from "./key-facts";
import { fichaEjemplo } from "./fixtures";

describe("datos clave de la ficha única", () => {
  it("REQ-10815: duración, horarios, idioma, dificultad y edades en el idioma; sin casillas vacías", () => {
    const rows = keyFactsRows(fichaEjemplo().facts, "es");
    expect(rows.map((r) => r.id)).toEqual(["duracion", "horarios", "idiomas", "dificultad", "edades"]);
    expect(rows.find((r) => r.id === "duracion")?.value).toBe("8 h");
    expect(rows.find((r) => r.id === "idiomas")?.value).toBe("Español, Inglés");
    expect(rows.find((r) => r.id === "dificultad")?.value).toBe("1 de 5");
    expect(rows.find((r) => r.id === "edades")?.value).toBe("3 a 9 años");
    expect(rows.every((r) => r.label && r.value && !/N\/D/.test(r.value))).toBe(true);
  });

  it("REQ-10815: en inglés, con temporada; sin datos, sin filas", () => {
    const rows = keyFactsRows({ durationMinutes: 150, schedule: null, languages: [], season: "Oct–Apr", difficulty: 3, ages: null }, "en");
    expect(rows).toEqual([
      { id: "duracion", label: "Duration", value: "2 h 30 min" },
      { id: "temporada", label: "Season", value: "Oct–Apr" },
      { id: "dificultad", label: "Difficulty", value: "3 of 5" },
    ]);
    expect(keyFactsRows({ durationMinutes: null, schedule: " ", languages: [], season: null, difficulty: null, ages: null }, "de")).toEqual([]);
  });
});
