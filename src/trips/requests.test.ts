import { describe, it, expect, vi } from "vitest";
import { submitRequest, type RequestDeps } from "./requests";
import { requestInputSchema } from "./schemas/request";

const trip = {
  id: "t1", code: "TP-MX-E01-007", titleEs: "Clase de cocina", kind: "unica", currency: "MXN" as const, minNoticeHours: 24, path: "/viajes/mexico/x",
  options: [{ id: "g1", name: "En grupo", mode: "group" as const, adult: 1000, child: 600, infant: 0, childAgeMin: 3, childAgeMax: 11 }],
  availability: { weekdays: [5], slots: [{ time: "09:00", capacity: 10 }], closedDates: [], seasons: [] },
};
const input = requestInputSchema.parse({ kind: "reserva", tripId: "t1", date: "2027-03-05", time: "09:00", optionId: "g1", firstName: "Ana", lastName: "Pérez", email: "ana@example.com", phone: "+52 55 1234 5678", adults: 2, children: 1, childAges: [7], consent: true });

function deps(over: Partial<RequestDeps> = {}): RequestDeps {
  return {
    now: new Date("2027-03-01T12:00:00Z"), random: () => "ab12cd", siteUrl: "https://travelpuzzle.com.mx", whatsapp: "525536490320",
    findTrip: vi.fn(async () => trip), save: vi.fn(async () => {}), sendCustomer: vi.fn(async () => {}), sendTeam: vi.fn(async () => {}), ...over,
  };
}

describe("submitRequest", () => {
  it("guarda con folio y estimado, y manda los dos correos", async () => {
    const d = deps();
    expect(await submitRequest(input, d)).toEqual({ ok: true, ref: "SOL-20270301-AB12" });
    expect(d.save).toHaveBeenCalledWith(expect.objectContaining({ ref: "SOL-20270301-AB12", tripId: "t1", estimate: 2600, currency: "MXN", status: "new", optionName: "En grupo" }));
    expect(d.sendCustomer).toHaveBeenCalledWith(expect.objectContaining({ to: "ana@example.com", subject: "Travel Puzzle / Solicitud de cotización" }));
    expect(d.sendTeam).toHaveBeenCalledWith(expect.objectContaining({ subject: expect.stringContaining("SOL-20270301-AB12") }));
  });
  it("fecha u horario que no opera: error claro y no guarda", async () => {
    const d = deps();
    expect(await submitRequest({ ...input, date: "2027-03-04" } as typeof input, d)).toEqual({ ok: false, error: "Esa fecha no está disponible. Elige otra." });
    expect(await submitRequest({ ...input, time: "11:00" } as typeof input, d)).toEqual({ ok: false, error: "Ese horario no está disponible." });
    expect(d.save).not.toHaveBeenCalled();
  });
  it("edad de niño fuera del rango de la opción", async () => {
    expect(await submitRequest({ ...input, childAges: [15] } as typeof input, deps())).toEqual({ ok: false, error: "Los niños de esta opción son de 3 a 11 años; los mayores cuentan como adultos." });
  });
  it("viaje no publicado o inexistente", async () => {
    expect(await submitRequest(input, deps({ findTrip: vi.fn(async () => null) }))).toEqual({ ok: false, error: "Este viaje ya no está disponible." });
  });
  it("si un correo falla, la solicitud igual queda guardada", async () => {
    const d = deps({ sendCustomer: vi.fn(async () => { throw new Error("resend"); }) });
    expect((await submitRequest(input, d)).ok).toBe(true);
    expect(d.save).toHaveBeenCalled();
  });
});
