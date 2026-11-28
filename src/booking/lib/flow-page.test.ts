// REQ-10958: modelo de la página del paso de reserva único (ola 8, PR 2). npx vitest run src/booking/lib/flow-page.test.ts
import { describe, expect, it } from "vitest";
import { fichaEjemplo } from "@/ficha/lib/fixtures";
import { readBooking } from "@/ficha/lib/readers/booking";
import { bookingFlow, type FlowPlan } from "./flow";
import { bookingPagePath, flowPage, FLOW_STEP_LABELS, stepFromQuery } from "./flow-page";

const flags = { bookings: false, paidTours: false, directPurchase: false };
const path = "/destinos/argentina/buenos-aires/minitrekking";

function lectura(query: Record<string, string> = {}) {
  const f = fichaEjemplo();
  return { f, read: readBooking(f, { path, flags, query }) };
}

const flujo = (steps: FlowPlan["steps"], extra: Partial<FlowPlan> = {}): FlowPlan => ({ unified: true, steps, channel: "tangol-api", payment: "stripe-travelpuzzle", leadHours: 48, ...extra });

describe("REQ-10958: página del paso de reserva único (ola 8, PR 2)", () => {
  it("REQ-10958: la ruta de la página de reserva sale del slug de la ficha: /reservar/<slug>", () => {
    expect(bookingPagePath("minitrekking")).toBe("/reservar/minitrekking");
    expect(bookingPagePath(" Minitrekking/../x ")).toBe("/reservar/minitrekking-x");
  });

  it("REQ-10958: el paso actual sale de ?paso= solo si es un paso del flujo; si no, el primero", () => {
    const steps = flujo(["date-time", "people", "details", "payment", "confirmation", "my-booking"]).steps;
    expect(stepFromQuery({ paso: "people" }, steps)).toBe("people");
    expect(stepFromQuery({ paso: ["details", "people"] }, steps)).toBe("details");
    expect(stepFromQuery({ paso: "payment" }, ["date-time", "people", "details", "confirmation"])).toBe("date-time");
    expect(stepFromQuery({}, steps)).toBe("date-time");
    expect(stepFromQuery({ paso: "advisor" }, ["advisor"])).toBe("advisor");
  });

  it("REQ-10958: el modelo trae los pasos del flujo con su estado (hecho, actual, pendiente), etiqueta en el idioma de la ficha y enlace con el prellenado", () => {
    const { read } = lectura({ fecha: "2026-12-20", adultos: "2", ninos: "1" });
    const m = flowPage({ read, flow: flujo(["date-time", "people", "details", "payment", "confirmation", "my-booking"]), lang: "es", slug: "minitrekking", query: { paso: "details", fecha: "2026-12-20", adultos: "2", ninos: "1" } });
    expect(m.current).toBe("details");
    expect(m.steps.map((s) => [s.id, s.state])).toEqual([
      ["date-time", "done"], ["people", "done"], ["details", "current"], ["payment", "todo"], ["confirmation", "todo"], ["my-booking", "todo"],
    ]);
    expect(m.steps.map((s) => s.label)).toEqual(["Fecha y horario", "Personas", "Tus datos", "Pago", "Confirmación", "Mi reserva"]);
    expect(m.prev).toBe("people");
    expect(m.next).toBe("payment");
    // El enlace de cada paso conserva el prellenado válido (fecha, adultos, niños) y cambia solo `paso`.
    expect(m.steps[1].href).toBe("/reservar/minitrekking?paso=people&fecha=2026-12-20&adultos=2&ninos=1");
    expect(m.steps[0].href).toBe("/reservar/minitrekking?paso=date-time&fecha=2026-12-20&adultos=2&ninos=1");
  });

  it("REQ-10958: el resumen repite lo mismo que la ficha (núcleo común): título, lugar, duración, precio del proveedor y cancelación; sin dato, null", () => {
    const { read } = lectura();
    const m = flowPage({ read, flow: flujo(["date-time", "people"]), lang: "es", slug: "minitrekking", query: {} });
    expect(m.summary.title).toBe(read.common.title);
    expect(m.summary.place).toBe(read.common.place);
    expect(m.summary.priceText).toBe(read.common.priceText);
    expect(m.summary.cancellation).toBe(read.common.cancellation);
    expect(m.summary.fichaPath).toBe(path);
    expect(m.summary.duration).toBe(read.common.duration);
  });

  it("REQ-10958: con el flujo del asesor hay un solo paso «advisor» y ningún paso de pago; nada cobra sin precio (REQ-10766)", () => {
    const { read } = lectura();
    const a = flowPage({ read, flow: flujo(["advisor"], { channel: "advisor", payment: "none" }), lang: "en", slug: "minitrekking", query: { paso: "payment" } });
    expect(a.current).toBe("advisor");
    expect(a.steps).toHaveLength(1);
    expect(a.steps[0].label).toBe("Talk to an advisor");
    expect(a.prev).toBeNull();
    expect(a.next).toBeNull();
    expect(a.payment).toBe("none");
    const sinPago = flowPage({ read, flow: flujo(["date-time", "people", "details", "confirmation", "my-booking"], { payment: "none" }), lang: "es", slug: "x", query: {} });
    expect(sinPago.steps.some((s) => s.id === "payment")).toBe(false);
  });

  it("REQ-10958: etiquetas en los 6 idiomas de la página para los 7 pasos; nunca «N/D»", () => {
    for (const lang of ["es", "en", "pt", "fr", "de", "it"] as const) {
      for (const step of ["date-time", "people", "details", "payment", "confirmation", "my-booking", "advisor"] as const) {
        const t = FLOW_STEP_LABELS[lang][step];
        expect(t.length).toBeGreaterThan(1);
        expect(t).not.toMatch(/N\/D/);
      }
    }
  });

  it("REQ-10958: el flujo real de la ficha de ejemplo pasa por el modelo sin inventar pasos (lo que diga bookingFlow es lo que se pinta)", () => {
    const { f, read } = lectura();
    const flow = bookingFlow({ provider: f.provider, booking: f.booking, price: f.price }, read.panel, { unified: true });
    const m = flowPage({ read, flow, lang: "es", slug: "minitrekking", query: {} });
    expect(m.steps.map((s) => s.id)).toEqual(flow.steps);
    expect(m.channel).toBe(flow.channel);
    expect(m.unified).toBe(true);
  });
});
