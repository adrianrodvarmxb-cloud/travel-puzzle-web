// REQ-10778: adaptador de FREETOUR contra un fixture real (D1 de producción, 17-11-2026, datos públicos).
import { describe, expect, it } from "vitest";
import fixture from "../../../tests/fixtures/freetour/tour-30042-edimburgo.json";
import { freetourToFicha, type FreetourInput } from "./freetour";
import { checkFicha } from "../schemas/ficha";

const base = (): FreetourInput => ({
  row: fixture as unknown as FreetourInput["row"],
  translation: fixture.translation,
  city: { slug: fixture.city.slug, name: fixture.city.name },
  country: fixture.country,
  lang: "es",
  taxonomy: { tipo: { slug: "free-tour", label: "Free tour" }, temas: [], atributos: [{ slug: "a-pie", label: "A pie" }, { slug: "guia-local", label: "Guía local" }] },
  map: { kind: "exact", lat: 55.9497, lng: -3.1912, directions: true },
});

describe("REQ-10778: FREETOUR → modelo de la ficha", () => {
  it("REQ-10778: el fixture real pasa el esquema; free tour sin precio, con punto exacto, nota visible y operador visible (como hoy)", () => {
    const f = freetourToFicha(base());
    expect(checkFicha(f).ok).toBe(true);
    expect(f).toMatchObject({ provider: "freetour", externalRef: "30042", section: "experiencias", title: "Free Tour Esencial de Edimburgo: Centro Histórico", price: null, operator: "Somos Escocia" });
    expect(f.rating).toEqual({ value: 4.83, count: 1387, favorite: false });
    expect(f.gallery.map((g) => g.url)).toHaveLength(3);
    expect(f.meeting).toEqual({ kind: "exact", lat: 55.9497, lng: -3.1912, title: "351 High Street (Royal Mile), frente a la Catedral de St. Giles." });
    expect(f.facts).toEqual({ durationMinutes: 120, schedule: null, languages: ["de", "en", "es", "fr", "it"], season: null, difficulty: null, ages: null });
    expect(f.includes).toContain("Guía local");
    expect(f.booking).toEqual({ mode: "calendar", chargedBy: "none", leadHours: null });
    expect(f.cancellation).toEqual({ hours: null, text: null }); // gratis hasta el inicio (D3)
  });
  it("REQ-10778: «En breve» oculto (REQ-570) y la descripción va en párrafos sin reescribir (C2)", () => {
    const f = freetourToFicha(base());
    expect(f.brief).toBeNull();
    expect(f.descriptionHtml).toMatch(/^<p>En este recorrido hablaremos/);
    expect(f.descriptionHtml).toContain("</p><p>También visitaremos");
    expect(f.descriptionHtml).not.toMatch(/style=|<span/);
  });
  it("REQ-10778: un tour de pago lleva precio en EUR, cobra FREETOUR y cancela gratis hasta 24 h antes (D3, D5)", () => {
    const f = freetourToFicha({ ...base(), row: { ...base().row, priceValue: 25, priceCurrency: "EUR" } });
    expect(f.price).toEqual({ amount: 25, currency: "EUR", per: "person" });
    expect(f.booking).toEqual({ mode: "calendar", chargedBy: "provider", leadHours: null });
    expect(f.cancellation).toEqual({ hours: 24, text: null });
  });
  it("REQ-10778: «Favorito» solo con 4.9 y 180 reseñas (decisión 16); sin coordenadas y sin mapa, punto «none»", () => {
    expect(freetourToFicha({ ...base(), row: { ...base().row, rating: 4.9, reviewsNumber: 180 } }).rating?.favorite).toBe(true);
    expect(freetourToFicha({ ...base(), map: null }).meeting).toEqual({ kind: "none", title: "351 High Street (Royal Mile), frente a la Catedral de St. Giles." });
  });
  it("REQ-10778: nada de teléfonos ni correos del proveedor en el modelo", () => {
    const f = freetourToFicha({ ...base(), row: { ...base().row, providerPhone: "+44 7700 900000" } as never });
    expect(checkFicha(f).ok).toBe(true);
    expect(JSON.stringify(f)).not.toContain("7700 900000");
  });
});
