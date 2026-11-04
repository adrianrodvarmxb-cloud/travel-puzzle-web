/**
 * REQ-028: traslados aeropuerto–hotel con el buscador de Kiwitaxi vía Travelpayouts. Puro.
 * Cuenta Travelpayouts (marker 800669, proyecto 595791). Kiwitaxi solo cobra en USD/EUR/RUB.
 * Sin "powered by" ni enlaces externos para que se vea como parte de Travel Puzzle.
 */
const BASE = "https://tpwgts.com/content";
const LOCALES = new Set(["es", "en", "pt", "fr", "de", "it"]);

export function isTransfersVisible(flag: string | undefined): boolean {
  return flag === "true";
}

export function transfersWidgetUrl(lang = "es"): string {
  const params = new URLSearchParams({
    currency: "USD",
    trs: "595791",
    shmarker: "800669",
    locale: LOCALES.has(lang) ? lang : "es",
    powered_by: "false",
    transfer_options_limit: "10",
    transfer_options: "MCR",
    disable_currency_selector: "true",
    hide_form_extras: "true",
    hide_external_links: "true",
    campaign_id: "1",
    promo_id: "3879",
  });
  return `${BASE}?${params.toString()}`;
}
