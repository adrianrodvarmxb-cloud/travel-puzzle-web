import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { marketingConsentFrom, isMarketingConsentEnabled, MARKETING_CONSENT_DEFAULT, MARKETING_CONSENT_COPY } from "./marketing-consent";
import { MarketingConsentCheckbox } from "@/components/legal/MarketingConsentCheckbox";

describe("REQ-084 consentimiento de marketing (LFPDPPP)", () => {
  it("REQ-084: la bandera MARKETING_CONSENT_ENABLED solo se enciende con \"true\"", () => {
    expect(isMarketingConsentEnabled(undefined)).toBe(false);
    expect(isMarketingConsentEnabled("false")).toBe(false);
    expect(isMarketingConsentEnabled("true")).toBe(true);
  });

  it("REQ-084: el valor por omisión es NO (casilla sin marcar)", () => {
    expect(MARKETING_CONSENT_DEFAULT).toBe(false);
  });

  it("REQ-084: solo hay consentimiento si la casilla se marcó y la bandera está encendida", () => {
    expect(marketingConsentFrom(true, true)).toBe(true);
    for (const v of [undefined, null, false, "true", "on", 1]) expect(marketingConsentFrom(v, true)).toBe(false);
    expect(marketingConsentFrom(true, false)).toBe(false);
  });

  it("REQ-084: la casilla se pinta separada y sin marcar, con texto que no condiciona el servicio", () => {
    const html = renderToStaticMarkup(createElement(MarketingConsentCheckbox, { lang: "es" }));
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('name="marketingConsent"');
    expect(html).not.toMatch(/checked/);
    expect(html).not.toMatch(/required/);
    expect(html).toContain(MARKETING_CONSENT_COPY.es.label);
    expect(MARKETING_CONSENT_COPY.es.hint).toMatch(/no afecta/i);
  });

  it("REQ-084: el texto legal lleva la nota de revisión pendiente", () => {
    expect(MARKETING_CONSENT_COPY.reviewNote).toMatch(/pendiente de revisión del PO y de un abogado/i);
  });
});
