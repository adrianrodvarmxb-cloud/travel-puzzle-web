import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { TEMAS_FILTRO, TEMA_LABEL, ATRIBUTOS_FILTRO, ATRIBUTO_LABEL, parseTemas, parseAtributos, facetOptions, atributosDeClase, MEDIOS_FILTRO } from "./filters";

type T = { eje: string; slug: string; estado?: string; chip?: boolean; termino_es?: string; termino_en?: string; valores?: { slug: string; termino_es: string; termino_en: string }[] };
const terms = (JSON.parse(readFileSync("src/taxonomy/data/dictionary.json", "utf8")) as { terminos: T[] }).terminos;

describe("REQ-1421: temas en el filtro de /tours", () => {
  it("REQ-1421: los 12 temas con chip están activos (firma del PO 8-11) y «Ciudad y barrios» no es filtro", () => {
    for (const t of terms.filter((x) => x.eje === "tema")) {
      if (t.chip) expect(t.estado, t.slug).toBe("activo");
    }
    expect([...TEMAS_FILTRO].sort()).toEqual(terms.filter((x) => x.eje === "tema" && x.chip).map((x) => x.slug).sort());
    expect(TEMAS_FILTRO).not.toContain("urbano");
  });
  it("REQ-1421: las etiquetas salen del diccionario (es y en)", () => {
    for (const s of TEMAS_FILTRO) {
      const t = terms.find((x) => x.eje === "tema" && x.slug === s)!;
      expect(TEMA_LABEL[s]).toEqual({ es: t.termino_es, en: t.termino_en });
    }
  });
  it("REQ-1421: ?tema= acepta solo temas válidos, sin repetir, en el orden del filtro", () => {
    expect(parseTemas(new URLSearchParams("tema=naturaleza,xx,gastronomia,naturaleza"))).toEqual(["gastronomia", "naturaleza"]);
    expect(parseTemas(new URLSearchParams("tema=urbano"))).toEqual([]);
  });
  it("REQ-1421: sin opciones en cero, salvo la ya marcada", () => {
    const o = facetOptions(TEMAS_FILTRO, TEMA_LABEL, { gastronomia: 5, aventura: 0 }, ["deportivo"], "es");
    expect(o.map((x) => x.slug)).toEqual(["gastronomia", "deportivo"]);
    expect(o[0]).toEqual({ slug: "gastronomia", label: "Gastronomía", count: 5 });
  });
});

describe("REQ-1422: atributos en el filtro de /tours", () => {
  it("REQ-1422: la lista firmada: cómo te mueves (4), nocturno, entrada incluida, día completo, en español y con vuelo", () => {
    expect([...ATRIBUTOS_FILTRO]).toEqual(["a-pie", "bici", "vehiculo", "barco", "nocturno", "entrada-incluida", "dia-completo", "idioma-es", "vuelo-incluido"]);
    expect([...MEDIOS_FILTRO]).toEqual(["a-pie", "bici", "vehiculo", "barco"]);
  });
  it("REQ-1422: etiquetas del diccionario", () => {
    const medio = terms.find((x) => x.slug === "medio")!;
    for (const m of MEDIOS_FILTRO) { const v = medio.valores!.find((x) => x.slug === m)!; expect(ATRIBUTO_LABEL[m]).toEqual({ es: v.termino_es, en: v.termino_en }); }
    for (const s of ["nocturno", "entrada-incluida", "dia-completo", "idioma-es", "vuelo-incluido"] as const) {
      const t = terms.find((x) => x.eje === "atributo" && x.slug === s)!;
      expect(ATRIBUTO_LABEL[s]).toEqual({ es: t.termino_es, en: t.termino_en });
    }
  });
  it("REQ-1422: ?atrib= y los atributos del clasificador se traducen a los del filtro", () => {
    expect(parseAtributos(new URLSearchParams("atrib=nocturno,medio:bici,a-pie,privado"))).toEqual(["a-pie", "nocturno"]);
    expect(atributosDeClase(["medio:barco", "guiado", "nocturno", "idioma-es", "favorito"])).toEqual(["barco", "nocturno", "idioma-es"]);
  });
});
