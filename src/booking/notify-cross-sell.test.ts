import { describe, expect, it, vi } from "vitest";
import type { CrossSellLoaderDeps } from "@/notifications/cross-sell";
import { sendBookingConfirmation, sendReviewRequest, sendStatusEmail } from "./notify";

const record = {
  refNumber: "6782-1-244", tourExternalId: 6782, eventId: 1, adults: 2, children: 0, price: 0,
  email: "ana@example.com", firstName: "Ana", lastName: "P", phone: null,
  eventDate: "2026-11-20 10:00:00", eventUtcDate: "2026-11-20 15:00:00", language: "Spanish",
  status: "active", manageToken: "tok_12345678", createdAt: new Date(), updatedAt: new Date(),
};
const tour = { title: "Free Tour Centro de Lima", provider: "Guía Lima", duration: "2:30", meetingPoint: { title: { es: "Plaza de Armas" } }, cityName: "Lima" };
const crossSell = (enabled: boolean): CrossSellLoaderDeps => ({
  enabled, transfers: true, noPublicidad: async () => false, now: () => Date.parse("2026-11-10T00:00:00Z"),
  place: async () => ({ cityName: "Lima", country: "PE", cityCode: "lima" }),
  tripCards: async () => [{
    id: "b", path: "/viajes/bus-lima", code: "BBT", kind: "transporte", title: "Bus turístico de Lima", summary: "", image: null, countries: ["PE"], places: "Perú",
    cities: ["Lima"], durationDays: 1, price: null, priceFrom: null, languages: [], dates: ["2026-11-20"], group: "group", freeCancel: false, private: false,
    hotelPickup: false, createdAt: 0, durationMinutes: null,
  }],
});
type Mail = { to: string; subject: string; html: string; text: string };
const base = (enabled: boolean) => {
  const send = vi.fn(async (_m: Mail) => "em");
  return { send, deps: { enabled: true, lang: "es" as const, siteUrl: "https://travelpuzzle.com.mx", getTour: async () => tour, send, crossSell: crossSell(enabled) } };
};
const MARK = 'data-bloque="venta-cruzada"';

describe("REQ-264 el bloque en cada correo, con y sin bandera", () => {
  for (const variant of ["confirmation", "reminder48", "dayOf"] as const) {
    it(`REQ-264 ${variant}: con la bandera sale el bloque con UTM; sin ella, nada`, async () => {
      const on = base(true);
      await sendBookingConfirmation(record, on.deps, { variant });
      const m = on.send.mock.calls[0][0];
      expect(m.html).toContain(MARK);
      expect(m.html).toContain(`utm_campaign=venta-cruzada-${variant}`);
      expect(m.text).toContain("Completa tu viaje a Lima");
      const off = base(false);
      await sendBookingConfirmation(record, off.deps, { variant });
      expect(off.send.mock.calls[0][0].html).not.toContain(MARK);
      expect(off.send.mock.calls[0][0].text).not.toContain("Completa tu viaje");
    });
  }
  it("REQ-264 cambio de reserva (modified) y post-tour llevan el bloque con la bandera", async () => {
    const a = base(true);
    await sendStatusEmail("modified", record, a.deps);
    expect(a.send.mock.calls[0][0].html).toContain("utm_campaign=venta-cruzada-modified");
    const b = base(true);
    await sendReviewRequest(record, b.deps);
    expect(b.send.mock.calls[0][0].html).toContain("utm_campaign=venta-cruzada-review");
  });
  it("REQ-262 rechazo y cancelación nunca, aunque la bandera esté encendida (ni se consulta)", async () => {
    for (const kind of ["rejected", "canceled"] as const) {
      const x = base(true);
      const place = vi.spyOn(x.deps.crossSell, "place");
      await sendStatusEmail(kind, record, x.deps);
      const m = x.send.mock.calls[0][0];
      expect(m.html).not.toContain(MARK);
      expect(m.text).not.toContain("Completa tu viaje");
      expect(place).not.toHaveBeenCalled();
    }
  });
  it("REQ-264 sin la dependencia el correo sale igual que hoy", async () => {
    const send = vi.fn(async (_m: Mail) => "em");
    await sendBookingConfirmation(record, { enabled: true, lang: "es", siteUrl: "https://travelpuzzle.com.mx", getTour: async () => tour, send });
    expect(send.mock.calls[0][0].html).not.toContain(MARK);
  });
});
