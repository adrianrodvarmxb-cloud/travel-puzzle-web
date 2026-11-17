// REQ-10736 (decisión 28): la ficha sin punto exacto pinta «Zona aproximada» centrada en la ciudad y SIN «Cómo llegar»;
// con punto exacto, el mapa de hoy con el botón. Sin vista (bandera apagada o sin coordenadas), ni mapa ni botón.
// npx vitest run src/components/tours/one/TourMeetingPoint.test.ts
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/language-context", () => ({ useLanguage: () => ({ t: (k: string, d?: string) => d ?? k, language: "es" }) }));
vi.mock("next/dynamic", () => ({ default: () => (props: { point: { lat: number; lng: number }; radiusM?: number }) => createElement("div", { "data-map": `${props.point.lat},${props.point.lng}`, "data-radius": props.radiusM ?? "" }) }));

const { TourMeetingPoint } = await import("./TourMeetingPoint");
const mp = { title: "Plaza Mayor", coordinates: "40.4154,-3.7074" } as never;
const sinCoords = { title: "Centro de la ciudad", coordinates: "" } as never;

describe("REQ-10736: punto exacto o «Zona aproximada»", () => {
  it("REQ-10736: con punto exacto, mapa en el punto y botón «Cómo llegar» (como hoy)", () => {
    const html = renderToStaticMarkup(createElement(TourMeetingPoint, { meetingPoint: mp }));
    expect(html).toContain('data-map="40.4154,-3.7074"');
    expect(html).toContain("google.com/maps/dir");
    expect(html).not.toContain("Zona aproximada");
  });

  it("REQ-10736: sin punto exacto y con vista de zona, círculo centrado en la ciudad, aviso y SIN «Cómo llegar»", () => {
    const html = renderToStaticMarkup(createElement(TourMeetingPoint, { meetingPoint: sinCoords, fichaMap: { kind: "zone", lat: 40.4168, lng: -3.7038, radiusM: 1500, directions: false } }));
    expect(html).toContain('data-map="40.4168,-3.7038"');
    expect(html).toContain('data-radius="1500"');
    expect(html).toContain("Zona aproximada");
    expect(html).not.toContain("google.com/maps/dir");
  });

  it("REQ-10736 / REQ-10737: sin punto exacto y sin vista (bandera apagada o ciudad sin coordenadas), ni mapa ni botón (nunca un centro inventado)", () => {
    const html = renderToStaticMarkup(createElement(TourMeetingPoint, { meetingPoint: sinCoords, fichaMap: null }));
    expect(html).not.toContain("data-map");
    expect(html).not.toContain("google.com/maps/dir");
    expect(html).toContain("Centro de la ciudad");
  });

  it("REQ-10736: la vista exacta del servidor coincide con el punto del tour y conserva el botón", () => {
    const html = renderToStaticMarkup(createElement(TourMeetingPoint, { meetingPoint: mp, fichaMap: { kind: "exact", lat: 40.4154, lng: -3.7074, directions: true } }));
    expect(html).toContain("google.com/maps/dir");
    expect(html).not.toContain("Zona aproximada");
  });
});
