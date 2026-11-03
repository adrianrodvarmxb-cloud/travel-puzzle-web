import { describe, it, expect } from "vitest";
import { homeSections } from "./sections";

describe("secciones del inicio para el menú", () => {
  it("son las 7, en orden, con enlace al inicio", () => {
    const s = homeSections("es");
    expect(s.map((x) => x.href)).toEqual([
      "/#destinos", "/#favoritos", "/#como-funciona", "/#continentes", "/#mapa", "/#opiniones", "/#asesor",
    ]);
    expect(s.map((x) => x.number)).toEqual(["01", "02", "03", "04", "05", "06", "07"]);
  });
  it("en español y en inglés", () => {
    expect(homeSections("es")[0].label).toBe("Destinos");
    expect(homeSections("es")[6].label).toBe("Asesoría personalizada");
    expect(homeSections("en")[1].label).toBe("Traveler favorites");
    expect(homeSections("fr")[2].label).toBe("How it works");
  });
});
