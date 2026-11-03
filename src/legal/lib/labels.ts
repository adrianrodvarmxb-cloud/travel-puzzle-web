/** Rutas y etiquetas de la sección legal. Los textos legales solo existen en español (gate 3). */
export const LEGAL_PATHS = { terms: "/terminos", privacy: "/privacidad" } as const;

const ES = {
  terms: "Términos y condiciones",
  privacy: "Aviso de privacidad",
  updated: "Última actualización",
  spanishOnly: "",
  simplifiedTitle: "Aviso de privacidad simplificado",
  formNotice: "Al continuar aceptas los",
  and: "y el",
};

const EN: typeof ES = {
  terms: "Terms and conditions",
  privacy: "Privacy notice",
  updated: "Last updated",
  spanishOnly: "Legal documents are available in Spanish, which is the version that applies.",
  simplifiedTitle: "Simplified privacy notice",
  formNotice: "By continuing you accept the",
  and: "and the",
};

export function legalLabels(lang: string): typeof ES {
  return lang === "es" ? ES : EN;
}
