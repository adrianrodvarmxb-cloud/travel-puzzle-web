import { describe, expect, it } from "vitest";
import { heroFacts, heroFactsLayout } from "./hero-facts";

const labels = { duration: "Duración", destination: "Destino", meetingPoint: "Punto de Encuentro", provider: "Proveedor" };
const tour = { duration: "2:30", destination: "París", meetingPoint: "Zócalo", provider: "Guía Ana" };
const freetour = { enrichment: false, facts: { duration: "2 h 30 min", extra: [], clientOnly: { label: "Idioma del guía", codes: '["en","sp"]' } } };
const otro = { enrichment: true, facts: { duration: "2 h 30 min", extra: [{ label: "Idioma del guía", value: "Inglés, Español" }] } };
const find = (xs: ReturnType<typeof heroFacts>, k: string) => xs.find((x) => x.key === k);

describe("REQ-588: FREETOUR — idioma del guía y punto de encuentro visibles, sin indexar", () => {
  it("REQ-588: en el servidor no va el idioma del guía (como antes del #204); el punto de encuentro sí, con data-nosnippet", () => {
    const f = heroFacts({ labels, tour, view: freetour, mounted: false, lang: "es" });
    expect(find(f, "idioma-guia")).toBeUndefined();
    expect(find(f, "punto-encuentro")).toEqual({ key: "punto-encuentro", label: "Punto de Encuentro", value: "Zócalo", nosnippet: true });
  });
  it("REQ-588: en el cliente (ya montado) se ve «Idioma del guía», también con data-nosnippet", () => {
    const f = heroFacts({ labels, tour, view: freetour, mounted: true, lang: "es" });
    expect(find(f, "idioma-guia")).toEqual({ key: "idioma-guia", label: "Idioma del guía", value: "Inglés, Español", nosnippet: true });
  });
  it("REQ-588: con enriquecimiento no cambia: idioma en el servidor y sin data-nosnippet", () => {
    const f = heroFacts({ labels, tour, view: otro, mounted: false, lang: "es" });
    expect(find(f, "idioma-guia")).toEqual({ key: "idioma-guia", label: "Idioma del guía", value: "Inglés, Español", nosnippet: false });
    expect(find(f, "punto-encuentro")?.nosnippet).toBe(false);
  });
  it("REQ-588: sin ficha de /destinos (/tours/[id]) queda como antes del #204", () => {
    const f = heroFacts({ labels, tour, view: null, mounted: true, lang: "es" });
    expect(f.map((x) => [x.label, x.value, x.nosnippet])).toEqual([["Duración", "2:30", false], ["Destino", "París", false], ["Punto de Encuentro", "Zócalo", false], ["Proveedor", "Guía Ana", false]]);
  });
});

describe("REQ-10538 / REQ-10539: detalles prácticos e idiomas del guía en la franja", () => {
  const practical = [
    { key: "horario-salida", label: "Horarios de salida", value: "09:00, 14:30", clientOnly: false },
    { key: "punto-termino", label: "Punto de término", value: "Plaza de Mayo", clientOnly: false },
    { key: "edad-ninos", label: "Edad de niño", value: "3 a 11 años", clientOnly: false },
    { key: "idioma-guia", label: "Idioma del guía", value: "Español, Inglés", clientOnly: false },
  ];
  const tangol = { duration: "3 Horas", destination: "Bariloche", meetingPoint: "", provider: "Tangol Tours" };

  it("REQ-10538: en /tours/[id] los hechos prácticos entran después de los de siempre, en su orden", () => {
    const f = heroFacts({ labels, tour: tangol, view: null, mounted: false, lang: "es", practical });
    expect(f.map((x) => x.key)).toEqual(["duracion", "destino", "proveedor", "horario-salida", "punto-termino", "edad-ninos", "idioma-guia"]);
    expect(find(f, "punto-termino")).toEqual({ key: "punto-termino", label: "Punto de término", value: "Plaza de Mayo", nosnippet: false });
  });

  it("REQ-10539: en /destinos la ficha ya trae el idioma del guía: no se repite", () => {
    const f = heroFacts({ labels, tour: tangol, view: otro, mounted: true, lang: "es", practical });
    expect(f.filter((x) => x.key === "idioma-guia")).toHaveLength(1);
    expect(find(f, "horario-salida")?.value).toBe("09:00, 14:30");
  });

  it("REQ-10539: idioma solo-cliente (FREETOUR): no va en el servidor; montado, sí y con data-nosnippet (REQ-588)", () => {
    const solo = [{ key: "idioma-guia", label: "Idioma del guía", value: "Inglés", clientOnly: true }];
    expect(find(heroFacts({ labels, tour, view: null, mounted: false, lang: "es", practical: solo }), "idioma-guia")).toBeUndefined();
    expect(find(heroFacts({ labels, tour, view: null, mounted: true, lang: "es", practical: solo }), "idioma-guia")).toEqual({ key: "idioma-guia", label: "Idioma del guía", value: "Inglés", nosnippet: true });
  });

  it("REQ-10542: la casilla Proveedor muestra el operador tal cual («Tangol Tours»)", () => {
    expect(find(heroFacts({ labels, tour: tangol, view: null, mounted: false, lang: "es" }), "proveedor")?.value).toBe("Tangol Tours");
  });
});

describe("REQ-10541: la franja nunca pinta casillas vacías", () => {
  const tangol = { duration: "3 Horas", destination: "Bariloche", meetingPoint: "", provider: "Tangol Tours" };

  it("REQ-10541: un punto de encuentro vacío o con solo espacios no genera casilla (caso de la captura del PO)", () => {
    const f = heroFacts({ labels, tour: { ...tangol, meetingPoint: "   " }, view: null, mounted: false, lang: "es", practical: [{ key: "punto-termino", label: "x", value: " ", clientOnly: false }] });
    expect(f.map((x) => x.label)).toEqual(["Duración", "Destino", "Proveedor"]);
    for (const x of f) expect(x.value.trim()).not.toBe("");
  });

  it("REQ-10541: la rejilla no tiene columnas fijas: tenga las casillas que tenga, cada fila se llena (no queda hueco gris)", () => {
    {
      const l = heroFactsLayout();
      expect(l.list).not.toMatch(/grid-cols-/);
      expect(l.list).toMatch(/\bflex\b/);
      expect(l.list).toMatch(/\bflex-wrap\b/);
      // Cada casilla crece para ocupar lo que sobra de su fila: el fondo gris del contenedor nunca queda a la vista.
      expect(l.item).toMatch(/\bgrow\b/);
      expect(l.item).toMatch(/basis-/);
    }
  });
});
