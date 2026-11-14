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

  // ───────── REQ-10537 / REQ-10538 / REQ-10539: lo que faltaba guardar del detalle ─────────
  const practico = {
    EndPoint: "  Plaza de Mayo  ",
    WhatToBring: "Calzado cómodo y protector solar",
    PhysicalReq: "Caminar 2 km",
    Difficulty: "Baja",
    Others: "Sale con lluvia.",
    ChdFrom: 3, ChdTo: 11, InfFrom: 0, InfTo: 2,
  };

  it("REQ-10537: qué llevar, requisitos físicos, dificultad y notas (Others) se leen del detalle", () => {
    const d = parseTourDetails(practico);
    expect(d).toMatchObject({ whatToBring: "Calzado cómodo y protector solar", physicalRequirements: "Caminar 2 km", difficulty: "Baja", providerNotes: "Sale con lluvia." });
    expect(d.discarded).toBe(0);
  });

  it("REQ-10537: textos vacíos o solo espacios quedan en null (la ficha no pinta el bloque)", () => {
    const d = parseTourDetails({ WhatToBring: "", PhysicalReq: "   ", Difficulty: null, Others: "" , EndPoint: "" });
    expect(d).toMatchObject({ whatToBring: null, physicalRequirements: null, difficulty: null, providerNotes: null, endPoint: null });
    expect(parseTourDetails(null)).toMatchObject({ whatToBring: null, childAges: null, infantAges: null });
  });

  it("REQ-10538: punto de término y edades de niño e infante; 0–0 o rangos imposibles quedan en null", () => {
    const d = parseTourDetails(practico);
    expect(d.endPoint).toBe("Plaza de Mayo");
    expect(d.childAges).toEqual({ from: 3, to: 11 });
    expect(d.infantAges).toEqual({ from: 0, to: 2 });
    expect(parseTourDetails({ ChdFrom: 0, ChdTo: 0, InfFrom: 0, InfTo: 0 })).toMatchObject({ childAges: null, infantAges: null });
    expect(parseTourDetails({ ChdFrom: 12, ChdTo: 4 }).childAges).toBeNull();
    expect(parseTourDetails({ ChdFrom: 3.5, ChdTo: 200 }).childAges).toBeNull();
  });

  it("REQ-10538: una edad con otra forma (texto) descarta solo ese dato, no el detalle completo", () => {
    const d = parseTourDetails({ ...practico, ChdFrom: "tres" });
    expect(d.childAges).toBeNull();
    expect(d.whatToBring).toBe("Calzado cómodo y protector solar");
    expect(d.infantAges).toEqual({ from: 0, to: 2 });
  });

  it("REQ-10539: los códigos reales de TourLanguages (ESP, ESP,ENG, ESP,ENG,POR) pasan a ISO 639-1", () => {
    expect(tangolLanguages("ESP")).toEqual(["es"]);
    expect(tangolLanguages("ESP,ENG")).toEqual(["es", "en"]);
    expect(tangolLanguages("ESP,ENG,POR")).toEqual(["es", "en", "pt"]);
    expect(tangolLanguages("esp / eng")).toEqual(["es", "en"]);
    expect(tangolLanguages("")).toEqual([]);
    expect(parseTourDetails({ TourLanguages: "ESP,ENG,POR" }).languages).toEqual(["es", "en", "pt"]);
  });

  it("REQ-10539: un código de tres letras que no se conoce no se inventa", () => {
    expect(tangolLanguages("ESP,XYZ")).toEqual(["es"]);
  });
});
