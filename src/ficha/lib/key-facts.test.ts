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

  it("REQ-10870: si el proveedor da la duración en sus palabras (`durationText`, p. ej. «24–48 h» de Big Bus), la fila la usa tal cual; vacía, se calcula de los minutos", () => {
    expect(keyFactsRows({ durationMinutes: null, durationText: "24–48 h", schedule: null, languages: [], season: null, difficulty: null, ages: null }, "es")).toEqual([{ id: "duracion", label: "Duración", value: "24–48 h" }]);
    expect(keyFactsRows({ durationMinutes: 1440, durationText: " ", schedule: null, languages: [], season: null, difficulty: null, ages: null }, "es")[0]?.value).toBe("1 día");
  });
});

describe("REQ-10898: hora de salida y mínimo de personas en los datos clave", () => {
  it("REQ-10898: con dato salen las casillas «Hora de salida» y «Mínimo de personas»; sin dato, ninguna casilla vacía", () => {
    const f = { ...fichaEjemplo().facts, schedule: "08:45", minPax: 4 };
    const rows = keyFactsRows(f, "es");
    expect(rows.map((r) => r.id)).toEqual(["duracion", "horarios", "idiomas", "minimo", "dificultad", "edades"]);
    expect(rows.find((r) => r.id === "horarios")).toEqual({ id: "horarios", label: "Hora de salida", value: "08:45" });
    expect(rows.find((r) => r.id === "minimo")).toEqual({ id: "minimo", label: "Mínimo de personas", value: "4 personas" });
    expect(keyFactsRows({ ...f, minPax: 1 }, "en").find((r) => r.id === "minimo")).toEqual({ id: "minimo", label: "Minimum group", value: "1 person" });
    expect(keyFactsRows({ ...f, schedule: null, minPax: null }, "es").map((r) => r.id)).toEqual(["duracion", "idiomas", "dificultad", "edades"]);
    expect(keyFactsRows({ ...f, minPax: 0 }, "es").some((r) => r.id === "minimo")).toBe(false);
  });
});
