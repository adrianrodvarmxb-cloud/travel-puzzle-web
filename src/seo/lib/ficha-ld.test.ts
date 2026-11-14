import { describe, expect, it } from "vitest";
import { enBreve, fichaJsonLd, guideLanguagesLabel, nextAvailability, type FichaInput } from "./ficha-ld";

const url = "https://travelpuzzle.com.mx/destinos/fr/paris/louvre";
const base: FichaInput = {
  provider: "agencia:extime-travel", lang: "es", url, name: "Louvre con guía", images: ["https://cdn.x/1.jpg", null, "http://inseguro/2.jpg"],
  operator: "Extime Travel", free: false, price: 89, currency: "eur", duration: "3 h", languages: ["Español", "Inglés"],
  meetingPoint: { name: "Pirámide del Louvre", address: "Rue de Rivoli, París", lat: 48.861, lng: 2.3358 },
  place: "París, Francia", priceText: "Desde aprox. MXN $1,780 · EUR €89", tipo: "Visita guiada", etiquetas: ["Privado", "En español"],
  includes: ["Guía en español", "Entrada al museo", "Auriculares"], description: "Recorre las salas principales del museo con un guía experto. Verás la Gioconda.",
};

describe("REQ-571: nodo Product + TouristTrip con Offer real", () => {
  it("REQ-571: tipo múltiple, moneda del dato en mayúsculas, url canónica y solo imágenes https", () => {
    const n = fichaJsonLd(base);
    expect(n["@type"]).toEqual(["Product", "TouristTrip"]);
    expect(n.url).toBe(url);
    expect(n.image).toEqual(["https://cdn.x/1.jpg"]);
    expect(n.offers).toEqual({ "@type": "Offer", price: 89, priceCurrency: "EUR", url });
  });
  it("REQ-571: pieza libre = price 0; moneda inválida = sin Offer; availability solo si se conoce", () => {
    expect(fichaJsonLd({ ...base, free: true, price: 12 }).offers).toMatchObject({ price: 0, priceCurrency: "EUR" });
    expect(fichaJsonLd({ ...base, currency: "euros" }).offers).toBeUndefined();
    expect(fichaJsonLd({ ...base, price: null }).offers).toBeUndefined();
    expect(fichaJsonLd({ ...base, availability: "InStock" }).offers).toMatchObject({ availability: "https://schema.org/InStock" });
  });
  it("REQ-571: InStock solo con una salida futura conocida", () => {
    expect(nextAvailability(["2026-11-01", "2026-11-09"], "2026-11-06")).toBe("InStock");
    expect(nextAvailability(["2026-11-01"], "2026-11-06")).toBeNull();
    expect(nextAvailability("no es lista", "2026-11-06")).toBeNull();
  });
});

describe("REQ-572: el operador real, nunca FREETOUR", () => {
  it("REQ-572: provider y brand con el operador", () => {
    const n = fichaJsonLd(base);
    expect(n.provider).toEqual({ "@type": "Organization", name: "Extime Travel" });
    expect(n.brand).toEqual({ "@type": "Brand", name: "Extime Travel" });
  });
  it("REQ-572: un nombre con freetour se omite", () => {
    const n = fichaJsonLd({ ...base, provider: "freetour", operator: "MontpellierFreeTour" });
    expect(n.provider).toBeUndefined();
    expect(JSON.stringify(n).toLowerCase()).not.toContain("freetour");
  });
});

