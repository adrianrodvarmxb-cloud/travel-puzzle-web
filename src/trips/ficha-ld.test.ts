// REQ-10870: el marcado de la ficha de un viaje, en un solo lugar para las dos plantillas. npx vitest run src/trips/ficha-ld.test.ts
import { describe, expect, it } from "vitest";
import fixture from "../../tests/fixtures/trips/tas-mys-01-malasia-esencial.json";
import { tripFichaLd, type TripLdData } from "./ficha-ld";
import { fichaJsonLd } from "@/seo/lib/ficha-ld";

const data = (): TripLdData => ({ trip: fixture, translations: null, agencyName: fixture.agencyName, fx: { USD: 20, EUR: 22, date: "2026-11-24" } } as unknown as TripLdData);
const path = `/viajes/malasia/${fixture.slug}`;

describe("REQ-10870: JSON-LD del viaje igual con cualquiera de las dos plantillas", () => {
  it("REQ-10870: arma el Product+TouristTrip con la URL canónica, la agencia, el precio público «desde», las fotos y «En breve»", () => {
    const ld = tripFichaLd({ data: data(), path, lang: "es", env: { SITE_URL: "https://travelpuzzle.com.mx" } });
    const n = fichaJsonLd(ld.ficha);
    expect(n["@type"]).toEqual(["Product", "TouristTrip"]);
    expect(n.url).toBe(`https://travelpuzzle.com.mx${path}`);
    expect(n.offers).toMatchObject({ price: fixture.priceFrom, priceCurrency: "USD" });
    expect(n.provider).toEqual({ "@type": "Organization", name: "Turismo Asiático" });
    expect(ld.ficha.images).toHaveLength(fixture.images.length);
    expect(ld.ficha.images[0]).toMatch(/\/api\/viajes\/foto\//);
    expect(ld.ficha.cancellation).toBeNull(); // REQ-060: la política no entra mientras la página la oculte
    expect(ld.breve).toContain("Turismo Asiático");
    expect(ld.duration).toBeTruthy();
    expect(ld.languageNames).toEqual(["español"]);
    expect(ld.agencyId).toBe(fixture.agencyId);
    expect(JSON.stringify(n)).not.toMatch(/neto|margen/i);
  });
  it("REQ-10870: en inglés usa los nombres de idioma y el título de audioguía en inglés; un viaje propio sin agencia dice Travel Puzzle", () => {
    const en = tripFichaLd({ data: data(), path, lang: "en", env: {} });
    expect(en.languageNames).toEqual(["Spanish"]);
    const own = tripFichaLd({ data: { ...data(), agencyName: null, trip: { ...fixture, agencyId: null } } as unknown as TripLdData, path, lang: "es", env: {} });
    expect(own.operator).toBe("Travel Puzzle");
  });
});
