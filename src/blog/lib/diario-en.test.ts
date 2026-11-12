import { describe, expect, it } from "vitest";
import { dailyEnProblems } from "./diario-en";
import { postSchema } from "./schema";
import { sampleDaily, sampleDailyEn } from "./fixtures";

const post = (o: Record<string, unknown> = {}) => postSchema.parse(sampleDaily(o));
const en = (o: Record<string, unknown>) => ({ en: sampleDailyEn(o) });

describe("REQ-3452: entrada diaria del blog en inglés (gate B2)", () => {
  it("REQ-3452: la entrada con su versión en inglés pasa", () => {
    expect(dailyEnProblems(post(), [])).toEqual([]);
  });

  it("REQ-3452: sin versión en inglés no pasa", () => {
    expect(dailyEnProblems(post({ en: undefined }), [])).toContain("falta la versión en inglés (en)");
  });

  it("REQ-3452: misma estructura: secciones, datos, tabla e imágenes", () => {
    const three = sampleDailyEn().sections.slice(0, 3).concat([{ ...sampleDailyEn().sections[0], h2: "Other?" }, { ...sampleDailyEn().sections[1], h2: "More?" }]);
    expect(dailyEnProblems(post(en({ sections: three })), []).join(" ")).toMatch(/inglés: debe tener las mismas 4 secciones/);
    expect(dailyEnProblems(post(en({ datos: [] })), []).join(" ")).toMatch(/inglés: debe traducir los 1 datos/);
    expect(dailyEnProblems(post(en({ visual: { caption: "T", head: ["A", "B", "C"], rows: [["x", "y", "z"]] } })), []).join(" ")).toMatch(/inglés: la tabla debe tener las mismas columnas y filas/);
    expect(dailyEnProblems(post(en({ imagenes: [{ alts: ["only one"] }] })), []).join(" ")).toMatch(/inglés: cada foto necesita su alt en inglés/);
    expect(dailyEnProblems(post(en({ cover: undefined })), []).join(" ")).toMatch(/inglés: falta el alt de la portada/);
  });

  it("REQ-3452: «In short» de 40 a 80 palabras, AI en «How we know» y sin FREETOUR", () => {
    expect(dailyEnProblems(post(en({ enBreve: "too short" })), []).join(" ")).toMatch(/inglés: «In short» debe tener de 40 a 80 palabras/);
    expect(dailyEnProblems(post(en({ comoLoSabemos: "Written after interviews." })), []).join(" ")).toMatch(/inglés: «How we know» debe decir que se usó AI/);
    expect(dailyEnProblems(post(en({ title: "FREETOUR test" })), []).join(" ")).toMatch(/inglés: vocabulario prohibido: «FREETOUR»/);
  });

  it("REQ-3452: los enlaces internos en inglés son los mismos de la versión en español", () => {
    expect(dailyEnProblems(post(en({ entrada: "See [China](/blog/china)." })), []).join(" ")).toMatch(/inglés: enlace que no está en la versión en español: \/blog\/china/);
  });

  it("REQ-3452: el término en inglés no repite el de otra entrada", () => {
    const other = post({ slug: "otra", targetTerm: "otro termino", en: sampleDailyEn({ targetTerm: "english termino diario de prueba" }) });
    expect(dailyEnProblems(post(), [other]).join(" ")).toMatch(/inglés: término repetido o casi igual/);
  });
});