describe("REQ-573: duración, idiomas, punto de encuentro y cancelación cuando existen", () => {
  it("REQ-573: additionalProperty y tripOrigin Place", () => {
    const n = fichaJsonLd({ ...base, cancellation: "Cancelación gratuita hasta 24 h antes" });
    expect(n.additionalProperty).toEqual(expect.arrayContaining([
      { "@type": "PropertyValue", name: "Duración", value: "3 h" },
      { "@type": "PropertyValue", name: "Idiomas del guía", value: "Español, Inglés" },
      { "@type": "PropertyValue", name: "Cancelación", value: "Cancelación gratuita hasta 24 h antes" },
    ]));
    expect(n.tripOrigin).toEqual({ "@type": "Place", name: "Pirámide del Louvre", address: "Rue de Rivoli, París", geo: { "@type": "GeoCoordinates", latitude: 48.861, longitude: 2.3358 } });
  });
  it("REQ-573: sin dato no hay propiedad; en inglés los nombres van en inglés (listo para URL por idioma)", () => {
    const n = fichaJsonLd({ ...base, duration: null, languages: [], meetingPoint: null, tipo: null, lang: "en" });
    expect(n.additionalProperty).toBeUndefined();
    expect(n.tripOrigin).toBeUndefined();
    expect((fichaJsonLd({ ...base, lang: "en" }).additionalProperty as { name: string }[]).map((p) => p.name)).toContain("Duration");
  });
  it("REQ-573: el bus hop-on hop-off dice «Audioguía», no «Idiomas del guía» (REQ-146)", () => {
    const n = fichaJsonLd({ ...base, languagesTitle: "Audioguía" });
    expect(n.additionalProperty).toEqual(expect.arrayContaining([{ "@type": "PropertyValue", name: "Audioguía", value: "Español, Inglés" }]));
    expect(enBreve({ ...base, languagesTitle: "Audioguía" })).toContain("Audioguía: Español e Inglés.");
  });
  it("REQ-578: idiomas del guía sin Intl, «sp» es español y sin repetir", () => {
    expect(guideLanguagesLabel(["en", "sp", "es"], "es")).toEqual(["Inglés", "Español"]);
    expect(guideLanguagesLabel('["fr"]', "en")).toEqual(["French"]);
    expect(guideLanguagesLabel(null, "es")).toEqual([]);
    expect(guideLanguagesLabel(["ge", "po", "ma", "Japanese"], "es")).toEqual(["Alemán", "Japonés"]);
  });
});

describe("REQ-574: sin reseñas de terceros", () => {
  it("REQ-574: nunca aggregateRating ni review salvo reseñas propias", () => {
    const n = fichaJsonLd({ ...base, rating: 4.9, reviews: 1200 } as FichaInput);
    expect(n.aggregateRating).toBeUndefined();
    expect(n.review).toBeUndefined();
    expect(fichaJsonLd({ ...base, ownReviews: { ratingValue: 4.7, reviewCount: 12 } }).aggregateRating).toEqual({ "@type": "AggregateRating", ratingValue: 4.7, reviewCount: 12, bestRating: 5 });
    expect(fichaJsonLd({ ...base, ownReviews: { ratingValue: 4.7, reviewCount: 0 } }).aggregateRating).toBeUndefined();
  });
});

describe("REQ-570 / REQ-581: el interruptor decide el contenido nuevo", () => {
  it("REQ-581: con enriquecimiento, descripción, tipo en additionalProperty y etiquetas en keywords; sin touristType", () => {
    const n = fichaJsonLd(base);
    expect(n.description).toContain("Recorre las salas");
    expect(n.additionalProperty).toEqual(expect.arrayContaining([{ "@type": "PropertyValue", name: "Tipo de experiencia", value: "Visita guiada" }]));
    expect(n.keywords).toBe("Visita guiada, Privado, En español");
    expect(n.touristType).toBeUndefined();
  });
  it("REQ-570: FREETOUR solo lleva lo que ya se ve (sin descripción, tipo ni keywords)", () => {
    const n = fichaJsonLd({ ...base, provider: "freetour" });
    expect(n.description).toBeUndefined();
    expect(n.keywords).toBeUndefined();
    expect((n.additionalProperty as { name: string }[]).map((p) => p.name)).not.toContain("Tipo de experiencia");
    expect(n.offers).toBeDefined();
  });
});

