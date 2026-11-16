/**
 * REQ-10703 (ficha única, ola 3, gate G-R5 firmado «B: crear «En tren» ya», 15-11-2026): el atributo «Cómo te mueves»
 * tiene el valor «En tren» / «By train». Tangol 9000009 (Excursiones en tren) lo lleva por categoría; cualquier
 * proveedor lo recibe por la palabra del título («tren», «train», «ferrocarril», «railway»). «tren» deja de contar
 * como vehículo, pero sigue siendo «otro medio» para el formato (un paseo en tren no es una caminata).
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "../data/index";
import { CODIGOS_TANGOL } from "../../tangol/lib/taxonomia";
import { classify } from "./classify";
import { ATRIBUTO_LABEL, MEDIOS_FILTRO, atributosDeClase, parseAtributos } from "./filters";
import { MEDIOS, type ClassifyInput } from "./types";

const tangol = (clave: string, titulo: string, minutos = 180): ClassifyInput =>
  ({ proveedor: "tangol", categoriaId: CODIGOS_TANGOL[clave], precio: 80, durationMinutes: minutos, titulo });
const ft = (categoriaId: number, titulo: string): ClassifyInput =>
  ({ proveedor: "freetour", categoriaId, precio: 20, durationMinutes: 120, titulo });
const medios = (i: ClassifyInput) => classify(i, D, M).atributos.filter((a) => a.startsWith("medio:"));

describe("REQ-10703 medio «En tren»", () => {
  it("REQ-10703: el diccionario tiene el valor tren en es/en y «tren»/«train» ya no son vehículo", () => {
    const medio = D.terminos.find((t) => t.eje === "atributo" && t.slug === "medio") as { valores?: { slug: string; termino_es: string; termino_en: string; palabras?: string[] }[] };
    const tren = medio.valores!.find((v) => v.slug === "tren");
    expect(tren).toMatchObject({ termino_es: "En tren", termino_en: "By train" });
    expect(tren!.palabras).toEqual(expect.arrayContaining(["tren", "train"]));
    const vehiculo = medio.valores!.find((v) => v.slug === "vehiculo")!;
    expect(vehiculo.palabras).not.toContain("tren");
    expect(vehiculo.palabras).not.toContain("train");
    expect(MEDIOS).toContain("tren");
  });

  it("REQ-10703: Tangol 9000009 (Excursiones en tren) lleva medio:tren por categoría y un solo medio", () => {
    const cat = M.tangol.categorias.find((c) => c.id === "9000009")!;
    expect(cat.atributos).toContain("medio:tren");
    expect(cat.atributos).not.toContain("medio:vehiculo");
    expect(medios(tangol("EXCURSION|EN TREN", "Excursión A La Quebrada"))).toEqual(["medio:tren"]);
  });

  it("REQ-10703: la palabra del título da medio:tren a cualquier proveedor (Tren a las Nubes, train ride)", () => {
    expect(medios(tangol("EXCURSION|EN TREN", "Tren A Las Nubes", 900))).toEqual(["medio:tren"]);
    expect(medios(ft(12, "Scenic train ride through the valley"))).toEqual(["medio:tren"]);
    expect(medios(ft(12, "Bus panorámico por la ciudad"))).toEqual(["medio:vehiculo"]);
    // «tren» con límite de palabra: «entrenamiento» o «trending» no son tren.
    expect(medios(ft(12, "Entrenamiento de surf"))).not.toContain("medio:tren");
  });

  it("REQ-10703: un paseo en tren sigue siendo Tour, no Caminata (tren cuenta como otro medio)", () => {
    const r = classify(tangol("EXCURSION|EN TREN", "Paseo En Tren Por La Quebrada"), D, M);
    expect(r.formato).toBe("tour");
    expect(r.formato).not.toBe("caminata");
  });

  it("REQ-10703: el filtro «Cómo te mueves» ofrece tren con su etiqueta y lo lee de la URL y de la clase", () => {
    expect(MEDIOS_FILTRO).toContain("tren");
    expect(ATRIBUTO_LABEL.tren).toEqual({ es: "En tren", en: "By train" });
    expect(parseAtributos(new URLSearchParams("atrib=tren,a-pie"))).toEqual(expect.arrayContaining(["tren", "a-pie"]));
    expect(atributosDeClase(["medio:tren", "nocturno"])).toEqual(["tren", "nocturno"]);
  });
});
