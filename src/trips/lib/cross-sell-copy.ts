/** Textos y reglas de la franja y la ventana "Completa tu viaje" (gates O–R, ola X2a). Puro. */

// REQ-006
export function advisorTextWithExtras(base: string, extras: string[], lang: string): string {
  if (!extras.length) return base;
  const list = extras.map((t) => `«${t}»`).join(", ");
  return lang === "es" ? `${base} También me interesa: ${list}.` : `${base} I'm also interested in: ${list}.`;
}

// REQ-006
export function shouldOfferSheet(options: number, dismissed: boolean): boolean {
  return options > 0 && !dismissed;
}

export interface CrossSellCopy {
  stripEyebrow: (city: string) => string; stripQuestion: string; from: string;
  toursEyebrow: (city: string) => string; toursQuestion: string;
  sheetEyebrow: string; sheetTitle: (city: string) => string; sheetSub: string;
  continueWith: string; noThanks: string;
}

const C: Record<string, CrossSellCopy> = {
  es: { stripEyebrow: (c) => `Transporte en ${c}`, stripQuestion: "¿Te mueves por la ciudad?", from: "Desde", toursEyebrow: (c) => `Tours en ${c}`, toursQuestion: "Arma tu día con un tour", sheetEyebrow: "Completa tu viaje", sheetTitle: (c) => `¿Agregamos tu transporte en ${c}?`, sheetSub: "Tu asesor lo cotiza junto con tu tour, sin costo extra.", continueWith: "Continuar con mi tour + transporte", noThanks: "No, gracias, solo el tour" },
  en: { stripEyebrow: (c) => `Getting around ${c}`, stripQuestion: "Exploring the city?", from: "From", toursEyebrow: (c) => `Tours in ${c}`, toursQuestion: "Plan your day with a tour", sheetEyebrow: "Complete your trip", sheetTitle: (c) => `Add transport in ${c}?`, sheetSub: "Your advisor quotes it together with your tour, at no extra cost.", continueWith: "Continue with tour + transport", noThanks: "No thanks, just the tour" },
  pt: { stripEyebrow: (c) => `Transporte em ${c}`, stripQuestion: "Vai circular pela cidade?", from: "A partir de", toursEyebrow: (c) => `Tours em ${c}`, toursQuestion: "Monte seu dia com um tour", sheetEyebrow: "Complete sua viagem", sheetTitle: (c) => `Adicionamos seu transporte em ${c}?`, sheetSub: "Seu consultor faz a cotação junto com o tour, sem custo extra.", continueWith: "Continuar com tour + transporte", noThanks: "Não, obrigado, só o tour" },
  fr: { stripEyebrow: (c) => `Transport à ${c}`, stripQuestion: "Vous visitez la ville ?", from: "À partir de", toursEyebrow: (c) => `Visites à ${c}`, toursQuestion: "Organisez votre journée avec une visite", sheetEyebrow: "Complétez votre voyage", sheetTitle: (c) => `Ajouter votre transport à ${c} ?`, sheetSub: "Votre conseiller le chiffre avec votre visite, sans frais supplémentaires.", continueWith: "Continuer avec visite + transport", noThanks: "Non merci, seulement la visite" },
  de: { stripEyebrow: (c) => `Unterwegs in ${c}`, stripQuestion: "Die Stadt erkunden?", from: "Ab", toursEyebrow: (c) => `Touren in ${c}`, toursQuestion: "Plane deinen Tag mit einer Tour", sheetEyebrow: "Vervollständige deine Reise", sheetTitle: (c) => `Transport in ${c} hinzufügen?`, sheetSub: "Dein Berater erstellt das Angebot zusammen mit deiner Tour, ohne Aufpreis.", continueWith: "Weiter mit Tour + Transport", noThanks: "Nein danke, nur die Tour" },
  it: { stripEyebrow: (c) => `Trasporti a ${c}`, stripQuestion: "Ti muovi per la città?", from: "Da", toursEyebrow: (c) => `Tour a ${c}`, toursQuestion: "Organizza la giornata con un tour", sheetEyebrow: "Completa il tuo viaggio", sheetTitle: (c) => `Aggiungiamo il trasporto a ${c}?`, sheetSub: "Il tuo consulente lo quota insieme al tour, senza costi extra.", continueWith: "Continua con tour + trasporto", noThanks: "No grazie, solo il tour" },
};

// REQ-008
export function crossSellCopy(lang: string): CrossSellCopy {
  return C[lang] ?? C.en;
}
