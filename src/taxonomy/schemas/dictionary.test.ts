import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D } from "../data/index";
import rawDictionary from "../data/dictionary.json";
import { parseDictionary, type TerminoFormato, type TerminoTema } from "./dictionary";
import { ESTADOS_TERMINO, FORMATOS, TEMAS } from "../lib/types";
import { norm } from "../lib/text";

const formatos = D.terminos.filter((t): t is TerminoFormato => t.eje === "formato");
const temas = D.terminos.filter((t): t is TerminoTema => t.eje === "tema");
const clone = () => JSON.parse(JSON.stringify(rawDictionary));

describe("REQ-401 diccionario versionado (JSON + Zod)", () => {
  it("REQ-401 cada término trae slug, eje, es, en, definición, sinónimos y uno de los 5 estados", () => {
    for (const t of D.terminos) {
      expect(t.slug).toMatch(/^[a-z0-9-]+$/);
      expect(t.termino_es.length).toBeGreaterThan(0);
      expect(t.termino_en.length).toBeGreaterThan(0);
      expect(typeof t.definicion_es).toBe("string");
      expect(Array.isArray(t.sinonimos)).toBe(true);
      expect(ESTADOS_TERMINO).toContain(t.estado);
    }
    expect([...ESTADOS_TERMINO]).toEqual(["activo", "muestra", "tras_bandera", "oculto", "descartado"]);
  });
  it("REQ-401 13 formatos + fuera y por-revisar, 13 temas, slugs únicos por eje", () => {
    expect(formatos.map((f) => f.slug).sort()).toEqual([...FORMATOS, "fuera", "por-revisar"].sort());
    expect(FORMATOS).toHaveLength(13);
    expect(temas.map((t) => t.slug).sort()).toEqual([...TEMAS].sort());
    expect(TEMAS).toHaveLength(13);
    const keys = D.terminos.map((t) => `${t.eje}:${t.slug}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("REQ-401 un término inválido rompe el parseo", () => {
    const a = clone(); a.terminos[0].estado = "publicado";
    expect(() => parseDictionary(a)).toThrow();
    const b = clone(); b.terminos.push({ ...b.terminos[1] });
    expect(() => parseDictionary(b)).toThrow(/repetido/);
    const c = clone(); c.terminos = c.terminos.filter((t: { slug: string }) => t.slug !== "caminata");
    expect(() => parseDictionary(c)).toThrow(/falta el formato caminata/);
    const d = clone(); d.terminos.find((t: { slug: string }) => t.slug === "cultural").palabras.push("(sin cerrar");
    expect(() => parseDictionary(d)).toThrow();
  });
  it("REQ-401 la raíz es «Experiencias» (menú firmado) y ningún formato se llama igual", () => {
    expect(D.raiz).toMatchObject({ slug: "experiencias", termino_es: "Experiencias" });
    for (const f of formatos) expect(f.termino_es.toLowerCase()).not.toBe("experiencias");
  });
  it("REQ-402 la precedencia 0–12 es única y sigue §4.1", () => {
    const orden = formatos.filter((f) => f.precedencia !== null).sort((a, b) => a.precedencia! - b.precedencia!).map((f) => f.slug);
    expect(orden).toEqual(["fuera", "traslado", "transporte", "alquiler", "entradas", "autoguiado", "pieza-libre", "circuito", "excursion-dia", "caminata", "experiencia-unica", "tour", "a-la-medida"]);
  });
});

describe("REQ-403 los 26 términos de 2024 solo son sinónimos", () => {
  const de2024 = D.legado.filter((l) => l.fuente === "taxonomia-2024");
  it("REQ-403 son 26 (incluye «Escalada en Roca») y cada uno apunta a un tema existente", () => {
    expect(de2024).toHaveLength(26);
    expect(de2024.map((l) => l.termino)).toContain("Escalada en Roca");
    for (const l of de2024) { expect(l.sinonimo_de.length).toBeGreaterThan(0); for (const s of l.sinonimo_de) expect(TEMAS).toContain(s); }
  });
  it("REQ-403 ninguno es un tema propio: si se llama como un tema, apunta a ese mismo tema", () => {
    const n = (s: string) => norm(s).trim();
    const temaPorNombre = new Map<string, string>(temas.flatMap((t) => [[n(t.termino_es), t.slug], [n(t.slug), t.slug]]));
    for (const l of de2024) { const s = temaPorNombre.get(n(l.termino)); if (s) expect(l.sinonimo_de).toContain(s); }
    expect(temas).toHaveLength(13);
  });
  it("REQ-403 «Hikes» es senderismo, no el formato caminata (G2)", () => {
    expect(D.legado.find((l) => l.termino.startsWith("Hikes"))?.sinonimo_de).toEqual(["montana-senderismo"]);
  });
  it("REQ-403 los 3 de Categorias.xlsx 2023: Idiomático y De temporada tras bandera, Estético descartado", () => {
    const de2023 = Object.fromEntries(D.legado.filter((l) => l.fuente === "categorias-2023").map((l) => [l.termino, l.estado]));
    expect(de2023).toEqual({ "Idiomático": "tras_bandera", "De temporada": "tras_bandera", "Estético": "descartado" });
  });
});

describe("REQ-411 urbano es base, no chip; temas en muestra hasta la firma", () => {
  it("REQ-411 «Ciudad y barrios» no es chip; los otros 12 sí", () => {
    expect(temas.filter((t) => !t.chip).map((t) => t.slug)).toEqual(["urbano"]);
  });
  it("REQ-411 los 13 temas quedan en «muestra» (REQ-410: se publican solo con la muestra firmada)", () => {
    for (const t of temas) expect(t.estado).toBe("muestra");
  });
});

describe("REQ-230 «Momentos de autor»", () => {
  const e = formatos.find((f) => f.slug === "experiencia-unica")!;
  it("REQ-230 el slug no cambia y el nombre en español es «Momentos de autor»", () => {
    expect(e.termino_es).toBe("Momentos de autor");
    expect(e.sinonimos).toEqual(expect.arrayContaining(["momentos de autor", "signature moments", "experiencia única"]));
  });
  it("REQ-230 «Signature moments» y pt/de/fr/it de §7.3 firmados; el apoyo es la definición de §7.3, sin «expertos locales» (PO 6-11)", () => {
    expect(e).toMatchObject({ termino_en: "Signature moments", termino_en_estado: "firmado", apoyo_es: "Algo para hacer, no solo para ver: talleres, clases, espectáculos, aventura o vida nocturna.", apoyo_estado: "firmado" });
    expect(`${e.apoyo_es} ${e.definicion_es}`).not.toMatch(/expert/i);
    expect(e.nombres).toEqual({ pt: "Momentos de autor", de: "Signature-Momente", fr: "Moments signature", it: "Momenti d'autore" });
  });
  it("REQ-230 ningún término visible se llama «Experiencia única»", () => {
    for (const t of D.terminos) expect(t.termino_es).not.toMatch(/experiencia única/i);
  });
});

describe("REQ-261 transporte y traslados fuera de Experiencias", () => {
  it("REQ-261 traslado, transporte y renta viven en /traslados; fuera y por-revisar en ningún lado; el resto en Experiencias", () => {
    const sec = Object.fromEntries(formatos.map((f) => [f.slug, f.seccion]));
    expect(sec).toMatchObject({ traslado: "traslados", transporte: "traslados", alquiler: "traslados", fuera: "ninguna", "por-revisar": "ninguna" });
    for (const f of ["pieza-libre", "caminata", "tour", "excursion-dia", "circuito", "experiencia-unica", "entradas", "autoguiado", "a-la-medida", "crucero"]) expect(sec[f]).toBe("experiencias");
  });
});

describe("REQ-433 el copy del diccionario no promete lo que no hay", () => {
  const textos = [
    ...D.terminos.flatMap((t) => [t.termino_es, t.termino_en, t.definicion_es, t.definicion_en ?? "", ...t.sinonimos, (t as TerminoFormato).apoyo_es ?? ""]),
    D.raiz.termino_es,
  ].join(" \n ").toLowerCase();
  it("REQ-433 sin MSI, pagos diferidos, opciones de pago ni la marca del proveedor", () => {
    for (const p of ["msi", "meses sin intereses", "paga después", "pagar después", "opciones de pago", "freetour", "free tour.com", "freetour.com"]) expect(textos).not.toContain(p);
  });
  it("REQ-433 «guía en español» nunca es una promesa del diccionario (solo el atributo idioma-es, con dato)", () => {
    expect(textos).not.toContain("guía en español");
  });
  it("REQ-433 los formatos sin guía en persona no dicen «guía local»", () => {
    for (const f of formatos.filter((x) => !x.guiaEnPersona)) expect(`${f.definicion_es} ${f.termino_es}`.toLowerCase()).not.toContain("guía local");
    expect(formatos.find((f) => f.slug === "autoguiado")?.guiaEnPersona).toBe(false);
  });
  it("REQ-433 «Momentos de autor» no promete exclusividad, privado ni grupo pequeño", () => {
    const e = formatos.find((f) => f.slug === "experiencia-unica")!;
    expect(`${e.definicion_es} ${e.apoyo_es}`.toLowerCase()).not.toMatch(/exclusiv|privad|grupo pequeño/);
  });
});
