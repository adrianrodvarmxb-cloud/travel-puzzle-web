import { describe, it, expect, vi, afterEach } from "vitest";
import { parseTourDetails } from "./details";

afterEach(() => vi.restoreAllMocks());

describe("parseTourDetails", () => {
  it("REQ-3370: toma descripción, resumen e imágenes del detalle de Tangol", () => {
    const d = parseTourDetails({
      Description: "Paseo de 3 horas por la ciudad.",
      ShortDescription: "Paseo por la ciudad",
      ListPictures: [{ UrlPic: "https://img.ejemplo.com/1.jpg" }, "https://img.ejemplo.com/2.jpg"],
    });
    expect(d).toEqual({
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
    expect(parseTourDetails("texto suelto")).toEqual({ description: null, brief: null, images: [], discarded: 1 });
    expect(parseTourDetails(null)).toEqual({ description: null, brief: null, images: [], discarded: 0 });
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
});
