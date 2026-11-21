// REQ-10843: entrada del adaptador de Tangol desde la fila de `Tour` tal como la guarda el sitio (fixture real, 17-11-2026).
import { describe, expect, it } from "vitest";
import fixture from "../../../tests/fixtures/tangol/tour-43-glaciar-perito-moreno.json";
import { tourFichaInput, tourFichaModel, tourFichaPath, tourFichaSource, type TourFichaSource } from "./tour-input";
import { checkFicha } from "../schemas/ficha";

const { translation, city, country, whatToBring, physicalRequirements, difficulty, providerNotes, childAgeFrom, childAgeTo, endPoint, infantAgeFrom, infantAgeTo, ...tour } = fixture;

/** La fila como la devuelve `getTourById` (traducciones del idioma, ciudad y país con sus JSON) + las columnas 0031/0032 por SQL. */
const source = (over: Partial<TourFichaSource> = {}): TourFichaSource => ({
  tour: {
    ...tour,
    translations: [{ language: "es", title: translation.title, brief: translation.brief, description: translation.description }, { language: "en", title: "Perito Moreno Glacier", brief: "Brief EN", description: "<p>EN</p>" }],
    city: { slug: city.slug, translations: { es: city.name, en: "El Calafate" }, lat: -50.34, lng: -72.26 },
    country: { code: "ARG", iso2: country.code, translations: { es: country.name, en: "Argentina" } },
  } as unknown as TourFichaSource["tour"],
  practical: { providerId: tour.providerId, providerTitle: tour.providerTitle, guideLanguages: tour.guideLanguages, excludes: tour.excludes, cancellationPolicy: tour.cancellationPolicy, availabilityRules: tour.availabilityRules, endPoint, whatToBring, physicalRequirements, difficulty, providerNotes, childAgeFrom, childAgeTo, infantAgeFrom, infantAgeTo },
  ...over,
});
const env = { ZONE_MAP_ENABLED: "true", TAXONOMY_BLOCK_ENABLED: "true", TAXONOMY_PUBLISH_ENABLED: "true" };

describe("REQ-10843: fila de Tour (Tangol) → entrada del adaptador → modelo", () => {
  it("REQ-10843: el mismo fixture que REQ-10777 pasa el esquema con los mismos bloques (paridad con la ficha pública)", () => {
    const f = tourFichaModel(source(), { lang: "es", env });
    expect(f).not.toBeNull();
    expect(checkFicha(f!).ok).toBe(true);
    expect(f).toMatchObject({ provider: "tangol", externalRef: "43", slug: "glaciar-perito-moreno", title: "Glaciar Perito Moreno", city: { slug: "el-calafate", name: "El Calafate" }, country: { code: "AR", name: "Argentina" } });
    expect(f!.whatToBring).toEqual(["Cámara de fotos.", "Ropa de abrigo.", "Lentes de sol.", "Dinero para gastos personales."]);
    expect(f!.facts.ages).toEqual({ childFrom: 3, childTo: 9 });
    expect(f!.price).toEqual({ amount: 98, currency: "USD", per: "person" });
    expect(f!.gallery).toHaveLength(6);
  });

  it("REQ-10843: el idioma pedido elige la traducción; sin ella, español; sin ninguna, el título del proveedor", () => {
    expect(tourFichaInput(source(), { lang: "en", env })!.translation.title).toBe("Perito Moreno Glacier");
    expect(tourFichaInput(source(), { lang: "pt", env })!.translation.title).toBe("Glaciar Perito Moreno");
    const s = source(); (s.tour as { translations: unknown[] }).translations = [];
    expect(tourFichaInput(s, { lang: "es", env })!.translation.title).toBe(tour.providerTitle);
  });

  it("REQ-10843: sin las columnas 0031/0032 (practical null) la ficha sigue sin esos bloques; nunca inventa", () => {
    const f = tourFichaModel(source({ practical: null }), { lang: "es", env })!;
    expect(f.whatToBring).toEqual([]);
    expect(f.requirements).toEqual([]);
    expect(f.notes).toEqual([]);
    expect(f.facts.ages).toBeNull();
    expect(f.includes).toHaveLength(3); // viene de la fila, no de la 0032
  });

  it("REQ-10843: taxonomía con el clasificador oficial (excursión de un día, con tema) y mapa de zona con la ciudad cuando no hay punto exacto", () => {
    const i = tourFichaInput(source(), { lang: "es", env })!;
    expect(i.taxonomy.tipo?.slug).toBe("excursion-dia");
    expect(i.map).toMatchObject({ kind: "zone", lat: -50.34, lng: -72.26 });
    // Sin ZONE_MAP_ENABLED, sin mapa (nunca un centro por omisión).
    expect(tourFichaInput(source(), { lang: "es", env: {} })!.map).toBeNull();
    // Con punto exacto, el mapa de hoy.
    const s = source(); (s.tour as { meetingPoint: unknown }).meetingPoint = { title: "Plaza", coordinates: "-50.3,-72.2" };
    expect(tourFichaInput(s, { lang: "es", env })!.map).toMatchObject({ kind: "exact", lat: -50.3, lng: -72.2 });
  });

  it("REQ-10843: solo Tangol tiene adaptador; FREETOUR y otros proveedores devuelven null (nunca se arma a medias)", () => {
    const s = source(); (s.tour as { providerId: string }).providerId = "freetour";
    expect(tourFichaInput(s, { lang: "es", env })).toBeNull();
    expect(tourFichaModel(s, { lang: "es", env })).toBeNull();
    const b = source(); (b.tour as { providerId: string }).providerId = "bigbus";
    expect(tourFichaModel(b, { lang: "es", env })).toBeNull();
  });

  it("REQ-10843: la ruta pública es la de las tarjetas (`/destinos/<iso2>/<ciudad>/<slug>`); sin slug o ciudad sin slug, null", () => {
    expect(tourFichaPath(source().tour)).toBe("/destinos/ar/el-calafate/glaciar-perito-moreno");
    const s = source(); (s.tour as { slug: string | null }).slug = null;
    expect(tourFichaPath(s.tour)).toBeNull();
    const c = source(); (c.tour as { city: { slug: string | null } }).city.slug = null;
    expect(tourFichaPath(c.tour)).toBeNull();
  });

  it("REQ-10843: las columnas JSON que llegan como texto desde SQL se leen igual que por Prisma", () => {
    const s = tourFichaSource(source().tour, { guideLanguages: '["pt"]', excludes: '["Propinas"]', availabilityRules: JSON.stringify({ options: [{ code: 1, startTime: "08:00", hoursCancelation: 72 }, { code: 2, startTime: "10:00" }] }) });
    const f = tourFichaModel(s, { lang: "es", env })!;
    expect(f.facts.languages).toEqual(["pt"]);
    expect(f.excludes).toEqual(["Propinas"]);
    expect(f.facts.schedule).toBe("08:00 · 10:00");
    expect(f.cancellation).toEqual({ hours: 72, text: null });
  });

  it("REQ-10843: `tourFichaSource` junta la fila y la fila práctica (la práctica manda en lo que trae) sin tocar el resto", () => {
    const s = tourFichaSource(source().tour, { whatToBring: "<p>Solo gorra</p>", difficulty: null });
    expect(s.practical).toEqual({ whatToBring: "<p>Solo gorra</p>", difficulty: null });
    expect(tourFichaModel(s, { lang: "es", env })!.whatToBring).toEqual(["Solo gorra"]);
  });
});
