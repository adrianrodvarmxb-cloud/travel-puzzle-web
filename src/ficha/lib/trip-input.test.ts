// REQ-10835: entrada del adaptador de viajes desde el viaje guardado (fixture real). npx vitest run src/ficha/lib/trip-input.test.ts
import { describe, expect, it } from "vitest";
import fixture from "../../../tests/fixtures/trips/tas-mys-01-malasia-esencial.json";
import { tripFichaInput, tripFichaModel, type TripFichaSource } from "./trip-input";
import { checkFicha } from "../schemas/ficha";
import type { StoredTrip } from "@/trips/manage";

const source = (): TripFichaSource => ({ trip: fixture as unknown as StoredTrip, translations: { en: { title: { text: "Essential Malaysia", source: "x" } } } as never, agencyName: fixture.agencyName });
const env = { ZONE_MAP_ENABLED: "true", CITY_PIN_FALLBACK_ENABLED: "true" };
const siteUrl = "https://travelpuzzle.com.mx/";

describe("REQ-10835: viaje guardado → entrada del adaptador → modelo", () => {
  it("REQ-10835: arma textos, galería pública, ciudad y país principales y formato con el clasificador oficial", () => {
    const i = tripFichaInput(source(), { lang: "es", env, siteUrl });
    expect(i.texts.title).toBe(fixture.titleEs);
    expect(i.gallery[0]).toEqual({ url: `https://travelpuzzle.com.mx/api/viajes/foto/${fixture.images[0].key}`, alt: fixture.images[0].alt || null });
    expect(i.gallery.every((g) => g.url.startsWith("https://"))).toBe(true);
    expect(i.city).toEqual({ slug: "kuala-lumpur", name: "Kuala Lumpur" });
    expect(i.country).toEqual({ code: "MY", name: "Malasia" });
    expect(i.format).toBe("circuito");
    expect(i.taxonomy.tipo).toEqual({ slug: "circuito", label: expect.any(String) });
    expect(i.agencyName).toBe(fixture.agencyName);
  });
  it("REQ-10835: en inglés usa la traducción si existe y el español como respaldo", () => {
    const i = tripFichaInput(source(), { lang: "en", env, siteUrl });
    expect(i.texts.title).toBe("Essential Malaysia");
    expect(i.texts.summary).toBe(fixture.summaryEs);
    expect(i.country.name).toBe("Malaysia");
  });
  it("REQ-10835: el mapa es el punto exacto del primer punto de encuentro con coordenadas; sin coordenadas, null (sin centro inventado)", () => {
    const con = tripFichaInput(source(), { lang: "es", env, siteUrl });
    const p = (fixture.meetingPoints as { lat: number | null; lng: number | null }[]).find((m) => typeof m.lat === "number");
    if (p) expect(con.map).toMatchObject({ kind: "exact", lat: p.lat, lng: p.lng });
    const sin = tripFichaInput({ ...source(), trip: { ...(fixture as unknown as StoredTrip), meetingPoints: [{ name: "Hotel", lat: null, lng: null }] } as StoredTrip }, { lang: "es", env, siteUrl });
    expect(sin.map).toBeNull();
  });
  it("REQ-10835: el modelo resultante pasa el esquema y no trae teléfonos ni correos de la agencia", () => {
    const f = tripFichaModel(source(), { lang: "es", env, siteUrl });
    expect(checkFicha(f).ok).toBe(true);
    expect(f).toMatchObject({ provider: "propios", code: fixture.code, slug: fixture.slug, section: "experiencias" });
    expect(JSON.stringify(f)).not.toMatch(/@|\+\d{2} ?\d{2}/);
  });
});
