import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "../data/index";
import { classify } from "./classify";
import { temasConChip } from "./themes";
import { MAX_TEMAS, TEMAS, type ClassifyInput } from "./types";

const ft = (categoriaId: number, titulo: string, resumen = "", precio = 20): ClassifyInput => ({ proveedor: "freetour", categoriaId, precio, durationMinutes: 120, titulo, resumen });
const temas = (i: ClassifyInput) => classify(i, D, M).temas;

describe("REQ-403 temas: de 0 a 3, de los 13", () => {
  it("REQ-403 nunca más de 3 aunque coincidan más", () => {
    const t = temas(ft(13, "Food, wine, nature hike, kayak, beach and castle at night"));
    expect(t).toHaveLength(MAX_TEMAS);
    expect(t).toEqual(["gastronomia", "naturaleza", "montana-senderismo"]);
  });
  it("REQ-403 cada tema por categoría y por palabra clave", () => {
    const casos: [string, ClassifyInput][] = [
      ["gastronomia", ft(13, "Cata de vinos")], ["naturaleza", ft(13, "Parque nacional y cascada")], ["montana-senderismo", ft(13, "Trekking en la sierra")],
      ["aventura", ft(13, "Rafting y tirolesa")], ["playa-mar", ft(13, "Snorkel en la isla")], ["cultural", ft(13, "Historia del castillo")],
      ["religioso", ft(13, "Monasterios y santuario")], ["urbano", ft(13, "Barrios de la ciudad")], ["noche-espectaculos", ft(13, "Show de flamenco")],
      ["bienestar", ft(13, "Spa y temazcal")], ["talleres-aprendizaje", ft(13, "Workshop de cerámica")], ["deportivo", ft(13, "Estadio de futbol")],
      ["parques-ocio", ft(13, "Escape room")],
    ];
    expect(casos.map((c) => c[0]).sort()).toEqual([...TEMAS].sort());
    for (const [tema, input] of casos) expect(temas(input)).toContain(tema);
  });
  it("REQ-403 la categoría implica su tema aunque el título no lo diga", () => {
    expect(temas(ft(5, "Visita Alfa"))).toEqual(["gastronomia"]);
    expect(temas(ft(23, "Visita Alfa"))).toEqual(["aventura", "deportivo"]);
  });
  it("REQ-403 sin palabra en el título se busca en el resumen; sin nada, 0 temas", () => {
    expect(temas(ft(13, "Visita Alfa", "Incluye degustación de chocolate"))).toEqual(["gastronomia"]);
    expect(temas(ft(13, "Visita Alfa", "Nada"))).toEqual([]);
  });
  it("REQ-403 viajes propios: tema desde Trip.category más palabras del título", () => {
    const own = classify({ proveedor: "propios", categoriaId: "tour", fuentesTema: ["ecoturismo"], precio: 100, durationDays: 1, titulo: "Lima y su gastronomía" }, D, M);
    expect(own.temas).toEqual(["gastronomia", "naturaleza"]);
    expect(own.reglasTemas.find((r) => r.valor === "naturaleza")?.regla).toBe("fuente ecoturismo");
  });
  it("REQ-403 fuera y por-revisar no llevan tema", () => {
    expect(temas(ft(31, "Online cooking class"))).toEqual([]); // REQ-1263: la 31 (esenciales, tras bandera) no lleva tema; la 8 ya se clasifica por lo que es
    expect(temas(ft(999, "Cata de vinos"))).toEqual([]);
  });
});

describe("REQ-411 falsos positivos conocidos y urbano sin chip", () => {
  it("REQ-411 «Juego de Tronos» / «Game of Thrones» no da parques-ocio", () => {
    expect(temas(ft(13, "Tour de Juego de Tronos | Game of Thrones tour"))).not.toContain("parques-ocio");
    expect(temas(ft(13, "Escape game | Juego de pistas"))).toContain("parques-ocio");
  });
  it("REQ-411 «Casa Cueva» no da aventura; una cueva sí", () => {
    expect(temas(ft(7, "Flamenco en la Casa Cueva"))).not.toContain("aventura");
    expect(temas(ft(13, "Visita a la cueva de los cristales"))).toContain("aventura");
  });
  it("REQ-411 «Ciudad y barrios» se asigna como etiqueta pero no es chip", () => {
    expect(temas(ft(12, "Visita Alfa"))).toEqual(["urbano"]);
    expect(temasConChip(D)).not.toContain("urbano");
    expect(temasConChip(D)).toHaveLength(12);
  });
});
