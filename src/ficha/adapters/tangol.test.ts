// REQ-10777: adaptador de Tangol contra un fixture real (D1 de producción, 17-11-2026, datos públicos).
import { describe, expect, it } from "vitest";
import fixture from "../../../tests/fixtures/tangol/tour-43-glaciar-perito-moreno.json";
import { tangolToFicha, type TangolInput } from "./tangol";
import { checkFicha } from "../schemas/ficha";

const base = (): TangolInput => ({
  row: fixture as unknown as TangolInput["row"],
  translation: fixture.translation,
  city: { slug: fixture.city.slug, name: fixture.city.name },
  country: fixture.country,
  lang: "es",
  taxonomy: { tipo: { slug: "excursion-de-un-dia", label: "Excursión de un día" }, temas: [{ slug: "naturaleza", label: "Naturaleza" }], atributos: [] },
  map: null,
});

describe("REQ-10777: Tangol → modelo de la ficha", () => {
  it("REQ-10777: el fixture real pasa el esquema y llena los bloques con dato; sin dato queda null o vacío (nunca N/D)", () => {
    const f = tangolToFicha(base());
    expect(checkFicha(f).ok).toBe(true);
    expect(f).toMatchObject({ provider: "tangol", externalRef: "43", slug: "glaciar-perito-moreno", section: "experiencias", title: "Glaciar Perito Moreno" });
    expect(f.gallery).toHaveLength(6);
    expect(f.facts).toMatchObject({ durationMinutes: 480, schedule: "09:00 · 07:15", languages: ["es", "en"], difficulty: 1, ages: { childFrom: 3, childTo: 9 }, season: null });
    expect(f.includes).toEqual(["Servicio de transporte.", "Guías Español/Inglés.", "Opcional: Navegación frente al Glaciar Perito Moreno."]);
    expect(f.excludes).toHaveLength(4);
    expect(f.whatToBring).toEqual(["Cámara de fotos.", "Ropa de abrigo.", "Lentes de sol.", "Dinero para gastos personales."]);
    expect(f.requirements).toEqual(["Bajo."]);
    expect(f.notes[0]).toMatch(/^\*El pick up/);
    expect(f.price).toEqual({ amount: 98, currency: "USD", per: "person" });
    expect(f.options.map((o) => o.id)).toEqual(["38", "53673"]);
    expect(f.highlights).toEqual([]); expect(f.itinerary).toEqual([]); expect(f.brief).toMatch(/^La excursión al Glaciar/);
    expect(f.descriptionHtml).toContain("<strong>Parque Nacional Los Glaciares.</strong>");
    expect(f.descriptionHtml).not.toMatch(/style=/);
  });
  it("REQ-10777: decisiones firmadas: nota de Tangol oculta (18), operador discreto (38), cancelación única la más estricta (34)", () => {
    const f = tangolToFicha(base());
    expect(f.rating).toBeNull();
    expect(f.operator).toBe("Tangol Tours");
    expect(f.cancellation).toEqual({ hours: 48, text: null }); // 48 h de la opción 38 gana a «Gratis Hasta 24hs Antes»
    expect(f.booking).toEqual({ mode: "request", chargedBy: "travelpuzzle", leadHours: 24 });
  });
  it("REQ-10777: el punto de encuentro sigue la vista del mapa que llega por parámetro; sin ella, «none» con el título limpio", () => {
    expect(tangolToFicha(base()).meeting).toEqual({ kind: "none", title: "Hoteles céntricos de El Calafate Abril a Septiembre: Pick up a partir de las 09.00 hs. Octubre a Marzo: Pick up a partir de las 07.15 hs." });
    expect(tangolToFicha({ ...base(), map: { kind: "zone", lat: -50.34, lng: -72.26, radiusM: 1500, directions: false } }).meeting).toMatchObject({ kind: "zone", radiusM: 1500 });
    expect(tangolToFicha({ ...base(), map: { kind: "exact", lat: -50.34, lng: -72.26, directions: true } }).meeting).toMatchObject({ kind: "exact", lat: -50.34 });
  });
  it("REQ-10777: marca blanca: ningún teléfono ni correo del proveedor entra al modelo, aunque la fila los traiga", () => {
    const f = tangolToFicha({ ...base(), row: { ...base().row, providerPhone: "+54 11 5555", providerEmail: "x@tangol.com" } as never });
    expect(checkFicha(f).ok).toBe(true);
    expect(JSON.stringify(f)).not.toMatch(/5555|@tangol\.com/); // las fotos sí viven en www.tangol.com
  });
  it("REQ-10777: con una sola opción no hay bloque de opciones; sin reglas, sin horario ni plazo", () => {
    const f = tangolToFicha({ ...base(), row: { ...base().row, availabilityRules: { options: [{ code: "1", startTime: "10:00" }] } } });
    expect(f.options).toEqual([]);
    expect(f.facts.schedule).toBe("10:00");
    const g = tangolToFicha({ ...base(), row: { ...base().row, availabilityRules: null, cancellationPolicy: null } });
    expect(g.facts.schedule).toBeNull(); expect(g.booking.leadHours).toBeNull(); expect(g.cancellation).toBeNull();
  });
});
