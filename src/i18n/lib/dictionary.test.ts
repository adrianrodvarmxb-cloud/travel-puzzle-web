import { describe, expect, it } from "vitest";
import { initialDictionaries, translate, withDictionary } from "./dictionary";

const es = { "nav.home": "Inicio", vacio: "" };
const en = { "nav.home": "Home" };

describe("REQ-10869: traducción con diccionarios cargados bajo demanda", () => {
  it("REQ-10869: traduce con el diccionario del idioma", () => {
    expect(translate({ es, en }, "en", "nav.home")).toBe("Home");
    expect(translate({ es, en }, "es", "nav.home")).toBe("Inicio");
  });
  it("REQ-10869: sin la clave (o vacía) devuelve el respaldo o la clave, igual que antes", () => {
    expect(translate({ es }, "es", "no.existe")).toBe("no.existe");
    expect(translate({ es }, "es", "no.existe", "Respaldo")).toBe("Respaldo");
    expect(translate({ es }, "es", "vacio", "Respaldo")).toBe("Respaldo");
    expect(translate({ es }, "es", "no.existe", "")).toBe("");
  });
  it("REQ-10869: idioma sin diccionario cargado no truena: respaldo o clave", () => {
    expect(translate({ es }, "de", "nav.home")).toBe("nav.home");
    expect(translate({ es }, "de", "nav.home", "Start")).toBe("Start");
  });
  it("REQ-10869: arranca con español y, si el servidor pintó otro idioma, también con ese", () => {
    expect(initialDictionaries(es)).toEqual({ es });
    expect(initialDictionaries(es, "es", en)).toEqual({ es });
    expect(initialDictionaries(es, "en")).toEqual({ es });
    expect(initialDictionaries(es, "en", en)).toEqual({ es, en });
  });
  it("REQ-10869: agregar un diccionario no muta el estado anterior", () => {
    const a = { es };
    const b = withDictionary(a, "en", en);
    expect(a).toEqual({ es });
    expect(b).toEqual({ es, en });
    expect(withDictionary(b, "en", en)).toBe(b);
  });
});
