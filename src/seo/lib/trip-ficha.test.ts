import { describe, expect, it } from "vitest";
import { tripFichaInput, tripProviderKey } from "./trip-ficha";
import { enBreve, fichaJsonLd } from "./ficha-ld";

const trip = {
  kind: "tour", titleEs: "Louvre con guía privado", titleEn: "Louvre private guide", summaryEs: "Visita privada al Louvre.", priceFrom: 189, currency: "EUR",
  durationDays: 1, languages: ["es"], options: [{ mode: "private" as const }], flightsIncluded: false, category: null, agencyId: "ag1",
  countries: ["FR"], cities: ["París"], meetingPoints: [{ name: "Pirámide del Louvre", address: "", lat: 48.86, lng: 2.33 }],
};
const input = tripFichaInput({
  trip, lang: "es", url: "https://travelpuzzle.com.mx/viajes/francia/louvre", title: "Louvre con guía privado", summary: "Visita privada al Louvre.",
  operator: "Extime Travel", duration: "1 día", languageNames: ["español"], priceText: "Desde MXN $3,980 · EUR €189", places: "París · Francia",
  includes: ["Guía privado", "Entrada"], formato: "visita-guiada", // REQ-1250: el Louvre con guía es Visita guiada
});

describe("REQ-576: la ficha de viaje lleva el mismo marcado que el tour", () => {
  it("REQ-576: nodo Product+TouristTrip con la moneda del viaje y su agencia", () => {
    const n = fichaJsonLd(input);
    expect(n["@type"]).toEqual(["Product", "TouristTrip"]);
    expect(n.offers).toMatchObject({ price: 189, priceCurrency: "EUR" });
    expect(n.provider).toEqual({ "@type": "Organization", name: "Extime Travel" });
    expect(n.tripOrigin).toMatchObject({ name: "Pirámide del Louvre" });
  });
  it("REQ-570: un viaje se enriquece (agencia o propio), con llave por agencia", () => {
    expect(tripProviderKey("ag1", "Extime Travel")).toBe("agencia:extime-travel");
    expect(tripProviderKey(null, null)).toBe("propios");
    expect(enBreve(input)).toContain("Lo opera Extime Travel");
  });
  it("REQ-581 REQ-822: el tipo es la etiqueta corta de la tarjeta (FORMATO_CARD_LABEL) y las etiquetas salen del clasificador", () => {
    expect(input.tipo).toBe("Visita guiada");
    expect(fichaJsonLd(input).additionalProperty).toEqual(expect.arrayContaining([{ "@type": "PropertyValue", name: "Tipo de experiencia", value: "Visita guiada" }]));
    expect(input.etiquetas).toContain("Privado");
    expect(fichaJsonLd(input).keywords).toContain("Privado");
  });
});
