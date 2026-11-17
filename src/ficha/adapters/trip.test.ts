// REQ-10779: adaptador de viajes de agencia y Big Bus contra un fixture real (D1 de producción, 17-11-2026, datos públicos).
import { describe, expect, it } from "vitest";
import fixture from "../../../tests/fixtures/trips/tas-mys-01-malasia-esencial.json";
import { tripToFicha, type TripInput } from "./trip";
import { checkFicha } from "../schemas/ficha";

const base = (): TripInput => ({
  row: fixture as unknown as TripInput["row"],
  texts: { title: fixture.titleEs, summary: fixture.summaryEs, description: fixture.descriptionEs },
  gallery: fixture.images.map((im) => ({ url: `https://travelpuzzle.com.mx/img/${im.key}`, alt: im.alt })),
  city: { slug: "kuala-lumpur", name: "Kuala Lumpur" },
  country: { code: "MY", name: "Malasia" },
  lang: "es",
  taxonomy: { tipo: { slug: "circuito", label: "Circuito" }, temas: [{ slug: "cultura", label: "Cultura" }], atributos: [] },
  format: "circuito",
  map: { kind: "exact", lat: 2.7456, lng: 101.7072, directions: true },
  agencyName: fixture.agencyName,
});

describe("REQ-10779: viaje de agencia → modelo de la ficha", () => {
  it("REQ-10779: el fixture real pasa el esquema con código Travel Puzzle, itinerario por día, destacados, opciones y precio desde", () => {
    const f = tripToFicha(base());
    expect(checkFicha(f).ok).toBe(true);
    expect(f).toMatchObject({ provider: "propios", code: "TAS-MY-C07-001", externalRef: "TAS-MY-C07-001", section: "experiencias", title: "Malasia Esencial: Kuala Lumpur, Penang y selva de Belum", rating: null, operator: "Turismo Asiático" });
    expect(f.itinerary).toHaveLength(2);
    expect(f.itinerary[0]).toEqual({ day: 1, title: "Día 1 (miércoles) · Llegada a Kuala Lumpur", text: expect.stringContaining("Llegada al aeropuerto") });
    expect(f.highlights).toHaveLength(5);
    expect(f.options.map((o) => [o.id, o.price?.amount])).toEqual([["h4", 1836], ["h5", 2352]]);
    expect(f.price).toEqual({ amount: 1836, currency: "USD", per: "person" });
    expect(f.facts).toMatchObject({ durationMinutes: 7 * 1440, languages: ["es"], difficulty: 2, ages: { childFrom: 3, childTo: 11 } });
    expect(f.gallery[0].alt).toBe("Plantaciones de té de Cameron Highlands");
    expect(f.meeting).toMatchObject({ kind: "exact", title: expect.stringContaining("Aeropuerto Internacional de Kuala Lumpur") });
    expect(f.booking).toEqual({ mode: "request", chargedBy: "travelpuzzle", leadHours: 744 });
    expect(f.notes[0]).toMatch(/^Salidas regulares/);
  });
  it("REQ-10779: una sola cancelación (decisión 34): sin tramo con reembolso íntegro queda «parcial»; estándar = 24 h; con 100 % a N días, N×24 h", () => {
    expect(tripToFicha(base()).cancellation).toEqual({ hours: null, text: "partial" });
    expect(tripToFicha({ ...base(), row: { ...base().row, cancellation: { type: "standard", tiers: [] } } }).cancellation).toEqual({ hours: 24, text: null });
    expect(tripToFicha({ ...base(), row: { ...base().row, cancellation: { type: "custom", tiers: [{ daysBefore: 10, refundPct: 100 }, { daysBefore: 0, refundPct: 0 }] } } }).cancellation).toEqual({ hours: 240, text: null });
    expect(tripToFicha({ ...base(), row: { ...base().row, cancellation: null } }).cancellation).toBeNull();
  });
  it("REQ-10779: Big Bus y todo traslado caen en la sección Traslados (decisión 1); compra directa = purchase", () => {
    const f = tripToFicha({ ...base(), format: "transporte", row: { ...base().row, purchaseMode: "buy", agencyId: "ag-bbt" }, agencyName: "Big Bus Tours" });
    expect(f.section).toBe("traslados");
    expect(f.booking.mode).toBe("purchase");
    expect(f.operator).toBe("Big Bus Tours");
    expect(tripToFicha({ ...base(), format: "traslado" }).section).toBe("traslados");
  });
  it("REQ-10779: con una sola opción no hay bloque de opciones; sin punto, «none»; nada inventado", () => {
    const f = tripToFicha({ ...base(), map: null, row: { ...base().row, options: [{ id: "h4", name: "Única", adult: 100 }], meetingPoints: [], priceFrom: null, difficultyLevel: 9 } });
    expect(f.options).toEqual([]);
    expect(f.meeting).toEqual({ kind: "none", title: null });
    expect(f.price).toBeNull();
    expect(f.facts.difficulty).toBeNull();
    expect(checkFicha(f).ok).toBe(true);
  });
});
