import { describe, it, expect } from "vitest";
import { freetourPromoFlags, filterPostTourOffers, filterChatbotCatalog, isFreetourOffer } from "./promo-policy";

const offers = [
  { title: "Free tour Centro", source: "freetour" as const },
  { title: "Traslado al aeropuerto", source: "affiliate" as const },
  { title: "Viaje a Perú", source: "own" as const },
  { title: "Sin origen" },
];

describe("REQ-081 post-tour y chatbot sin FREETOUR", () => {
  it("REQ-081: las dos banderas están apagadas salvo que valgan exactamente \"true\"", () => {
    expect(freetourPromoFlags({})).toEqual({ postTourPromo: false, chatbot: false });
    expect(freetourPromoFlags({ FREETOUR_POSTTOUR_PROMO_ENABLED: "false", FREETOUR_CHATBOT_ENABLED: "1" })).toEqual({ postTourPromo: false, chatbot: false });
    expect(freetourPromoFlags({ FREETOUR_POSTTOUR_PROMO_ENABLED: "TRUE", FREETOUR_CHATBOT_ENABLED: " true" })).toEqual({ postTourPromo: false, chatbot: false });
    expect(freetourPromoFlags({ FREETOUR_POSTTOUR_PROMO_ENABLED: "true", FREETOUR_CHATBOT_ENABLED: "true" })).toEqual({ postTourPromo: true, chatbot: true });
  });

  it("REQ-081: con la bandera apagada, las ofertas post-tour solo traen productos que no son de FREETOUR", () => {
    const out = filterPostTourOffers(offers, { postTourPromo: false });
    expect(out.map((o) => o.title)).toEqual(["Traslado al aeropuerto", "Viaje a Perú"]);
  });

  it("REQ-081: una oferta sin origen declarado se trata como de FREETOUR (falla cerrada)", () => {
    expect(isFreetourOffer({})).toBe(true);
    expect(isFreetourOffer({ source: "freetour" })).toBe(true);
    expect(isFreetourOffer({ source: "own" })).toBe(false);
  });

  it("REQ-081: con la bandera encendida (autorización escrita) pasa todo", () => {
    expect(filterPostTourOffers(offers, { postTourPromo: true })).toHaveLength(4);
  });

  it("REQ-081: el chatbot no ofrece ni reserva FREETOUR con su bandera apagada", () => {
    expect(filterChatbotCatalog(offers, { chatbot: false }).map((o) => o.title)).toEqual(["Traslado al aeropuerto", "Viaje a Perú"]);
    expect(filterChatbotCatalog(offers, { chatbot: true })).toHaveLength(4);
  });

  it("REQ-081: no muta la lista original", () => {
    const copy = [...offers];
    filterPostTourOffers(offers, { postTourPromo: false });
    expect(offers).toEqual(copy);
  });
});
