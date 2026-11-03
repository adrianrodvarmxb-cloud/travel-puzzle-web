import { describe, it, expect, vi } from "vitest";
import { saveTrip, setTripStatus, type TripsDeps, type StoredTrip } from "./manage";
import { tripInputSchema } from "./schemas/trip";

const input = tripInputSchema.parse({ code: "FCHTP", kind: "circuito", purchaseMode: "quote", titleEs: "China Maravillosa", countries: ["China"], priceFrom: 2490, currency: "USD", images: [{ key: "trips/1-a.jpg", alt: "" }] });
const stored = (over: Partial<StoredTrip> = {}): StoredTrip => ({ ...input, id: "t1", slug: "china-maravillosa-fchtp", status: "draft", ...over });

function deps(over: Partial<TripsDeps> = {}): TripsDeps {
  return {
    findById: vi.fn(async () => stored()),
    findByCode: vi.fn(async () => null),
    create: vi.fn(async (d) => ({ ...d, id: "t1" }) as StoredTrip),
    update: vi.fn(async (id, d) => ({ ...stored(), ...d, id }) as StoredTrip),
    setStatus: vi.fn(async () => {}),
    ...over,
  };
}

describe("saveTrip", () => {
  it("crea como borrador con su slug", async () => {
    const d = deps();
    const r = await saveTrip(null, input, d);
    expect(r).toMatchObject({ ok: true, trip: { id: "t1" } });
    expect(d.create).toHaveBeenCalledWith(expect.objectContaining({ slug: "china-maravillosa-fchtp", status: "draft" }));
  });
  it("no repite códigos", async () => {
    const d = deps({ findByCode: vi.fn(async () => stored({ id: "otro" })) });
    expect(await saveTrip(null, input, d)).toEqual({ ok: false, error: "Ya existe un viaje con el código FCHTP" });
  });
  it("edita y conserva el estado", async () => {
    const d = deps({ findByCode: vi.fn(async () => stored()) });
    await saveTrip("t1", { ...input, titleEs: "China Maravillosa 2027" }, d);
    expect(d.update).toHaveBeenCalledWith("t1", expect.objectContaining({ slug: "china-maravillosa-2027-fchtp" }));
    expect(d.update).toHaveBeenCalledWith("t1", expect.not.objectContaining({ status: expect.anything() }));
  });
  it("rechaza fechas con más de 4 horarios", async () => {
    const bad = { ...input, dates: [{ date: "2027-03-01", times: ["08:00", "09:00", "10:00", "11:00", "12:00"] }] };
    expect(await saveTrip(null, bad, deps())).toMatchObject({ ok: false });
  });
  it("si se edita un viaje publicado y queda incompleto, no se guarda", async () => {
    const d = deps({ findById: vi.fn(async () => stored({ status: "published" })), findByCode: vi.fn(async () => stored()) });
    expect(await saveTrip("t1", { ...input, images: [] }, d)).toEqual({ ok: false, error: "Para publicar falta: al menos una foto" });
  });
});

describe("setTripStatus", () => {
  it("publicar exige lo mínimo", async () => {
    const d = deps({ findById: vi.fn(async () => stored({ images: [] })) });
    expect(await setTripStatus("t1", "published", d)).toEqual({ ok: false, error: "Para publicar falta: al menos una foto" });
    expect(d.setStatus).not.toHaveBeenCalled();
  });
  it("publicar, ocultar o volver a borrador (nunca se borra)", async () => {
    const d = deps();
    expect(await setTripStatus("t1", "published", d)).toEqual({ ok: true });
    expect(await setTripStatus("t1", "hidden", d)).toEqual({ ok: true });
    expect(d.setStatus).toHaveBeenLastCalledWith("t1", "hidden");
  });
  it("viaje inexistente", async () => {
    expect(await setTripStatus("x", "hidden", deps({ findById: vi.fn(async () => null) }))).toEqual({ ok: false, error: "No encontramos ese viaje" });
  });
});
