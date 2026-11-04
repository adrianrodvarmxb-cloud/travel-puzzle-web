// REQ-023 — un producto de BeMyGuest se convierte en borrador del gestor (gate C: selección curada).
import { describe, expect, it } from "vitest";
import productFx from "../fixtures/product.json";
import priceFx from "../fixtures/price-list-date.json";
import { productSchema, productTypeSchema, priceDaySchema } from "../schemas/api";
import { countryCodeFromName, toTripDraft } from "./catalog-map";
import { tripInputSchema } from "@/trips/schemas/trip";

const product = productSchema.parse(productFx.data);
const day = priceDaySchema.parse(priceFx.data);
const type = (over: Record<string, unknown> = {}) => productTypeSchema.parse({
  uuid: "pt-1", title: "General admission", durationHours: 3, allowChildren: true, minChildAge: 3, maxChildAge: 12,
  cancellationPolicies: [{ numberOfDays: 2, refundPercentage: 100 }], ...over,
});
const base = { agencyId: "agency-bmg", margin: 0.2, fx: { SGD: { to: "USD" as const, rate: 0.77 } } };

describe("producto BeMyGuest → borrador del gestor", () => {
  it("REQ-023: país por nombre en inglés a código ISO", () => {
    expect(countryCodeFromName("Malaysia")).toBe("MY");
    expect(countryCodeFromName("Japan")).toBe("JP");
    expect(countryCodeFromName("Atlantis")).toBeNull();
  });

  it("REQ-023: arma un borrador válido para el gestor, en cotización hasta que exista el pago (ola 2)", () => {
    const r = toTripDraft({ product, types: [{ type: type(), day }], ...base });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const draft = tripInputSchema.parse(r.draft);
    expect(draft).toMatchObject({ kind: "tour", purchaseMode: "quote", agencyId: "agency-bmg", countries: ["MY"], cities: ["Kuala Lumpur"], durationDays: 1, currency: "USD" });
    expect(draft.highlights.length).toBeGreaterThan(0);
    expect(draft.cancellation).toEqual({ type: "custom", tiers: [{ daysBefore: 2, refundPct: 100 }] });
    expect(r.photoUrls[0]).toMatch(/^https:\/\/cdn\.bemyguest\.com\.sg\/images\/content\/1280x720\//);
    expect(r.links).toEqual([{ optionId: "pt-1", productTypeUuid: "pt-1" }]);
  });

  it("REQ-023 + REQ-022: precio de la opción = neto + margen convertido, nunca abajo del mínimo", () => {
    const r = toTripDraft({ product, types: [{ type: type(), day }], ...base });
    if (!r.ok) throw new Error(r.error);
    // adulto: neto 31.59 SGD, mínimo 35 → 38 SGD (20 %) → 38 × 0.77 = 29.26 → 30 USD
    expect(r.draft.options[0]).toMatchObject({ id: "pt-1", adult: 30, childAgeMin: 3, childAgeMax: 12 });
    // niño: neto 25.59 → 31 SGD → 23.87 → 24 USD
    expect(r.draft.options[0].child).toBe(24);
  });

  it("REQ-023: si la moneda no se puede convertir, no importa y lo dice", () => {
    const r = toTripDraft({ product, types: [{ type: type(), day }], ...base, fx: {} });
    expect(r).toEqual({ ok: false, error: "Falta el tipo de cambio de SGD para importar este producto" });
  });

  it("REQ-023: no reembolsable → sin cancelación; máximo 4 opciones", () => {
    const types = Array.from({ length: 6 }, (_, i) => ({ type: type({ uuid: `pt-${i}`, isNonRefundable: true }), day }));
    const r = toTripDraft({ product, types, ...base });
    if (!r.ok) throw new Error(r.error);
    expect(r.draft.options).toHaveLength(4);
    expect(r.draft.cancellation).toEqual({ type: "none", tiers: [] });
  });
});
