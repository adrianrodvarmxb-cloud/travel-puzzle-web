/**
 * REQ-10701 (ficha única, ola 3, gate G-R3 firmado por el PO «B: crear «Campo y vida rural»», 15-11-2026): tema nuevo
 * «Campo y vida rural» / «Countryside & rural life» en el diccionario (es/en), con chip y filtro en /tours. Tangol 9000007
 * (Día de estancia) lo lleva por categoría y conserva Naturaleza; cualquier proveedor lo recibe por la palabra del título
 * (estancia, granja, finca, hacienda, rancho, gaucho, día de campo, rural, farm, countryside), regla REQ-10709.
 * Los palacios llamados «La Granja» (San Ildefonso) no son campo.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "../data/index";
import { CODIGOS_TANGOL } from "../../tangol/lib/taxonomia";
import { classify } from "./classify";
import { TEMAS_FILTRO, TEMA_LABEL, parseTemas } from "./filters";
import { catalogFacets, catalogClassifier } from "./publish";
import { temasConChip } from "./themes";
import { TEMAS, type ClassifyInput } from "./types";

const tangol = (clave: string, titulo: string, minutos = 480): ClassifyInput =>
  ({ proveedor: "tangol", categoriaId: CODIGOS_TANGOL[clave], precio: 120, durationMinutes: minutos, titulo });
const ft = (categoriaId: number, titulo: string): ClassifyInput =>
  ({ proveedor: "freetour", categoriaId, precio: 20, durationMinutes: 180, titulo });
const temas = (i: ClassifyInput) => classify(i, D, M).temas;

describe("REQ-10701 tema «Campo y vida rural»", () => {
  it("REQ-10701: el diccionario tiene el tema activo, con chip, en es/en, y TEMAS lo conoce", () => {
    const t = D.terminos.find((x) => x.eje === "tema" && x.slug === "campo-vida-rural") as { termino_es: string; termino_en: string; estado: string; chip: boolean; palabras: string[] } | undefined;
    expect(t).toBeDefined();
    expect(t).toMatchObject({ termino_es: "Campo y vida rural", termino_en: "Countryside & rural life", estado: "activo", chip: true });
    expect(t!.palabras).toEqual(expect.arrayContaining(["estancia*", "granja*", "finca*", "hacienda*", "gaucho*", "rural*"]));
    expect(TEMAS).toContain("campo-vida-rural");
    expect(temasConChip(D)).toContain("campo-vida-rural");
  });

  it("REQ-10701: Tangol 9000007 (Día de estancia) lleva el tema por categoría y conserva Naturaleza", () => {
    const cat = M.tangol.categorias.find((c) => c.id === "9000007")!;
    expect(cat.temas).toEqual(["campo-vida-rural", "naturaleza"]);
    const r = classify(tangol("EXCURSION|ESTANCIAS", "Dia De Estancia En Peuma Hue"), D, M);
    expect(r.temas).toContain("campo-vida-rural");
    expect(r.temas).toContain("naturaleza");
    expect(r.temas.length).toBeLessThanOrEqual(3);
  });

  it("REQ-10701: la palabra del título da el tema a cualquier proveedor (estancia, finca cafetera, granja, gaucho, día de campo, rural, farm)", () => {
    expect(temas(tangol("EXCURSION|CLASICAS", "Cabalgata En Estancia Cristina"))).toContain("campo-vida-rural");
    expect(temas(tangol("EXCURSION|CLASICAS", "Visita A Finca Cafetera En El Quindío"))).toContain("campo-vida-rural");
    expect(temas(tangol("EXCURSION|ESTANCIAS", "Gaucho Patagon Tradiciones Campestres En Coyhaique"))).toContain("campo-vida-rural");
    expect(temas(tangol("EXCURSION|AVENTURA", "Día De Campo Estancia Nibepo Aike Con Cabalgata"))).toContain("campo-vida-rural");
    expect(temas(ft(4, "Excursión de un día a la granja de cacao"))).toContain("campo-vida-rural");
    expect(temas(ft(13, "Udaipur Open Jeep Village Tour para la cultura local y la experiencia rural"))).toContain("campo-vida-rural");
    expect(temas(ft(4, "Countryside farm visit with lunch"))).toContain("campo-vida-rural");
  });

  it("REQ-10701: los palacios de «La Granja» y los nombres parecidos no son campo", () => {
    expect(temas(ft(12, "Visita Guiada por el Palacio Real de la Granja de San Ildefonso"))).not.toContain("campo-vida-rural");
    expect(temas(ft(12, "Free Tour por los Jardines del Palacio de la Granja"))).not.toContain("campo-vida-rural");
    expect(temas(ft(21, "«El farmacéutico desaparecido de Bucarest»: juego de exploración autoguiado"))).not.toContain("campo-vida-rural");
    expect(temas(ft(12, "Campo De Piedra Pomez"))).not.toContain("campo-vida-rural");
    expect(temas(ft(12, "Visita Alfa"))).not.toContain("campo-vida-rural");
  });

  it("REQ-10701: el filtro de /tours ofrece el tema con su etiqueta y lo lee de la URL y de la clase", () => {
    expect(TEMAS_FILTRO).toContain("campo-vida-rural");
    expect(TEMA_LABEL["campo-vida-rural"]).toEqual({ es: "Campo y vida rural", en: "Countryside & rural life" });
    expect(parseTemas(new URLSearchParams("tema=campo-vida-rural,naturaleza"))).toEqual(expect.arrayContaining(["campo-vida-rural", "naturaleza"]));
    const c = catalogClassifier(D, M)({ providerId: "tangol", categoryId: 9_000_007, price: 150, durationMinutes: 480, title: "Dia De Campo En Estancia La Bandada", cities: ["buenos-aires"] });
    expect(catalogFacets(c).temas).toContain("campo-vida-rural");
  });
});
