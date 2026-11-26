// REQ-10889 (REQ-10888, PO 26-11-2026: «Solo las del proveedor»): garantías por proveedor en el bloque 21.
import { describe, expect, it } from "vitest";
import { GUARANTEE_L, guaranteesBlockView, guaranteesFor } from "./guarantees";
import { PROVIDER_GUARANTEES, providerGuaranteesFor } from "./provider-guarantees";
import type { FichaModel } from "./model";

const viaje = (over: Partial<Pick<FichaModel, "providerId" | "lang" | "provider" | "section" | "price" | "booking" | "taxonomy">> = {}) => ({
  provider: "propios",
  providerId: "ag-tas",
  lang: "es" as const,
  section: "experiencias" as const,
  taxonomy: { tipo: { slug: "visita-guiada", label: "Visita guiada" } } as unknown as FichaModel["taxonomy"],
  price: { amount: 120, currency: "USD", per: "person" as const },
  booking: { mode: "request" as const, chargedBy: "travelpuzzle" as const, leadHours: 72 },
  ...over,
});

describe("REQ-10889: garantías por proveedor (bloque 21)", () => {
  it("REQ-10889: con la bandera, un viaje de agencia ya no lleva el §L «circuito» ni PROFECO: solo lo que consta de su proveedor", () => {
    const con = guaranteesFor(viaje(), { providerGuarantees: true });
    expect(con.map((g) => g.id)).toEqual(["proveedor-deposito", "proveedor-cancelacion", "proveedor-reembolso", "proveedor-reclamaciones"]);
    expect(JSON.stringify(con)).not.toMatch(/PROFECO|6635-2023|circuito/i);
    // Turismo Asiático: el depósito no reembolsable (T&C 2026, correo del 6-11-2026) llega a la ficha.
    expect(con[0].text).toContain("depósito no reembolsable de entre el 30 % y el 50 %");
    expect(con[1].text).toContain("hasta 30 días antes se cobra el 30 %");
  });

  it("REQ-10889: con la bandera apagada el bloque es el de hoy (§L circuito, REQ-10804)", () => {
    expect(guaranteesFor(viaje())).toEqual([{ id: "circuito", text: GUARANTEE_L.circuito }]);
    expect(guaranteesFor(viaje(), { providerGuarantees: false })).toEqual([{ id: "circuito", text: GUARANTEE_L.circuito }]);
  });

  it("REQ-10889: sin dato del proveedor no hay texto de garantía (nunca «N/D» ni texto genérico); el bloque solo lleva el enlace a /terminos", () => {
    for (const providerId of ["ag-exe", "ag-dco", "ag-iwp", "ag-ext", "", null]) {
      expect(guaranteesFor(viaje({ providerId }), { providerGuarantees: true })).toEqual([]);
    }
    const v = guaranteesBlockView(viaje({ providerId: "ag-exe" }), { providerGuarantees: true });
    expect(v.items).toEqual([]);
    expect(v.termsHref).toBe("/terminos");
    expect(JSON.stringify(v)).not.toMatch(/N\/D|PROFECO/);
  });

  it("REQ-10889: mismo patrón en los demás proveedores con expediente: Fantástica China (cancelación por tramos) y Big Bus (reembolso total)", () => {
    expect(providerGuaranteesFor({ providerId: "ag-fch", lang: "es" }).map((g) => g.id)).toEqual(["proveedor-cancelacion", "proveedor-reembolso"]);
    expect(providerGuaranteesFor({ providerId: "ag-fch", lang: "es" })[0].text).toContain("46, 30, 17, 11 o 3 días");
    expect(providerGuaranteesFor({ providerId: "ag-bbt", lang: "es" }).map((g) => g.id)).toEqual(["proveedor-reembolso"]);
  });

  it("REQ-10889: en inglés sale la traducción; otros idiomas caen al español (versión vinculante, §J); la clave no distingue mayúsculas", () => {
    expect(providerGuaranteesFor({ providerId: "AG-TAS", lang: "en" })[0].text).toContain("non-refundable deposit of 30 % to 50 %");
    expect(providerGuaranteesFor({ providerId: "ag-tas", lang: "pt" })[0].text).toContain("depósito no reembolsable");
  });

  it("REQ-10889: cada hecho lleva su fuente (expediente) y ningún texto trae neto, margen, comisión ni cuentas", () => {
    for (const [id, facts] of Object.entries(PROVIDER_GUARANTEES)) {
      expect(id).toMatch(/^ag-[a-z]{3}$/);
      for (const f of facts) {
        expect(f.source).toMatch(/expediente-2026-11-15\.md/);
        expect(`${f.text.es} ${f.text.en}`).not.toMatch(/\bneto\b|\bnet\b|margen|markup|comisi[oó]n|commission|cuenta bancaria|IBAN|SWIFT/i);
      }
    }
  });

  it("REQ-10889: tours con costo, boletos y lo que cobra un tercero siguen igual con la bandera encendida", () => {
    expect(guaranteesFor(viaje({ provider: "tangol", providerId: "tangol" }), { providerGuarantees: true }).map((g) => g.id)).toEqual(["tour-con-costo", "excursion"]);
    expect(guaranteesFor(viaje({ booking: { mode: "request", chargedBy: "provider", leadHours: 0 } }), { providerGuarantees: true })).toEqual([]);
  });
});
