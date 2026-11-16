import { describe, expect, it } from "vitest";
import { textoAvisoTipoNuevo, tiposNuevos, type TourTipado } from "./tipo-nuevo";

const t = (clave: string, titulo: string, sinMapear = true, proveedor = "tangol"): TourTipado => ({
  proveedor, clave, externalId: titulo.toLowerCase().replace(/\s+/g, "-"), titulo, sinMapear,
});

// REQ-10730: regla del PO (REQ-10698, 15-11-2026): un tipo nuevo de cualquier proveedor se clasifica con la taxonomía;
// si no encaja, aviso al PO por correo y WhatsApp.
describe("REQ-10730 tipos nuevos de un proveedor que no encajan en la taxonomía", () => {
  it("REQ-10730: agrupa por proveedor y par, cuenta los tours y guarda hasta tres ejemplos", () => {
    const out = tiposNuevos([
      t("EXCURSION|CLASICAS", "City tour", false),
      t("WELLNESS|SPA", "Spa en Bariloche"),
      t("WELLNESS|SPA", "Termas de Cacheuta"),
      t("WELLNESS|SPA", "Día de spa en Mendoza"),
      t("WELLNESS|SPA", "Masajes en Salta"),
      t("GOLF|GREEN", "Golf en Pilar"),
    ]);
    expect(out).toEqual([
      { proveedor: "tangol", clave: "WELLNESS|SPA", tours: 4, ejemplos: ["Spa en Bariloche", "Termas de Cacheuta", "Día de spa en Mendoza"] },
      { proveedor: "tangol", clave: "GOLF|GREEN", tours: 1, ejemplos: ["Golf en Pilar"] },
    ]);
  });

  it("REQ-10730: lo que sí encaja no es tipo nuevo; sin tours sin mapear, lista vacía", () => {
    expect(tiposNuevos([t("EXCURSION|CLASICAS", "City tour", false)])).toEqual([]);
    expect(tiposNuevos([])).toEqual([]);
  });

  it("REQ-10730: un par ya avisado no se repite (el aviso sale una vez por tipo nuevo)", () => {
    const out = tiposNuevos([t("WELLNESS|SPA", "Spa"), t("GOLF|GREEN", "Golf")], ["tangol:WELLNESS|SPA"]);
    expect(out.map((x) => x.clave)).toEqual(["GOLF|GREEN"]);
  });

  it("REQ-10730: vale para cualquier proveedor (REQ-10709): cada uno sale con su nombre", () => {
    const out = tiposNuevos([t("WELLNESS|SPA", "Spa"), t("RETIRO", "Retiro de yoga", true, "extime")]);
    expect(out.map((x) => `${x.proveedor}:${x.clave}`).sort()).toEqual(["extime:RETIRO", "tangol:WELLNESS|SPA"]);
  });
});

describe("REQ-10730 texto del aviso al PO", () => {
  const tipos = tiposNuevos([t("WELLNESS|SPA", "Spa en Bariloche"), t("WELLNESS|SPA", "Termas"), t("GOLF|GREEN", "Golf en Pilar")]);

  it("REQ-10730: dice el proveedor, el par, cuántos tours y qué hacer; nunca inventa una categoría", () => {
    const a = textoAvisoTipoNuevo(tipos, { hoy: "2026-11-16" });
    expect(a.asunto).toBe("Travel Puzzle · 2 tipos nuevos de Tangol que no encajan en la taxonomía (16-11-2026)");
    expect(a.texto).toContain("Tangol · WELLNESS|SPA · 2 tours (p. ej. Spa en Bariloche; Termas)");
    expect(a.texto).toContain("Tangol · GOLF|GREEN · 1 tour (p. ej. Golf en Pilar)");
    expect(a.texto).toContain("Mientras no se decida, esos tours quedan en la red de seguridad del proveedor");
    expect(a.texto).not.toMatch(/sugerimos|recomendamos la categoría/i);
  });

  it("REQ-10730: el WhatsApp cabe en un mensaje (≤ 3,800 caracteres) aunque haya muchos tipos", () => {
    const muchos = tiposNuevos(Array.from({ length: 200 }, (_, i) => t(`TIPO${i}|SUB${i}`, `Tour número ${i} con un título bastante largo para el aviso`)));
    const a = textoAvisoTipoNuevo(muchos, { hoy: "2026-11-16" });
    expect(a.whatsapp.length).toBeLessThanOrEqual(3800);
    expect(a.whatsapp).toContain("200 tipos nuevos");
    expect(a.whatsapp).toMatch(/y \d+ más en el correo/);
  });

  it("REQ-10730: con un solo tipo habla en singular", () => {
    const a = textoAvisoTipoNuevo(tipos.slice(1), { hoy: "2026-11-16" });
    expect(a.asunto).toContain("1 tipo nuevo de Tangol");
    expect(a.whatsapp).toContain("1 tipo nuevo");
  });

  it("REQ-10730: varios proveedores en el asunto", () => {
    const a = textoAvisoTipoNuevo(tiposNuevos([t("A|B", "x"), t("C", "y", true, "extime")]), { hoy: "2026-11-16" });
    expect(a.asunto).toContain("de Tangol y Extime Travel");
  });
});
