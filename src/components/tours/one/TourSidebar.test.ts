// REQ-009 — la franja de transporte aparece con reservas por asesor y con reservas en línea.
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/language-context", () => ({ useLanguage: () => ({ t: (k: string, d?: string) => d ?? k, language: "es" }) }));
vi.mock("./TourAvailabilityCalendar", () => ({ TourAvailabilityCalendar: () => null }));

const { TourSidebar } = await import("./TourSidebar");
const tour = { id: "t1", externalId: 1, title: "Montmartre", price: 0, currency: "EUR", rating: null, reviewsNumber: 0, bookingURL: null } as never;
const below = createElement("p", null, "FRANJA-TRANSPORTE");

describe("TourSidebar + franja", () => {
  it("REQ-009: con reservas por asesor la franja sale bajo el botón", () => {
    const html = renderToStaticMarkup(createElement(TourSidebar, { tour, mode: "advisor", whatsapp: "5215500000000", below }));
    expect(html).toContain("FRANJA-TRANSPORTE");
  });
  it("REQ-009: con reservas en línea (calendario) la franja también sale", () => {
    const html = renderToStaticMarkup(createElement(TourSidebar, { tour, mode: "calendar", events: [], below }));
    expect(html).toContain("FRANJA-TRANSPORTE");
    expect(html.match(/FRANJA-TRANSPORTE/g)).toHaveLength(1);
  });
});
