import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CompletaTuViajeBlock } from "./CompletaTuViajeBlock";
import { OtrasExperienciasBlock } from "./OtrasExperienciasBlock";
import { GarantiasBlock } from "./GarantiasBlock";
import { completeTripBlockView, otherExperiencesBlockView, type OtherCard, type TransportCard } from "@/ficha/lib/cross-sell-view";
import { GUARANTEE_1711, GUARANTEE_L, guaranteesBlockView, guaranteesFor, noShowFor } from "@/ficha/lib/guarantees";
import { NO_SHOW_G } from "@/legal/lib/no-show";
import { TERMINOS } from "@/legal/lib/terminos";
import type { TransferCardView } from "@/trips/lib/transfer-card";
import { fichaEjemplo } from "@/ficha/lib/fixtures";

const f = fichaEjemplo();
const r = renderToStaticMarkup;
const kiwi: TransferCardView = { id: "kiwitaxi-1", url: "https://kiwitaxi.example/x", title: "Traslado desde el aeropuerto", by: "Lo reservas con Kiwitaxi", external: true };
const tr = (id: string, provider: string | null = "propios"): TransportCard => ({ id, title: `Transporte ${id}`, href: `/traslados/${id}`, provider });
const card = (id: string, provider: string | null): OtherCard => ({ id, title: `Exp ${id}`, href: `/tours/${id}`, provider });

