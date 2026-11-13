import { describe, it, expect, vi } from "vitest";
import { saveTrip, setTripStatus, type TripsDeps, type StoredTrip } from "./manage";
import { tripInputSchema } from "./schemas/trip";
import { MIN_PHOTOS } from "./lib/publish";

const input = tripInputSchema.parse({
  kind: "unica", purchaseMode: "quote", titleEs: "Cocina oaxaqueña", summaryEs: "Cocina con chefs", descriptionEs: "Texto",
  highlights: ["Cocina mole", "Visita mercado", "Come lo que preparas"], includes: ["Comida"], excludes: ["Propinas"],
  countries: ["MX"], durationDays: 1, languages: ["es"], options: [{ id: "a", name: "Grupo", adult: 1200 }],
  meetingPoints: [{ name: "Mercado", lat: 17.06, lng: -96.72 }],
  images: Array.from({ length: MIN_PHOTOS }, (_, i) => ({ key: `trips/${i}-a.jpg` })),
});

const stored = (over: Partial<StoredTrip> = {}): StoredTrip => ({ ...input, id: "t1", slug: "cocina", code: "TP-MX-E01-001", seq: 1, codeLocked: false, priceFrom: 1200, status: "draft", ...over });

function deps(over: Partial<TripsDeps> = {}): TripsDeps {
  return {
    findById: vi.fn(async () => stored()),
    agencyInitials: vi.fn(async (id: string | null) => (id ? "EMV" : "TP")),
    nextSeq: vi.fn(async () => 7),
    create: vi.fn(async (d) => ({ ...d, id: "t1" }) as StoredTrip),
    update: vi.fn(async (id, d) => ({ ...stored(), ...d, id }) as StoredTrip),
    setStatus: vi.fn(async () => {}),
    ...over,
  };
}

describe("saveTrip v2", () => {
  it("crea con código automático, consecutivo y 'Desde' calculado", async () => {
    const d = deps();
    const r = await saveTrip(null, { ...input, code: "MANUAL" }, d);
    expect(r.ok).toBe(true);
    expect(d.create).toHaveBeenCalledWith(expect.objectContaining({ code: "TP-MX-E01-007", seq: 7, priceFrom: 1200, status: "draft", codeLocked: false, slug: "cocina-oaxaquena-tp-mx-e01-007" }));
  });
  it("antes de publicar, el código se actualiza con los datos (mismo consecutivo)", async () => {
    const d = deps();
    await saveTrip("t1", { ...input, durationDays: 3 }, d);
    expect(d.update).toHaveBeenCalledWith("t1", expect.objectContaining({ code: "TP-MX-E03-001" }));
    expect(d.nextSeq).not.toHaveBeenCalled();
  });
  it("ya publicado una vez, el código no cambia", async () => {
    const d = deps({ findById: vi.fn(async () => stored({ codeLocked: true, status: "hidden" })) });
    await saveTrip("t1", { ...input, durationDays: 3, countries: ["JP"] }, d);
    expect(d.update).toHaveBeenCalledWith("t1", expect.objectContaining({ code: "TP-MX-E01-001" }));
  });
  it("un viaje publicado no puede quedar incompleto", async () => {
    const d = deps({ findById: vi.fn(async () => stored({ status: "published", codeLocked: true })) });
    const r = await saveTrip("t1", { ...input, images: [] }, d);
    expect(r).toEqual({ ok: false, error: `Para publicar falta: al menos ${MIN_PHOTOS} foto (tienes 0)` });
  });
});

describe("setTripStatus v2", () => {
  it("publicar revisa el checklist y congela el código", async () => {
    const d = deps();
    expect(await setTripStatus("t1", "published", d)).toEqual({ ok: true });
    expect(d.setStatus).toHaveBeenCalledWith("t1", "published", true);
  });
  it("si falta algo, dice qué y no publica", async () => {
    const d = deps({ findById: vi.fn(async () => stored({ highlights: [] })) });
    expect(await setTripStatus("t1", "published", d)).toEqual({ ok: false, error: "Para publicar falta: 3 a 5 puntos destacados" });
    expect(d.setStatus).not.toHaveBeenCalled();
  });
  it("ocultar o regresar a borrador no toca el candado del código", async () => {
    const d = deps();
    await setTripStatus("t1", "hidden", d);
    expect(d.setStatus).toHaveBeenCalledWith("t1", "hidden", false);
  });
  it("REQ-3535: «solo con enlace» pide el mismo checklist que publicar", async () => {
    const d = deps();
    expect(await setTripStatus("t1", "unlisted", d)).toEqual({ ok: true });
    expect(d.setStatus).toHaveBeenCalledWith("t1", "unlisted", false);
    const incomplete = deps({ findById: vi.fn(async () => stored({ highlights: [] })) });
    expect(await setTripStatus("t1", "unlisted", incomplete)).toEqual({ ok: false, error: "Para publicar falta: 3 a 5 puntos destacados" });
  });
});
