import { describe, expect, it } from "vitest";
import { heroFacts } from "./hero-facts";

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
