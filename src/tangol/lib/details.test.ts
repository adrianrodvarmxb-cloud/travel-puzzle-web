import { describe, it, expect, vi, afterEach } from "vitest";
import { parseTourDetails, EMPTY_DETAILS, splitLines, tangolLanguages } from "./details";

afterEach(() => vi.restoreAllMocks());

describe("parseTourDetails", () => {
  it("REQ-3370: toma descripción, resumen e imágenes del detalle de Tangol", () => {
    const d = parseTourDetails({
      Description: "Paseo de 3 horas por la ciudad.",
      ShortDescription: "Paseo por la ciudad",
      ListPictures: [{ UrlPic: "https://img.ejemplo.com/1.jpg" }, "https://img.ejemplo.com/2.jpg"],
    });
    expect(d).toMatchObject({
      description: "Paseo de 3 horas por la ciudad.",
      brief: "Paseo por la ciudad",
      images: ["https://img.ejemplo.com/1.jpg", "https://img.ejemplo.com/2.jpg"],
      discarded: 0,
    });
  });

  it("REQ-3371: una imagen con forma distinta se descarta, se cuenta y las buenas siguen", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const d = parseTourDetails({ ListPictures: [{ UrlPic: "ftp://x/1.jpg" }, { otra: 1 }, "https://img/3.jpg"] });
    expect(d.images).toEqual(["https://img/3.jpg"]);
    expect(d.discarded).toBe(2);
    expect(warn).toHaveBeenCalled();
  });

  it("REQ-3371: un detalle con otra forma no tumba la carga: queda vacío y se cuenta", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(parseTourDetails("texto suelto")).toEqual({ ...EMPTY_DETAILS, discarded: 1 });
    expect(parseTourDetails(null)).toEqual(EMPTY_DETAILS);
  });

  it("REQ-3372: el nombre del proveedor no sale en la descripción ni en el resumen del detalle", () => {
    const d = parseTourDetails({ Description: "Paseo de 3 horas. Reserva en tangol.com.", ShortDescription: "Paseo con Tangol" });
    expect(d.description).toBe("Paseo de 3 horas.");
    expect(d.brief).toBe("Paseo con");
  });

  it("REQ-3371: sin imágenes repetidas y respetando el orden", () => {
    const d = parseTourDetails({ ListPictures: ["https://img/1.jpg", { UrlPic: "https://img/1.jpg" }, "https://img/2.jpg"] });
    expect(d.images).toEqual(["https://img/1.jpg", "https://img/2.jpg"]);
    expect(d.discarded).toBe(0);
  });

  // ───────── REQ-10511: lo que el detalle ya trae, con los nombres del swagger real ─────────
  const swagger = {
    Summary: "Paseo por la ciudad",
    Description: "Paseo de 3 horas por la ciudad.",
    PicList: ["https://img.ejemplo.com/1.jpg", "https://img.ejemplo.com/2.jpg"],
    StartPoint: "Hotel del pasajero (zona centro)",
    EndPoint: "Mismo punto de salida",
    CancelationPolicy: "Cancelación sin cargo hasta 48 h antes. Después, 100 %.",
    DetIncluye: "Guía bilingüe\r\nTransporte\r\n- Entradas al museo",
    DetNoIncluye: "<ul><li>Propinas</li><li>Comidas</li></ul>",
    TourLanguages: "Español, Inglés / Portugués",
    Reviews: 4.6,
    ReviewsQty: 37,
  };

  it("REQ-10511: con los nombres del swagger (Summary, PicList) salen resumen e imágenes; antes quedaban vacíos", () => {
    const d = parseTourDetails(swagger);
    expect(d.brief).toBe("Paseo por la ciudad");
    expect(d.description).toBe("Paseo de 3 horas por la ciudad.");
    expect(d.images).toEqual(["https://img.ejemplo.com/1.jpg", "https://img.ejemplo.com/2.jpg"]);
    expect(d.discarded).toBe(0);
  });

  it("REQ-10511: punto de encuentro, política de cancelación, incluye/no incluye, idiomas y reseñas", () => {
    const d = parseTourDetails(swagger);
    expect(d.startPoint).toBe("Hotel del pasajero (zona centro)");
    expect(d.endPoint).toBe("Mismo punto de salida");
    expect(d.cancellationPolicy).toBe("Cancelación sin cargo hasta 48 h antes. Después, 100 %.");
    expect(d.includes).toEqual(["Guía bilingüe", "Transporte", "Entradas al museo"]);
    expect(d.excludes).toEqual(["Propinas", "Comidas"]);
    expect(d.languages).toEqual(["es", "en", "pt"]);
    expect(d.rating).toBe(4.6);
    expect(d.reviewsNumber).toBe(37);
  });

  it("REQ-10511: sin reseñas reales (0 reseñas o calificación fuera de 1-5) la ficha no inventa números", () => {
    expect(parseTourDetails({ Reviews: 4.6, ReviewsQty: 0 })).toMatchObject({ rating: null, reviewsNumber: 0 });
    expect(parseTourDetails({ Reviews: 0, ReviewsQty: 12 })).toMatchObject({ rating: null, reviewsNumber: 0 });
    expect(parseTourDetails({ Reviews: 7, ReviewsQty: 12 })).toMatchObject({ rating: null, reviewsNumber: 0 });
    expect(parseTourDetails({ Reviews: null, ReviewsQty: null })).toMatchObject({ rating: null, reviewsNumber: 0 });
    expect(parseTourDetails({ Reviews: 5, ReviewsQty: 1 })).toMatchObject({ rating: 5, reviewsNumber: 1 });
  });

  it("REQ-10511: el nombre del proveedor tampoco sale en punto de encuentro, incluye ni política", () => {
    const d = parseTourDetails({
      StartPoint: "Oficina de Tangol, Florida 971",
      DetIncluye: "Guía de Tangol\nTransporte",
      CancelationPolicy: "Según políticas de Tangol. Hasta 24 h antes sin cargo.",
    });
    expect(d.startPoint).toBe("Oficina de, Florida 971");
    expect(d.includes).toEqual(["Guía de", "Transporte"]);
    expect(d.cancellationPolicy).toBe("Hasta 24 h antes sin cargo.");
    expect(JSON.stringify(d).toLowerCase()).not.toContain("tangol");
  });

  it("REQ-10511: un idioma desconocido no se inventa; sin texto, lista vacía", () => {
    expect(tangolLanguages("Español, Klingon")).toEqual(["es"]);
    expect(tangolLanguages("Spanish; English")).toEqual(["es", "en"]);
    expect(tangolLanguages(null)).toEqual([]);
    expect(tangolLanguages("Español, español, ESPAÑOL")).toEqual(["es"]);
  });

  it("REQ-10511: los renglones se parten por salto de línea, <br>, <li> y viñetas, sin repetidos ni vacíos", () => {
    expect(splitLines("a<br/>b<br>a\n\n• c\n* d\n- e")).toEqual(["a", "b", "c", "d", "e"]);
    expect(splitLines(null)).toEqual([]);
    expect(splitLines("  ")).toEqual([]);
  });
});
