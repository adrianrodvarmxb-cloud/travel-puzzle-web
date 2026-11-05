/**
 * REQ-081: post-tour (correo o WhatsApp) y chatbot no promueven ni reservan tours de FREETOUR
 * hasta tener autorización escrita (skill cumplimiento-freetour, reglas B2 y B3). Puro.
 *
 * Dos banderas apagadas en wrangler.jsonc:
 * - FREETOUR_POSTTOUR_PROMO_ENABLED: ofertas post-tour con tours de FREETOUR.
 * - FREETOUR_CHATBOT_ENABLED: chatbot (Mila u otro) que ofrece o reserva tours de FREETOUR.
 * Solo se encienden con "true" exacto, con la autorización guardada en docs/freetour/autorizaciones.md.
 */
export type OfferSource = "freetour" | "own" | "affiliate";

export interface PromoFlags {
  postTourPromo: boolean;
  chatbot: boolean;
}

// REQ-081
export function freetourPromoFlags(env: { FREETOUR_POSTTOUR_PROMO_ENABLED?: string; FREETOUR_CHATBOT_ENABLED?: string }): PromoFlags {
  return {
    postTourPromo: env.FREETOUR_POSTTOUR_PROMO_ENABLED === "true",
    chatbot: env.FREETOUR_CHATBOT_ENABLED === "true",
  };
}

/** Falla cerrada: una oferta sin origen declarado cuenta como de FREETOUR. */
// REQ-081
export function isFreetourOffer(o: { source?: OfferSource }): boolean {
  return o.source === undefined || o.source === "freetour";
}

/** Ofertas post-tour: con la bandera apagada solo quedan productos que no son de FREETOUR. */
// REQ-081
export function filterPostTourOffers<T extends { source?: OfferSource }>(offers: readonly T[], flags: Pick<PromoFlags, "postTourPromo">): T[] {
  return flags.postTourPromo ? [...offers] : offers.filter((o) => !isFreetourOffer(o));
}

/** Catálogo que puede ofrecer o reservar un chatbot: sin FREETOUR con la bandera apagada. */
// REQ-081
export function filterChatbotCatalog<T extends { source?: OfferSource }>(items: readonly T[], flags: Pick<PromoFlags, "chatbot">): T[] {
  return flags.chatbot ? [...items] : items.filter((o) => !isFreetourOffer(o));
}
