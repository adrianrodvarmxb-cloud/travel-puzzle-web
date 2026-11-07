import { describe, expect, it } from "vitest";
import { addDays, mixWindow, mixProblems, planDelDia, MIX_WINDOW_DAYS, MIX_MAX, FREE_TOUR_POSTS_B1 } from "./mix";
import type { CalendarItem } from "../content/calendario";

const p = (publishedAt: string, mix: "pago" | "free", clusterId?: string) => ({ publishedAt, mix, draft: false, clusterId, targetTerm: clusterId ?? publishedAt });
const cal: CalendarItem[] = [
  { id: "A", pillar: "europa", mix: "pago", term: "a", catalog: "/tours" },
  { id: "B", pillar: "europa", mix: "pago", term: "b", catalog: "/tours" },
  { id: "F1", pillar: "mexico", mix: "free", term: "f1", catalog: "/tours" },
  { id: "C", pillar: "china", mix: "pago", term: "c", catalog: "/tours" },
];

describe("mezcla 80/20", () => {
  it("REQ-962: ventana móvil de 10 días con máximo 8 de pago y 2 de free", () => {
    expect(MIX_WINDOW_DAYS).toBe(10);
    expect(MIX_MAX).toEqual({ pago: 8, free: 2 });
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-11-07", -9)).toBe("2026-10-29");
    const eight = Array.from({ length: 8 }, (_, i) => p(addDays("2026-11-01", i), "pago"));
    expect(mixWindow(eight, "2026-11-10")).toEqual({ pago: 8, free: 0 });
    expect(mixProblems({ publishedAt: "2026-11-10", mix: "pago" }, eight)).toEqual(["mezcla 80/20: ya hay 8 entradas de pago en los 10 días que terminan el 2026-11-10"]);
    expect(mixProblems({ publishedAt: "2026-11-10", mix: "free" }, eight)).toEqual([]);
    // El día 11 sale la primera del día 1 de la ventana: vuelve a caber una de pago.
    expect(mixProblems({ publishedAt: "2026-11-11", mix: "pago" }, eight)).toEqual([]);
    const twoFree = [p("2026-11-03", "free"), p("2026-11-04", "free")];
    expect(mixProblems({ publishedAt: "2026-11-05", mix: "free" }, twoFree)[0]).toMatch(/2 entradas de free/);
  });

  it("REQ-962: una entrada por día; los borradores y los que no declaran mezcla no cuentan", () => {
    expect(mixProblems({ publishedAt: "2026-11-07", mix: "pago" }, [p("2026-11-07", "free")])).toEqual(["ya hay una entrada publicada el 2026-11-07"]);
    expect(mixWindow([{ ...p("2026-11-07", "pago"), draft: true }, { publishedAt: "2026-11-06", draft: false }], "2026-11-07")).toEqual({ pago: 0, free: 0 });
  });

  it("REQ-983: con B1 bloqueado el plan salta los free tours y, si ya no cabe uno de pago, responde «ninguno»", () => {
    expect(FREE_TOUR_POSTS_B1).toBe(false);
    expect(planDelDia({ posts: [], calendar: cal, today: "2026-11-07", b1: false })).toMatchObject({ kind: "pago", item: { id: "A" } });
    const used = [p("2026-11-06", "pago", "A"), p("2026-11-05", "pago", "B")];
    expect(planDelDia({ posts: used, calendar: cal, today: "2026-11-07", b1: false })).toMatchObject({ kind: "pago", item: { id: "C" } });
    const eight = Array.from({ length: 8 }, (_, i) => p(addDays("2026-10-29", i), "pago", `x${i}`));
    const r = planDelDia({ posts: eight, calendar: cal, today: "2026-11-07", b1: false });
    expect(r.kind).toBe("ninguno");
    expect(r.motivo).toMatch(/B1/);
    expect(planDelDia({ posts: [p("2026-11-07", "pago", "A")], calendar: cal, today: "2026-11-07", b1: false }).kind).toBe("ninguno");
  });

  it("REQ-962: con B1 autorizado sigue el orden del calendario y respeta la ventana", () => {
    const used = [p("2026-11-06", "pago", "A"), p("2026-11-05", "pago", "B")];
    expect(planDelDia({ posts: used, calendar: cal, today: "2026-11-07", b1: true })).toMatchObject({ kind: "free", item: { id: "F1" } });
    const twoFree = [...used, p("2026-11-04", "free", "z1"), p("2026-11-03", "free", "z2")];
    expect(planDelDia({ posts: twoFree, calendar: cal, today: "2026-11-07", b1: true })).toMatchObject({ kind: "pago", item: { id: "C" } });
  });
});
