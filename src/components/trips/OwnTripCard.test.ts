// REQ-001, REQ-004 — INC-001: la tarjeta no debe depender de Intl del navegador (hydration mismatch).
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OwnTripCard } from "./OwnTripCard";
import { tripCopy } from "@/trips/lib/copy";
import type { TripCard } from "@/trips/public-load";

const trip: TripCard = {
  id: "t1", path: "/viajes/hong-kong/x", code: "BBT-HK-M01-028", kind: "transporte",
  title: "Autobús turístico en Hong Kong", summary: "", image: null, countries: ["HK"],
  places: "Hong Kong", cities: ["Hong Kong"], durationDays: 1, price: null, priceFrom: null,
};

const render = () => renderToStaticMarkup(createElement(OwnTripCard, { trip, c: tripCopy("es"), lang: "es" }));

describe("OwnTripCard (INC-001)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("REQ-004: el nombre del país sale del servidor, no de Intl del navegador", () => {
    // Chrome traduce HK como "RAE de Hong Kong (China)"; el servidor dio "Hong Kong".
    class BrowserDisplayNames { of() { return "RAE de Hong Kong (China)"; } }
    vi.stubGlobal("Intl", { ...Intl, DisplayNames: BrowserDisplayNames });
    const html = render();
    expect(html).toContain("Hong Kong");
    expect(html).not.toContain("RAE de Hong Kong");
  });

  it("REQ-001: servidor y navegador generan el mismo HTML aunque su Intl difiera", () => {
    const server = render();
    class OtherDisplayNames { of(c: string) { return `otro-${c}`; } }
    vi.stubGlobal("Intl", { ...Intl, DisplayNames: OtherDisplayNames });
    expect(render()).toBe(server);
  });
});