describe("Bloques 19, 20 y 21 de la ficha única", () => {
  it("REQ-10846: transporte por ubicación y Kiwitaxi con la nota §L de afiliado", () => {
    const view = completeTripBlockView(f, [tr("a"), tr("b", "freetour"), tr("c"), tr("d"), tr("e")], kiwi);
    expect(view!.transport.map((t) => t.id)).toEqual(["a", "c", "d"]);
    const out = r(createElement(CompletaTuViajeBlock, { view }));
    expect(out).toContain('data-bloque="completa-tu-viaje"');
    expect(out).toContain("Completa tu viaje");
    expect(out).toContain(GUARANTEE_L.afiliado);
    expect(out).toContain('rel="noopener noreferrer sponsored"');
    expect(completeTripBlockView(f, [], null)).toBeNull();
    expect(r(createElement(CompletaTuViajeBlock, { view: null }))).toBe("");
  });

  it("REQ-10846: Kiwitaxi nunca en una ficha de FREETOUR; el transporte propio sí", () => {
    const ft = { ...f, provider: "freetour" };
    const view = completeTripBlockView(ft, [tr("a")], kiwi);
    expect(view!.affiliate).toBeNull();
    expect(r(createElement(CompletaTuViajeBlock, { view }))).not.toContain("Kiwitaxi");
    expect(completeTripBlockView(ft, [], kiwi)).toBeNull();
  });

  it("REQ-10847: regla 60/40, sin la propia ficha y con tope por proveedor", () => {
    const paid = [card("tour-ejemplo", "tangol"), card("p1", "tangol"), card("p2", "tangol"), card("p3", "tangol"), card("p4", "propios")];
    const free = [card("g1", "freetour"), card("g2", "freetour")];
    const view = otherExperiencesBlockView(f, paid, free, { includePaid: true });
    expect(view!.items.map((c) => c.id)).toEqual(["p1", "p2", "g1"]);
    expect(view!.heading).toBe("Otras experiencias en El Calafate");
    const soloPagados = otherExperiencesBlockView(f, paid, [], { includePaid: true });
    expect(soloPagados!.items.map((c) => c.id)).toEqual(["p1", "p2", "p4"]);
    expect(otherExperiencesBlockView(f, paid, free, { includePaid: false })!.items.map((c) => c.id)).toEqual(["g1", "g2"]);
    const out = r(createElement(OtrasExperienciasBlock, { view }));
    expect(out).toContain('data-bloque="otras-experiencias"');
    expect(otherExperiencesBlockView(f, [card("tour-ejemplo", "x")], [], { includePaid: true })).toBeNull();
    expect(r(createElement(OtrasExperienciasBlock, { view: null }))).toBe("");
  });

  it("REQ-10804: §L literal y ningún «100 %» que no sea «de lo pagado a Travel Puzzle»", () => {
    expect(GUARANTEE_L.tourConCosto).toBe("Precio final a la vista en la moneda del operador, con su equivalente aproximado en pesos. Cancelación gratuita hasta 24/48 h antes según lo indicado en la ficha. Si el operador cancela la actividad, te reembolsamos el 100 % de lo pagado a Travel Puzzle.");
    expect(GUARANTEE_L.boletos).toBe("Tu boleto llega por correo electrónico con código de acceso. Si el operador no puede emitirlo por falta de disponibilidad, te reembolsamos el 100 % de lo pagado a Travel Puzzle.");
    expect(GUARANTEE_L.circuito).toBe("Cotización detallada sin cargos ocultos, respaldada por nuestro Contrato de Adhesión registrado ante PROFECO (núm. 6635-2023). Cambios y cancelaciones conforme a las condiciones del contrato.");
    expect(GUARANTEE_L.afiliado).toBe("Lo reservas y pagas directamente con Kiwitaxi bajo sus propias políticas y términos de cancelación; Travel Puzzle te brinda apoyo informativo para contactar al proveedor si surge alguna incidencia.");
    for (const t of [...Object.values(GUARANTEE_L), ...Object.values(GUARANTEE_1711)]) {
      for (const m of t.matchAll(/100 %/g)) expect(t.slice(m.index!, m.index! + 40)).toBe("100 % de lo pagado a Travel Puzzle.");
    }
  });

  it("REQ-10804: garantía por tipo; nada específico cuando no cobra Travel Puzzle", () => {
    expect(guaranteesFor(f).map((g) => g.id)).toEqual(["tour-con-costo", "excursion"]);
    expect(guaranteesFor({ ...f, taxonomy: { ...f.taxonomy, tipo: { slug: "entradas", label: "Entradas" } } }).map((g) => g.id)).toEqual(["boletos"]);
    expect(guaranteesFor({ ...f, provider: "propios" }).map((g) => g.id)).toEqual(["circuito"]);
    expect(guaranteesFor({ ...f, taxonomy: { ...f.taxonomy, tipo: { slug: "tour", label: "Tour" } } }).map((g) => g.id)).toEqual(["tour-con-costo"]);
    expect(guaranteesFor({ ...f, price: null })).toEqual([]);
    expect(guaranteesFor({ ...f, section: "traslados" })).toEqual([]);
    expect(guaranteesFor({ ...f, booking: { ...f.booking, chargedBy: "provider" } })).toEqual([]);
    const ftGratis = { ...f, provider: "freetour", price: null, booking: { ...f.booking, chargedBy: "none" as const } };
    expect(guaranteesFor(ftGratis)).toEqual([]);
    expect(guaranteesFor(ftGratis, { freetourGuarantees: true }).map((g) => g.text)).toEqual([GUARANTEE_1711.freeTour]);
    expect(guaranteesFor({ ...f, provider: "freetour", booking: { ...f.booking, chargedBy: "provider" } }, { freetourGuarantees: true })).toEqual([]);
  });

  it("REQ-10848: el pie siempre dirige a Términos y condiciones (con el ancla del proveedor si existe)", () => {
    const out = r(createElement(GarantiasBlock, { view: guaranteesBlockView(f) }));
    expect(out).toContain('data-bloque="garantias"');
    expect(out).toContain(GUARANTEE_L.tourConCosto);
    expect(out).toContain('href="/terminos"');
    const sin = r(createElement(GarantiasBlock, { view: guaranteesBlockView({ ...f, price: null }) }));
    expect(sin).not.toContain("<h2");
    expect(sin).toContain('href="/terminos"');
    expect(guaranteesBlockView(f, { providerAnchor: "tangol\"><script>" }).termsHref).toBe("/terminos#tangolscript");
    expect(guaranteesBlockView({ ...f, lang: "en" }).termsLabel).toBe("See the Terms and conditions for this service");
  });

  it("REQ-10796: §G literal en la ficha de tour con costo, igual que en /terminos; free tour y lo que no cobra Travel Puzzle no la llevan", () => {
    expect(TERMINOS).toContain(`## Inasistencia (no-show) y puntualidad\n${NO_SHOW_G}`);
    expect(noShowFor(f)).toBe(NO_SHOW_G);
    expect(noShowFor({ ...f, taxonomy: { ...f.taxonomy, tipo: { slug: "tour", label: "Tour" } } })).toBe(NO_SHOW_G);
    expect(noShowFor({ ...f, price: null })).toBeNull();
    expect(noShowFor({ ...f, provider: "freetour", price: null, booking: { ...f.booking, chargedBy: "none" as const } })).toBeNull();
    expect(noShowFor({ ...f, provider: "freetour" })).toBeNull();
    expect(noShowFor({ ...f, booking: { ...f.booking, chargedBy: "provider" } })).toBeNull();
    expect(noShowFor({ ...f, section: "traslados" })).toBeNull();
    expect(noShowFor({ ...f, provider: "propios" })).toBeNull();
    expect(noShowFor({ ...f, taxonomy: { ...f.taxonomy, tipo: { slug: "entradas", label: "Entradas" } } })).toBeNull();
    const out = r(createElement(GarantiasBlock, { view: guaranteesBlockView(f) }));
    expect(out).toContain('data-no-show');
    expect(out).toContain("Inasistencia (no-show) y puntualidad");
    expect(out).toContain(NO_SHOW_G);
    const en = r(createElement(GarantiasBlock, { view: guaranteesBlockView({ ...f, lang: "en" }) }));
    expect(en).toContain(NO_SHOW_G);
    expect(en).toContain("No-show and punctuality");
    expect(r(createElement(GarantiasBlock, { view: guaranteesBlockView({ ...f, price: null }) }))).not.toContain("data-no-show");
  });
});
