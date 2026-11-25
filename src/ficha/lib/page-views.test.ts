import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FichaView, type FichaBlockViews } from "@/components/ficha/FichaView";
import { BLOCK_ORDER } from "./blocks";
import { fichaEjemplo } from "./fixtures";
import { fichaPageViews, fichaViews, transportCardsFrom, type FichaViews, type PageViewsInput } from "./page-views";

const flags: PageViewsInput["flags"] = { bookings: true, paidTours: true, directPurchase: false, milaEnabled: true, freetourFaqEnabled: false, cartEnabled: false, cardHold: false };
const input = (over: Partial<PageViewsInput> = {}): PageViewsInput => ({
  f: fichaEjemplo(), prefill: {}, whatsapp: "5215512345678", visitorCountry: "MX", fx: null, flags,
  reviews: { items: [], total: 0 }, transport: [], kiwitaxi: null, others: { paid: [], free: [], includePaid: true },
  ...over,
});

describe("page-views: las props de los 21 bloques y el panel desde el modelo (ola 7)", () => {
  it("REQ-10858: arma props para los 21 bloques con las mismas funciones puras de cada bloque", () => {
    const v = fichaViews(input());
    for (const id of BLOCK_ORDER) expect(v[id], id).toBeDefined();
    expect(v.migas?.items.map((c) => c.name)).toEqual(["Inicio", "Destinos", "Argentina", "El Calafate", "Tour de ejemplo"]);
    expect(v.condiciones?.view.howTitle).toBe("Cómo funciona tu reserva");
    expect(v.condiciones?.view.howSteps.join(" ")).toContain("48 horas hábiles");
    expect(v.incluye?.headings).toEqual({ incluye: "Incluye", noIncluye: "No incluye" });
    expect(v.mila?.view?.href).toContain("wa.me/5215512345678");
    expect(v.garantias?.view.termsHref).toMatch(/^\/terminos/);
  });

  it("REQ-10879: el bloque 12 lleva la ruta del precio local por opción solo con LOCAL_CURRENCY_ENABLED; el HTML sigue en la moneda del proveedor", () => {
    const f = fichaEjemplo();
    f.options = [
      { id: "con", name: "Con traslado", price: { amount: 120, currency: "USD", per: "person" }, transferIncluded: true, startTime: null },
      { id: "sin", name: "Sin traslado", price: { amount: 98, currency: "USD", per: "person" }, transferIncluded: false, startTime: null },
    ];
    const off = fichaViews(input({ f }));
    expect(off.opciones?.cards.map((c) => c.localUrl)).toEqual([null, null]);
    const on = fichaViews(input({ f, flags: { ...flags, localCurrency: true } }));
    expect(on.opciones?.cards.map((c) => c.priceLabel)).toEqual(["USD $120 por persona", "USD $98 por persona"]);
    expect(on.opciones?.cards.map((c) => c.localUrl)).toEqual([
      "/api/precio-local?amount=120&currency=USD&per=person&lang=es",
      "/api/precio-local?amount=98&currency=USD&per=person&lang=es",
    ]);
  });

  it("REQ-10858: las props que arma son exactamente las que reciben los componentes (se amarra en tipos)", () => {
    const v: FichaBlockViews = fichaViews(input());
    const w: FichaViews = v as FichaBlockViews;
    expect(Object.keys(w)).toHaveLength(21);
  });

  it("REQ-10858: FichaView pinta el modelo de ejemplo sin «N/D», con el orden de blocksFor y sin los bloques sin dato", () => {
    const p = fichaPageViews(input());
    expect(p.order).toContain("titulo");
    expect(p.order).toContain("condiciones");
    expect(p.order).toContain("garantias");
    expect(p.order).not.toContain("itinerario"); // el ejemplo no trae itinerario
    expect(p.order).not.toContain("resenas"); // sin reseñas, no sale
    const html = renderToStaticMarkup(createElement(FichaView, { order: p.order, views: p.views }));
    expect(html).toContain('data-ficha="unica"');
    expect(html).toContain("Tour de ejemplo");
    expect(html).toContain("Cómo funciona tu reserva");
    expect(html).not.toContain("N/D");
  });

  it("REQ-10858: panel desde el plan: Tangol pide formulario y cobra Travel Puzzle; Mila como ayuda; sin carrito, sin «Agregar»", () => {
    const p = fichaPageViews(input({ f: { ...fichaEjemplo(), provider: "tangol" } }));
    expect(p.plan.control).toBe("request-form");
    expect(p.panel.price?.text).toBeTruthy();
    expect(p.panel.advisor?.kind).toBe("mila");
    expect(p.panel.addToTrip).toBeNull();
    expect(p.order).toContain("mila");
  });

  it("REQ-10858: FREETOUR sin «En breve» ni Mila (REQ-570, decisión 42); la ayuda es el asesor", () => {
    const p = fichaPageViews(input({ f: { ...fichaEjemplo(), provider: "freetour" } }));
    expect(p.order).not.toContain("en-breve");
    expect(p.order).not.toContain("mila");
    expect(p.views.mila?.view).toBeNull();
    expect(p.panel.advisor?.kind).toBe("asesor");
  });

  it("REQ-10858: reseñas, transporte y otras experiencias salen solo cuando llegan", () => {
    const review: PageViewsInput["reviews"]["items"][number] = { id: "r1", verified: true, reviewerName: "Ana", title: null, content: "Excelente", rate: 5, addedAt: "2026-01-01T00:00:00.000Z" };
    const p = fichaPageViews(input({
      reviews: { items: [review], total: 1 },
      transport: [{ id: "t1", title: "Traslado", href: "/destinos/ar/el-calafate/traslado", provider: "tangol" }],
      others: { paid: [{ id: "o1", title: "Otra", href: "/destinos/ar/el-calafate/otra", provider: "tangol" }], free: [], includePaid: true },
    }));
    expect(p.order).toContain("resenas");
    expect(p.order).toContain("completa-tu-viaje");
    expect(p.order).toContain("otras-experiencias");
    const html = renderToStaticMarkup(createElement(FichaView, { order: p.order, views: p.views }));
    expect(html).toContain("Excelente");
    expect(html).toContain("Traslado");
    expect(html).toContain("Otra");
  });

  it("REQ-10860: la franja de transporte de hoy se vuelve tarjetas del bloque 19; sin ruta o título, fuera", () => {
    const cards = transportCardsFrom([
      { id: "a", path: "/destinos/ar/el-calafate/traslado", title: " Traslado ", image: null },
      { id: "b", path: "", title: "Sin ruta", image: null },
      { id: "c", path: "/x", title: "  ", image: "https://img/x.jpg" },
    ]);
    expect(cards).toEqual([{ id: "a", title: "Traslado", href: "/destinos/ar/el-calafate/traslado", provider: null, imageUrl: null }]);
  });
});
