// REQ-10958: componentes de la página del paso de reserva único. npx vitest run src/components/reserva/FlowStepper.test.ts
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fichaEjemplo } from "@/ficha/lib/fixtures";
import { readBooking } from "@/ficha/lib/readers/booking";
import { flowPage } from "@/booking/lib/flow-page";
import type { FlowPlan } from "@/booking/lib/flow";
import { FlowStepper, FlowSteps, type FlowStepBodyProps } from "./FlowStepper";

const r = renderToStaticMarkup;
const flags = { bookings: false, paidTours: false, directPurchase: false };
const flow: FlowPlan = { unified: true, steps: ["date-time", "people", "details", "payment", "confirmation", "my-booking"], channel: "tangol-api", payment: "stripe-travelpuzzle", leadHours: 48 };
const read = readBooking(fichaEjemplo(), { path: "/destinos/argentina/el-calafate/tour-ejemplo", flags, query: {} });
const Fecha = ({ page }: FlowStepBodyProps) => createElement("div", { "data-fecha": page.current }, "calendario");
const asesor = createElement("a", { href: "https://wa.me/5215512345678", "data-asesor": "" }, "Habla con un asesor");

describe("REQ-10958: página del paso de reserva único (componentes)", () => {
  it("REQ-10958: la barra pinta los pasos con su estado; el actual lleva aria-current y los hechos enlazan", () => {
    const page = flowPage({ read, flow, lang: "es", slug: "tour-ejemplo", query: { paso: "people" } });
    const out = r(createElement(FlowSteps, { steps: page.steps }));
    expect(out).toContain('data-pasos="6"');
    expect(out).toContain('data-paso="people" data-estado="current" aria-current="step"');
    expect(out).toContain('href="/reservar/tour-ejemplo?paso=date-time"');
    expect(out).not.toContain('href="/reservar/tour-ejemplo?paso=payment"');
  });

  it("REQ-10958: el cuerpo registrado se monta; sin cuerpo registrado cae al asesor y nunca pinta un cobro", () => {
    const page = flowPage({ read, flow, lang: "es", slug: "tour-ejemplo", query: {} });
    const con = r(createElement(FlowStepper, { page, lang: "es", bodies: { "date-time": Fecha }, fallback: asesor, backLabel: "Volver a la ficha" }));
    expect(con).toContain('data-cuerpo="date-time"');
    expect(con).toContain("calendario");
    expect(con).not.toContain("data-asesor");

    const pago = flowPage({ read, flow, lang: "es", slug: "tour-ejemplo", query: { paso: "payment" } });
    const sin = r(createElement(FlowStepper, { page: pago, lang: "es", bodies: { "date-time": Fecha }, fallback: asesor, backLabel: "Volver a la ficha" }));
    expect(sin).toContain('data-cuerpo="advisor"');
    expect(sin).toContain("data-asesor");
    expect(sin).not.toContain("calendario");
    expect(sin).not.toMatch(/<form|tarjeta|card number/i);
  });

  it("REQ-10958: el resumen repite el título, el lugar y el precio del proveedor de la ficha y enlaza de vuelta; los atributos de datos dicen flujo, canal y cobro", () => {
    const page = flowPage({ read, flow, lang: "es", slug: "tour-ejemplo", query: {} });
    const out = r(createElement(FlowStepper, { page, lang: "es", bodies: {}, fallback: asesor, backLabel: "Volver a la ficha" }));
    expect(out).toContain('data-flujo="unico" data-canal="tangol-api" data-cobro="stripe-travelpuzzle"');
    expect(out).toContain("Tour de ejemplo");
    expect(out).toContain("El Calafate");
    expect(out).toContain('href="/destinos/argentina/el-calafate/tour-ejemplo"');
    expect(out).toContain("Volver a la ficha");
  });
});