describe("REQ-577: «En breve» (respuesta primero)", () => {
  const words = (s: string) => s.trim().split(/\s+/).length;
  it("REQ-577: con los datos completos tiene entre 40 y 80 palabras y no inventa nada", () => {
    const t = enBreve(base)!;
    expect(words(t)).toBeGreaterThanOrEqual(40);
    expect(words(t)).toBeLessThanOrEqual(80);
    expect(t).toContain("Visita guiada en París, Francia.");
    expect(t).toContain("Duración: 3 h.");
    expect(t).toContain("Idiomas del guía: Español e Inglés.");
    expect(t).toContain("Precio: desde aprox. MXN $1,780 · EUR €89.");
    expect(t).toContain("Lo opera Extime Travel");
  });
  it("REQ-577: nunca pasa de 80 palabras (recorta el resumen y lo que incluye)", () => {
    const long = { ...base, description: "palabra ".repeat(120), includes: Array.from({ length: 12 }, (_, i) => `cosa número ${i}`) };
    expect(words(enBreve(long)!)).toBeLessThanOrEqual(80);
  });
  it("REQ-577: un dato que falta se omite", () => {
    const t = enBreve({ ...base, duration: null, languages: [], includes: [], description: null })!;
    expect(t).not.toContain("Duración");
    expect(t).not.toContain("Idiomas");
  });
  it("REQ-570: FREETOUR no lleva «En breve»", () => {
    expect(enBreve({ ...base, provider: "freetour" })).toBeNull();
  });
});

describe("REQ-820: Product con image (Rich Results: «Fichas de comerciantes»)", () => {
  it("REQ-820: las rutas relativas del sitio salen como URL absolutas del mismo origen", () => {
    const n = fichaJsonLd({ ...base, images: ["/api/viajes/foto/trips/a.jpg", "/api/viajes/foto/trips/b.jpg"] });
    expect(n.image).toEqual(["https://travelpuzzle.com.mx/api/viajes/foto/trips/a.jpg", "https://travelpuzzle.com.mx/api/viajes/foto/trips/b.jpg"]);
  });
  it("REQ-820: la principal y hasta 3 más, sin repetidas, vacías, http ni data:", () => {
    const n = fichaJsonLd({ ...base, images: ["https://cdn.x/1.jpg", "https://cdn.x/1.jpg", "", null, "http://inseguro/2.jpg", "data:image/png;base64,AA", "//cdn.x/3.jpg", "https://cdn.x/4.jpg", "https://cdn.x/5.jpg", "https://cdn.x/6.jpg"] });
    expect(n.image).toEqual(["https://cdn.x/1.jpg", "https://cdn.x/4.jpg", "https://cdn.x/5.jpg", "https://cdn.x/6.jpg"]);
  });
});

describe("REQ-823: Offer sin datos que no existen", () => {
  it("REQ-823: availability solo si se conoce; nunca shippingDetails ni hasMerchantReturnPolicy", () => {
    const sin = fichaJsonLd({ ...base, availability: null });
    expect((sin.offers as Record<string, unknown>).availability).toBeUndefined();
    const con = fichaJsonLd({ ...base, availability: "InStock" });
    expect((con.offers as Record<string, unknown>).availability).toBe("https://schema.org/InStock");
    const all = JSON.stringify([sin, con]);
    expect(all).not.toContain("shippingDetails");
    expect(all).not.toContain("hasMerchantReturnPolicy");
  });
});

describe("REQ-10542: «En breve» dice quién opera un tour de Tangol (sale de Tour.providerTitle)", () => {
  // Cadena: sync (toTangolTourRow) → Tour.providerTitle → destinations/repository.ts (provider) → page-model (operator) → enBreve.
  it("REQ-10542: con el valor que escribe el sync, dice «Lo opera Tangol Tours y lo reservas con Travel Puzzle.»", async () => {
    const { TANGOL_OPERATOR_TITLE } = await import("@/tangol/lib/tour-rows");
    const tangol = { ...base, provider: "tangol", operator: TANGOL_OPERATOR_TITLE };
    expect(enBreve(tangol)).toContain("Lo opera Tangol Tours y lo reservas con Travel Puzzle.");
    expect(enBreve(tangol)).not.toContain("Lo opera Travel Puzzle");
    expect(enBreve({ ...tangol, lang: "en" })).toContain("Operated by Tangol Tours and booked with Travel Puzzle.");
    expect(fichaJsonLd(tangol).provider).toEqual({ "@type": "Organization", name: "Tangol Tours" });
  });
});
