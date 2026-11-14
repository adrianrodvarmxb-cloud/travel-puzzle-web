// REQ-3469, REQ-3470, REQ-3471 — el calendario en la ficha: se pinta con lo que trae del servidor,
// la ficha sin calendario queda como hoy y nada del proveedor llega al cliente.
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { calendarView } from "@/tours/lib/calendar-view";
import { availabilityFromRanges, buildCalendar } from "@/tours/lib/provider-availability";

vi.mock("@/lib/language-context", () => ({ useLanguage: () => ({ t: (k: string, d?: string) => d ?? k, language: "es" }) }));
vi.mock("./TourAvailabilityCalendar", () => ({ TourAvailabilityCalendar: () => null }));

const { ProviderDateCalendar } = await import("./ProviderDateCalendar");
const { TourSidebar } = await import("./TourSidebar");

const vista = calendarView(
  buildCalendar(
    availabilityFromRanges({
      currency: "USD",
      blackouts: [{ from: "2026-12-24", to: "2026-12-25" }],
      rates: [{ option: "A", validFrom: "2026-12-01", validTo: "2027-01-31", rackAdult: 99, currency: "USD" }],
    }),
    { today: "2026-11-12", months: 3, currency: "USD" },
  )!,
  "es",
);

const tour = { id: "t1", externalId: 1, title: "Buenos Aires de noche", price: 99, currency: "USD", rating: null, reviewsNumber: 0, bookingURL: null } as never;

describe("REQ-3469: el calendario se pinta con lo que trae del servidor", () => {
  it("REQ-3469: muestra el mes, los días de la semana, el precio del día y la moneda", () => {
    const html = renderToStaticMarkup(createElement(ProviderDateCalendar, { view: vista }));
    expect(html).toContain("diciembre 2026");
    expect(html).toContain("lun");
    expect(html).toContain("USD 99");
  });

  it("REQ-3469: los días que no se ofrecen quedan deshabilitados (en gris) y sin precio", () => {
    const html = renderToStaticMarkup(createElement(ProviderDateCalendar, { view: vista }));
    expect(html).toContain('data-ofrecido="false"');
    expect(html).toContain('data-ofrecido="true"');
    // Hoy no hay reserva en línea de proveedor: los días informan, no se eligen (nada de fachadas).
    expect(html).not.toContain("<button type=\"button\" data-ofrecido");
  });

  it("REQ-3471: el html del calendario no nombra al proveedor ni trae netos", () => {
    const html = renderToStaticMarkup(createElement(ProviderDateCalendar, { view: vista })).toLowerCase();
    for (const prohibido of ["tangol", "freetour", "utilidad", "comisión", "comision", "neto", "proveedor"]) {
      expect(html).not.toContain(prohibido);
    }
  });
});

describe("REQ-3470 / REQ-3471: la ficha sin calendario queda como hoy", () => {
  it("REQ-3470: sin calendario la ficha sigue mostrando su precio «desde»", () => {
    const html = renderToStaticMarkup(createElement(TourSidebar, { tour, mode: "advisor", whatsapp: "5215500000000" }));
    expect(html).toContain("USD 99");
    expect(html).not.toContain("diciembre 2026");
    expect(html).not.toContain("data-ofrecido");
  });

  it("REQ-3471: con la bandera apagada el servidor no manda calendario y el html es el de hoy", () => {
    const hoy = renderToStaticMarkup(createElement(TourSidebar, { tour, mode: "advisor", whatsapp: "5215500000000", providerCalendar: null }));
    const sinProp = renderToStaticMarkup(createElement(TourSidebar, { tour, mode: "advisor", whatsapp: "5215500000000" }));
    expect(hoy).toBe(sinProp);
  });

  it("REQ-3469: con calendario, la ficha lo muestra en la columna de reserva", () => {
    const html = renderToStaticMarkup(createElement(TourSidebar, { tour, mode: "advisor", whatsapp: "5215500000000", providerCalendar: vista }));
    expect(html).toContain("diciembre 2026");
    expect(html).toContain("USD 99");
  });
});
