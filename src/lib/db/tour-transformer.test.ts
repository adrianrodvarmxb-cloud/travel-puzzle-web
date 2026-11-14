import { describe, expect, it } from "vitest";
import { transformDBTourToUITour } from "./tour-transformer";

// REQ-10651 (INC-022): la ficha en el navegador vuelve a calcular el tour con este transformador; si aquí sale
// el operador, la casilla Proveedor lo muestra aunque el servidor haya mandado «Travel Puzzle».
const fila = (extra: Record<string, unknown>) => ({
  id: "t1", externalId: 47, providerTitle: "Tangol Tours", providerPhone: null, priceValue: 100, priceCurrency: "USD",
  images: [], titleImageURL: null, duration: "10 h", meetingPoint: null, includes: [], rating: null, reviewsNumber: 0,
  translations: [{ languageCode: "es", title: "Minitrekking", brief: null, description: null, url: "" }],
  city: { translations: { es: "El Calafate" } }, country: { translations: { es: "Argentina" } }, ...extra,
}) as unknown as Parameters<typeof transformDBTourToUITour>[0];

describe("REQ-10651: la casilla Proveedor que pinta el navegador", () => {
  it("REQ-10651: un tour de proveedor por API sale con la marca que vende", () => {
    expect(transformDBTourToUITour(fila({ providerId: "tangol" }), "es").provider).toBe("Travel Puzzle");
  });
  it("REQ-10651: los tours del primer proveedor siguen mostrando a su operador", () => {
    expect(transformDBTourToUITour(fila({ providerId: "freetour", providerTitle: "Angus Coutts" }), "es").provider).toBe("Angus Coutts");
    expect(transformDBTourToUITour(fila({ providerId: null, providerTitle: "Angus Coutts" }), "es").provider).toBe("Angus Coutts");
  });
});
