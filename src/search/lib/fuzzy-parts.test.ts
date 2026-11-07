import { describe, expect, it } from "vitest";
import { fold, foldTokens } from "./normalize";
import { damerau, typoCost } from "./damerau";
import { thresholdByLength, letterCount } from "./threshold";
import { buildSymspellIndex, deserializeIndex, serializeIndex, symspellCandidates } from "./symspell";
import { esMetaphone } from "./es-metaphone";
import { deletesOf } from "./symspell";
const deletesOfFor = (w: string) => deletesOf(w, 1);

describe("REQ-280 normalize: plegado NFKD sin marcas, sin Intl ni toLocale*", () => {
  it("quita acentos y marcas de cualquier alfabeto latino", () => {
    expect(fold("Řím")).toBe("rim");
    expect(fold("  MÉXICO  ")).toBe("mexico");
    expect(fold("São Paulo")).toBe("sao paulo");
    expect(fold("Zürich")).toBe("zurich");
  });
  it("letras sin descomposición NFKD (ß, ø, ł, æ, œ) se pliegan a ASCII", () => {
    expect(fold("Straße")).toBe("strasse");
    expect(fold("København")).toBe("kobenhavn");
    expect(fold("Łódź")).toBe("lodz");
    expect(fold("Œuvre Æro")).toBe("oeuvre aero");
  });
  it("İ turca no deja un punto suelto", () => {
    expect(fold("İstanbul")).toBe("istanbul");
  });
  it("la puntuación separa palabras; CJK y cirílico se conservan (sin transliterar)", () => {
    expect(foldTokens("Tours, en Roma!")).toEqual(["tours", "en", "roma"]);
    expect(fold("罗马")).toBe("罗马");
    expect(fold("Рим")).toBe("рим");
  });
  it("vacío o nulo da cadena vacía", () => {
    expect(fold(undefined)).toBe("");
    expect(foldTokens(null)).toEqual([]);
  });
});

describe("REQ-281 damerau y umbrales por longitud", () => {
  it("Damerau-Levenshtein (OSA): la transposición cuenta 1", () => {
    expect(damerau("rmoa", "roma")).toBe(1);
    expect(damerau("barselona", "barcelona")).toBe(1);
    expect(damerau("roma", "roma")).toBe(0);
    expect(damerau("", "abc")).toBe(3);
    expect(damerau("kitten", "sitting")).toBe(3);
  });
  it("un error en la primera letra cuenta doble", () => {
    expect(typoCost("barselona", "barcelona")).toBe(1);
    expect(typoCost("varcelona", "barcelona")).toBe(2);
    expect(typoCost("pari", "bari")).toBe(2);
    expect(typoCost("oma", "roma")).toBe(2);
  });
  it("0 erratas por debajo de 4 letras, 1 de 4 a 7, 2 desde 8", () => {
    expect([1, 2, 3].map(thresholdByLength)).toEqual([0, 0, 0]);
    expect([4, 5, 6, 7].map(thresholdByLength)).toEqual([1, 1, 1, 1]);
    expect([8, 9, 20].map(thresholdByLength)).toEqual([2, 2, 2]);
  });
  it("la longitud cuenta letras, no espacios", () => {
    expect(letterCount("machu pichu")).toBe(10);
    expect(letterCount("rma")).toBe(3);
  });
});

