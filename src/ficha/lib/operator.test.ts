import { describe, expect, it } from "vitest";
import { SELLER_BRAND, operatorInBrief, operatorLine, sellerFor, underTitleOperator } from "./operator";
import { enBreve, type FichaInput } from "@/seo/lib/ficha-ld";
import { practicalInfo } from "@/tours/lib/practical-info";

// REQ-10651 (construye la decisión 38, REQ-10615; reemplaza REQ-10542): la marca que vende es Travel Puzzle
// y el operador se dice en un lugar discreto, la línea «Opera en destino».
describe("REQ-10651: operador discreto en la ficha", () => {
  it("REQ-10651: la casilla Proveedor de un tour de proveedor por API dice Travel Puzzle, no el operador", () => {
    expect(sellerFor("tangol", "Tangol Tours")).toBe(SELLER_BRAND);
    expect(SELLER_BRAND).toBe("Travel Puzzle");
  });
  it("REQ-10651: la línea «Opera en destino» sí trae al operador", () => {
    expect(operatorLine("tangol", " Tangol Tours ")).toBe("Tangol Tours");
    expect(operatorLine("tangol", "")).toBeNull();
    expect(operatorLine("tangol", null)).toBeNull();
  });
  it("REQ-10651: bajo el título no se nombra al operador; «En breve» tampoco", () => {
    expect(underTitleOperator("tangol", "Tangol Tours")).toBeNull();
    expect(operatorInBrief("tangol")).toBe(false);
  });
  it("REQ-10651: los tours del primer proveedor quedan como hoy hasta su revisión de cumplimiento", () => {
    for (const id of ["freetour", null, undefined, ""]) {
      expect(sellerFor(id, "Angus Coutts")).toBe("Angus Coutts");
      expect(operatorLine(id, "Angus Coutts")).toBeNull();
      expect(underTitleOperator(id, "Angus Coutts")).toBe("Angus Coutts");
      expect(operatorInBrief(id)).toBe(true);
    }
  });
  it("REQ-10651: «En breve» de Tangol ya no dice «Lo opera Tangol Tours»", () => {
    const base: FichaInput = { provider: "tangol", lang: "es", url: "https://x/y", name: "Minitrekking", images: [], operator: "Tangol Tours", free: false, price: 100, currency: "USD", availability: null, duration: "10 h", languages: ["Español"], place: "El Calafate, Argentina", meetingPoint: null } as unknown as FichaInput;
    const texto = enBreve({ ...base, operatorInBrief: false }) ?? "";
    expect(texto).not.toContain("Tangol");
    expect(texto).toContain("El Calafate");
  });
  it("REQ-10651: «Antes de ir» cierra con la línea del operador y sale aunque no haya otro dato", () => {
    const tr = (k: string) => k;
    const con = practicalInfo({ providerId: "tangol", providerTitle: "Tangol Tours", whatToBring: "Abrigo" }, { lang: "es", tr });
    expect(con.beforeYouGo?.items.at(-1)).toEqual({ key: "operator", text: "Tangol Tours" });
    const solo = practicalInfo({ providerId: "tangol", providerTitle: "Tangol Tours" }, { lang: "es", tr });
    expect(solo.beforeYouGo?.items).toEqual([{ key: "operator", text: "Tangol Tours" }]);
    const primero = practicalInfo({ providerId: "freetour", providerTitle: "Angus Coutts", whatToBring: "Agua" }, { lang: "es", tr });
    expect(primero.beforeYouGo?.items.some((i) => i.key === "operator")).toBe(false);
  });
});
