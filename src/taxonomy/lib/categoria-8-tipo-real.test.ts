/**
 * Decisión del PO (7 nov 2026, 11:3x, «Cada una a su tipo real»; reemplaza docs/taxonomia.md §4.1 #0 para FREETOUR cat. 8):
 * la cat. 8 («Tour Online») se clasifica por lo que de verdad es. Casos con ids reales de producción (fuera-124.csv).
 * - REQ-1260: audioguía o app → Autoguiado (105 casos).
 * - REQ-1261: presencial → su tipo normal (free tour → Pieza libre; varios días → Circuito; entrada → Boletos; bus hop-on → Transporte).
 * - REQ-1262: realmente en línea → «Experiencias en línea» (sección propia en /tours; no cuenta ni se lista en la ciudad).
 * - REQ-1263: cat. 31 → «Esenciales de viaje», tras bandera (no se publica).
 * - REQ-1264: país «SCT» (Escocia), «NIR» y «WLS» → GB.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "../data/index";
import { classify } from "./classify";
import { catalogClassifier, isPublishable } from "./publish";
import { formatDefs } from "./format-defs";
import { cartTypeFor } from "./cart-type";
import { piezaLibreExcepciones } from "./format";
import { destinationTree, findCity, fichaTours, allTours, type CountryRow, type CityRow } from "@/destinations/lib/catalog";
import { countryIso2, ISO2_SQL } from "@/destinations/lib/ids";
import { tour } from "@/destinations/fixtures/destinos";

const c8 = (titulo: string, precio: number, durationMinutes: number) => classify({ proveedor: "freetour", categoriaId: 8, precio, durationMinutes, titulo }, D, M);

describe("REQ-1260 cat. 8: audioguía o app → Autoguiado", () => {
  it("REQ-1260 títulos reales de las apps", () => {
    for (const t of [
      "Aplicación de audioguía: Paseo por Pekín", // 1 de 105
      "App audioguiada: Annecy City Tour",
      "Autoguía App: Oswiecim, Auschwitz-Birkenau Museum Tour (sin entrada)",
      "Autoguía Audio App: Sevilla City Tour",
      "Audio App autoguiada: Atenas City Tour",
      "App Audioguía: Castillo de Praga (sin entrada)",
      "Audioguía App: Múnich City Walk",
    ]) expect(c8(t, 10, 120).formato, t).toBe("autoguiado");
  });
});

describe("REQ-1261 cat. 8 presencial → su tipo normal", () => {
  it("REQ-1261 free tours de Pontevedra y Vigo (53716, 53717, 57825) → Pieza libre", () => {
    for (const t of ["Free Tour por los Imprescindibles de Pontevedra", "Free Tour Misterios y Leyendas de Pontevedra", "Free Tour de Vigo"]) expect(c8(t, 0, 120).formato, t).toBe("pieza-libre");
  });
  it("REQ-1261 Marruecos de varios días (49049, 48987, 49004) → Circuito", () => {
    for (const t of ["Ciudades Imperiales Tour - 5 Días y 4 Noches", "Ciudades Imperiales 4 Dias y 3 Noches", "Puente en Marrakech 3 dias 2noches"]) expect(c8(t, 300, 600).formato, t).toBe("circuito");
  });
  it("REQ-1261 entradas de Pekín (94295, 94769) → Boletos y entradas", () => {
    expect(c8("Entrada a la Ciudad Prohibida de Pekín: Excluida la Galería del Tesoro", 16, 240).formato).toBe("entradas");
    expect(c8("Entrada combinada para el Templo del Cielo, Pekín", 10, 180).formato).toBe("entradas");
  });
  it("REQ-1261 el bus turístico de Shanghái (114039, sube y baja ilimitado) → Transporte turístico", () => {
    expect(c8("Autobús turístico de dos pisos de Shanghái", 10, 540).formato).toBe("transporte");
  });
  it("REQ-1261 a pie → Caminata; safari en Nairobi y los demás sin señal → su tipo por defecto (lista de dudas)", () => {
    expect(c8("Descubre Kibera: recorrido a pie por los lugares más auténticos", 20, 180).formato).toBe("caminata");
    const r = c8("Safari por el Parque de Nairobi", 50, 240);
    expect(r.formato).toBe("visita-guiada");
    expect(r.reglaFormato.startsWith("duda:")).toBe(true);
    // ya no hay ningún `fuera` en la cat. 8
    for (const t of ["Safari por el Parque de Nairobi", "Descubrir el lago Kivu y su gente"]) expect(c8(t, 5, 30).formato).not.toBe("fuera");
  });
  it("REQ-1261 el precio 0 de la cat. 8 ya es Pieza libre (la 8 sale de las excepciones de REQ-406)", () => {
    expect(piezaLibreExcepciones(M.freetour)).not.toContain("8");
    expect(piezaLibreExcepciones(M.freetour)).toContain("31");
  });
});

describe("REQ-1262 «Experiencias en línea»", () => {
  it("REQ-1262 los 2 casos realmente en línea (32042 y 81024)", () => {
    expect(c8("Vidas Virtuales de Siem Reap Visita Local de Gemas Ocultas", 70, 60).formato).toBe("en-linea");
    expect(c8("Asesoramiento Para Descubrir Barcelona", 15, 60).formato).toBe("en-linea");
  });
  it("REQ-1262 sección propia en /tours (chip si hay al menos 1) y fuera del carrito y de la ciudad", () => {
    const def = formatDefs(D).find((d) => d.slug === "en-linea");
    expect(def).toMatchObject({ corto: { es: "En línea", en: "Online" }, largo: { es: "Experiencias en línea", en: "Online experiences" } });
    expect(isPublishable("en-linea", "/tours")).toBe(true);
    expect(isPublishable("en-linea", "/destinos")).toBe(false);
    expect(cartTypeFor("en-linea")).toBeNull();
    expect(D.terminos.find((t) => t.eje === "formato" && t.slug === "en-linea")).toMatchObject({ estado: "activo", seccion: "experiencias", guiaEnPersona: false });
  });
  it("REQ-1262 en la ciudad: no se lista ni cuenta para indexar, pero su ficha existe (sin 404)", () => {
    const countries: CountryRow[] = [{ id: 1, code: "ES", iso2: "ES", translations: { es: "España" } }];
    const cities: CityRow[] = [{ id: 10, countryId: 1, translations: { es: "Barcelona" }, slug: "barcelona", guide: null, guideUpdatedAt: null, indexableSince: null, failingSince: null }];
    const tours = [
      tour(10, 1, { price: 0, categoryId: 12, title: "Free tour del Gótico", slug: "free-tour-gotico" }),
      tour(10, 1, { price: 15, categoryId: 8, title: "Asesoramiento Para Descubrir Barcelona", slug: "asesoramiento-barcelona" }),
    ];
    const tree = destinationTree({ countries, cities, tours, trips: [], now: new Date("2026-11-07T12:00:00Z"), taxonomy: catalogClassifier(D, M) });
    const city = findCity(tree, "es", "barcelona")!.city;
    expect(allTours(city).map((t) => t.title)).toEqual(["Free tour del Gótico"]);
    expect(city.activeTours).toBe(1);
    expect(fichaTours(city).map((t) => t.href)).toContain("/destinos/es/barcelona/asesoramiento-barcelona");
  });
});

describe("REQ-1263 cat. 31 → «Esenciales de viaje», tras bandera", () => {
  it("REQ-1263 se clasifica pero no se publica en ningún lado", () => {
    const r = classify({ proveedor: "freetour", categoriaId: 31, precio: 0, durationMinutes: 60, titulo: "eSIM Europa 10 GB" }, D, M);
    expect(r.formato).toBe("esenciales-viaje");
    expect(isPublishable("esenciales-viaje", "/tours")).toBe(false);
    expect(isPublishable("esenciales-viaje", "/destinos")).toBe(false);
    expect(D.terminos.find((t) => t.eje === "formato" && t.slug === "esenciales-viaje")).toMatchObject({ estado: "tras_bandera", termino_es: "Esenciales de viaje" });
    expect(formatDefs(D).map((d) => d.slug)).not.toContain("esenciales-viaje");
  });
});

describe("REQ-1264 Escocia, Irlanda del Norte y Gales cuelgan de GB", () => {
  it("REQ-1264 código del proveedor → ISO-2 cuando el país no lo tiene", () => {
    expect(countryIso2({ code: "SCT", iso2: null })).toBe("GB");
    expect(countryIso2({ code: "NIR", iso2: null })).toBe("GB");
    expect(countryIso2({ code: "WLS", iso2: null })).toBe("GB");
    expect(countryIso2({ code: "GB", iso2: "GB" })).toBe("GB");
    expect(countryIso2({ code: "XX", iso2: null })).toBeNull();
    expect(ISO2_SQL("co")).toContain("'SCT' THEN 'GB'");
  });
  it("REQ-1264 Edimburgo (cat. 8, «App Audioguía: Edimburgo Royal Mile») tiene ficha en /destinos/gb/edimburgo/… y GB es un solo país", () => {
    const countries: CountryRow[] = [
      { id: 2, code: "GB", iso2: "GB", translations: { es: "Reino Unido" } },
      { id: 177, code: "SCT", iso2: null, translations: { es: "Escocia" } },
    ];
    const cities: CityRow[] = [
      { id: 20, countryId: 2, translations: { es: "Londres" }, slug: "londres", guide: null, guideUpdatedAt: null, indexableSince: null, failingSince: null },
      { id: 4842, countryId: 177, translations: { es: "Edimburgo" }, slug: "edimburgo", guide: null, guideUpdatedAt: null, indexableSince: null, failingSince: null },
    ];
    const tours = [tour(20, 2), tour(4842, 177, { price: 10, categoryId: 8, title: "App Audioguía: Edimburgo Royal Mile City Walk", slug: "app-audioguia-edimburgo-royal-mile-city-walk" })];
    const tree = destinationTree({ countries, cities, tours, trips: [], now: new Date("2026-11-07T12:00:00Z"), taxonomy: catalogClassifier(D, M) });
    expect(tree.map((c) => c.slug)).toEqual(["gb"]);
    expect(tree[0].name).toBe("Reino Unido");
    const edi = findCity(tree, "gb", "edimburgo")!.city;
    expect(fichaTours(edi).map((t) => t.href)).toEqual(["/destinos/gb/edimburgo/app-audioguia-edimburgo-royal-mile-city-walk"]);
  });
});