describe("REQ-282 índice SymSpell (solo borrados) verificado con Damerau", () => {
  const terms = ["roma", "barcelona", "bari", "machu picchu", "cusco", "rumania"];
  const index = buildSymspellIndex(terms, 2);
  it("es serializable y determinista (mismo orden, mismo contenido)", () => {
    const again = buildSymspellIndex([...terms].reverse(), 2);
    expect(JSON.stringify(serializeIndex(again))).toBe(JSON.stringify(serializeIndex(index)));
    const back = deserializeIndex(JSON.parse(JSON.stringify(serializeIndex(index))));
    expect(symspellCandidates(back, "barselona", 2)).toEqual(symspellCandidates(index, "barselona", 2));
  });
  it("encuentra la errata dentro de la distancia pedida", () => {
    expect(symspellCandidates(index, "barselona", 2)).toEqual([{ term: "barcelona", distance: 1 }]);
    expect(symspellCandidates(index, "rmoa", 1)).toEqual([{ term: "roma", distance: 1 }]);
    expect(symspellCandidates(index, "machu pichu", 2)).toEqual([{ term: "machu picchu", distance: 1 }]);
  });
  it("con distancia 0 solo devuelve la palabra exacta", () => {
    expect(symspellCandidates(index, "roma", 0)).toEqual([{ term: "roma", distance: 0 }]);
    expect(symspellCandidates(index, "rma", 0)).toEqual([]);
  });
  it("ordena por distancia y luego alfabético; nunca pasa la distancia pedida", () => {
    const r = symspellCandidates(index, "bara", 2).map((c) => c.term);
    expect(r[0]).toBe("bari");
    for (const c of symspellCandidates(index, "bara", 2)) expect(c.distance).toBeLessThanOrEqual(2);
  });
});

describe("REQ-283 esMetaphone con seseo (S = Z = CE/CI)", () => {
  it("b/v, ll/y, h muda y ce/ci/z/s suenan igual", () => {
    expect(esMetaphone("barcelona")).toBe(esMetaphone("barselona"));
    expect(esMetaphone("barcelona")).toBe(esMetaphone("varzelona"));
    expect(esMetaphone("llama")).toBe(esMetaphone("yama"));
    expect(esMetaphone("habana")).toBe(esMetaphone("abana"));
    expect(esMetaphone("cuzco")).toBe(esMetaphone("cusco"));
    expect(esMetaphone("machu picchu")).toBe(esMetaphone("machu pichu"));
  });
  it("gue/gui/que/qui y ge/gi/j", () => {
    expect(esMetaphone("guerra")).not.toBe(esMetaphone("gerra")); // gue = g dura; ge = j
    expect(esMetaphone("guerra")).toBe(esMetaphone("gera".replace("ge", "gue")));
    expect(esMetaphone("guitarra")).toBe(esMetaphone("guitara"));
    expect(esMetaphone("quito")).toBe(esMetaphone("kito"));
    expect(esMetaphone("gerona")).toBe(esMetaphone("jerona"));
  });
  it("distingue lo que de verdad suena distinto", () => {
    expect(esMetaphone("roma")).not.toBe(esMetaphone("rumania"));
    expect(esMetaphone("bari")).not.toBe(esMetaphone("bali"));
    expect(esMetaphone("lima")).not.toBe(esMetaphone("lyon"));
  });
  it("vacío da vacío", () => {
    expect(esMetaphone("")).toBe("");
  });
  it("borrados de palabras fuera del plano básico (emoji, CJK ampliado) se cortan por punto de código", () => {
    expect([...deletesOfFor("a😀b")].sort()).toEqual(["a😀", "a😀b", "ab", "😀b"].sort());
  });
});

describe("REQ-282 el prefijo de 7 letras no pierde candidatos (contra fuerza bruta)", () => {
  const names = ["santiago de compostela", "barcelona", "machu picchu", "rio de janeiro", "ciudad de mexico", "amsterdam",
    "budapest", "dubrovnik", "florencia", "roma", "bari", "cusco", "san petersburgo", "buenos aires", "estambul", "kioto"];
  const index = buildSymspellIndex(names, 2);
  // erratas deterministas: borrar, cambiar, insertar y trasponer en cada posición
  const typos = (w: string) => {
    const out = new Set<string>();
    for (let i = 0; i < w.length; i++) {
      out.add(w.slice(0, i) + w.slice(i + 1));
      out.add(w.slice(0, i) + "x" + w.slice(i + 1));
      out.add(w.slice(0, i) + "e" + w.slice(i));
      if (i + 1 < w.length) out.add(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2));
    }
    return [...out];
  };
  it("mismos candidatos que comparar contra todos los nombres", () => {
    for (const n of names) for (const q of typos(n)) {
      const brute = names.map((t) => ({ term: t, distance: damerau(q, t) })).filter((c) => c.distance <= 2)
        .sort((a, b) => a.distance - b.distance || (a.term < b.term ? -1 : 1));
      expect(symspellCandidates(index, q, 2)).toEqual(brute);
    }
  });
});
