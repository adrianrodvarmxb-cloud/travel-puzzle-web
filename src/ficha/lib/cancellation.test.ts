import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cancellationSummary, hoursFromPolicyText, singleCancellation } from "./cancellation";
import { practicalInfo } from "@/tours/lib/practical-info";
import { tourPage } from "@/destinations/lib/page-model";
import { destinationTree, findCity } from "@/destinations/lib/catalog";
import { fx, tour as fila } from "@/destinations/fixtures/destinos";

const arbol = destinationTree({ ...fx, tours: [{ ...fila(10, 1, { title: "Centro Histórico", reviews: 900 }), providerId: "tangol" }], trips: [], now: new Date("2026-11-05T12:00:00Z") });
const cdmx = findCity(arbol, "mx", "ciudad-de-mexico")!;

// REQ-10655 (decisión 34, REQ-10612; gate REQ-10654 «El más estricto»): una sola política de cancelación por ficha.
const reglas = (...h: (number | null)[]) => ({ options: h.map((x, i) => ({ id: i, hoursCancelation: x })) });

describe("REQ-10655: una sola cancelación por ficha, la más estricta", () => {
  it("REQ-10655: lee el plazo del texto del proveedor (horas y días)", () => {
    expect(hoursFromPolicyText("Gratis Hasta 48hs Antes Del Viaje")).toBe(48);
    expect(hoursFromPolicyText("Gratis Hasta 24hs Antes")).toBe(24);
    expect(hoursFromPolicyText("Gratis Hasta 7 Días Antes")).toBe(168);
    expect(hoursFromPolicyText("gratis hasta 72 horas antes")).toBe(72);
    for (const t of ["Términos Generales", "Gratuita", "", null, undefined]) expect(hoursFromPolicyText(t)).toBeNull();
  });
  it("REQ-10655: si el dato dice 24 h y el texto 48 h, queda 48 h y el texto ya no se repite", () => {
    expect(singleCancellation({ structuredHours: [24], text: "Gratis Hasta 48hs Antes Del Viaje" })).toEqual({ hours: 48, text: null });
    expect(singleCancellation({ structuredHours: [72], text: "Gratis Hasta 24hs Antes" })).toEqual({ hours: 72, text: null });
  });
  it("REQ-10655: entre opciones con plazos distintos gana el mayor", () => {
    expect(singleCancellation({ structuredHours: [24, 72, 0, -1], text: null })).toEqual({ hours: 72, text: null });
  });
  it("REQ-10655: sin plazo en horas queda el texto del proveedor, uno solo; sin nada, nada", () => {
    expect(singleCancellation({ structuredHours: [], text: " Términos Generales " })).toEqual({ hours: null, text: "Términos Generales" });
    expect(singleCancellation({ structuredHours: [24], text: "Términos Generales" })).toEqual({ hours: 24, text: null });
    expect(singleCancellation({ structuredHours: [], text: null })).toEqual({ hours: null, text: null });
  });
  it("REQ-10655: la ficha recibe un solo plazo en Condiciones", () => {
    const v = practicalInfo({ providerId: "tangol", cancellationPolicy: "Gratis Hasta 48hs Antes Del Viaje", availabilityRules: JSON.stringify(reglas(24)) }, { lang: "es", tr: (k) => k });
    expect(v.conditions?.freeCancellation).toEqual({ hours: 48, varies: false });
    expect(v.conditions?.cancellationPolicy).toBeNull();
  });
  it("REQ-10655: el resumen junto al título dice el mismo plazo, en horas o en días", () => {
    expect(cancellationSummary(48, "es")).toBe("Cancelación sin cargo hasta 48 h antes de la salida.");
    expect(cancellationSummary(168, "es")).toBe("Cancelación sin cargo hasta 7 días antes de la salida.");
    expect(cancellationSummary(48, "en")).toBe("Free cancellation up to 48 h before departure.");
    expect(cancellationSummary(null, "es")).toBeNull();
  });
  it("REQ-10655: un tour de proveedor por API ya no hereda el «24 h» de los tours de pago del primer proveedor", () => {
    const base = { country: cdmx.country, city: cdmx.city, siteUrl: "https://x", lang: "es" as const };
    const tour = { ...cdmx.city.freeTours[0], isFreeTour: false, price: 100, providerId: "tangol" };
    expect(tourPage({ ...base, tour, detail: { providerId: "tangol", cancellationHours: 48 } }).notice).toEqual(["Cancelación sin cargo hasta 48 h antes de la salida."]);
    expect(tourPage({ ...base, tour, detail: { providerId: "tangol", cancellationHours: null } }).notice).toEqual([]);
    const primero = tourPage({ ...base, tour: { ...tour, providerId: "freetour" }, detail: { providerId: "freetour" } });
    expect(primero.notice.join(" ")).toMatch(/24 h/);
  });
});

// INC-023: la página arma dos modelos (uno sin detalle para migas y otro completo). El aviso junto al título
// tiene que salir del completo, que es el que conoce el plazo del proveedor.
describe("REQ-10655: cableado del aviso en la ficha (INC-023)", () => {
  it("REQ-10655: el aviso junto al título sale del modelo completo, no del modelo sin detalle", () => {
    const page = readFileSync("src/app/destinos/[pais]/[ciudad]/[slug]/page.tsx", "utf8");
    expect(page).toContain("notice: full.notice");
    expect(page).not.toContain("notice: model.notice");
    expect(page).toMatch(/cancellationHours: props\.practical\?\.conditions\?\.freeCancellation\?\.hours/);
  });
});

