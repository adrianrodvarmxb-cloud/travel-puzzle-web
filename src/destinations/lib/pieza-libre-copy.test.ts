import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cityFreeIntro, freeSectionTitle, fallbackTourTitle } from "./pieza-libre-copy";
import { es } from "@/lib/translations/es";
import { en } from "@/lib/translations/en";

// Decisión del PO (6-11): la categoría se llama «Pieza libre» en todo lo que la nombra; solo el precio verde «Free tour» se queda.
describe("REQ-271 «Pieza libre» en la ciudad, los pines del mapa y los asuntos de los correos", () => {
  it("REQ-271 título de la sección de la ciudad: «Pieza libre (La Primera Pieza)»", () => {
    expect(freeSectionTitle()).toBe("Pieza libre (La Primera Pieza)");
  });
  it("REQ-271 intro de la ciudad sin «free tours»", () => {
    expect(cityFreeIntro("Barcelona", 67, 35)).toBe("67 en Pieza libre y 35 tours con guías locales en Barcelona.");
    expect(cityFreeIntro("Lima", 1, 1)).toBe("1 en Pieza libre y 1 tour con guías locales en Lima.");
  });
  it("REQ-271 asunto de los correos cuando no hay título del tour: «Pieza libre 6782» (en: «Free tour 6782»)", () => {
    expect(fallbackTourTitle(6782, "es")).toBe("Pieza libre 6782");
    expect(fallbackTourTitle(6782, "en")).toBe("Free tour 6782");
    expect(fallbackTourTitle(null, "es")).toBe("Pieza libre");
  });
  it("REQ-271 pines del mapa: clave propia «Pieza libre» (en: «Free tour»); el precio verde sigue con tours.free «Free tour»", () => {
    expect((es as Record<string, string>)["tours.freePin"]).toBe("Pieza libre");
    expect((en as Record<string, string>)["tours.freePin"]).toBe("Free tour");
    expect((es as Record<string, string>)["tours.free"]).toBe("Free tour");
    const map = readFileSync("src/components/tours/ToursMap.tsx", "utf8");
    expect(map).toMatch(/el\.textContent = priceText\(p\.price, p\.currency, pin\)/);
  });
  it("REQ-271 la página de la ciudad y los correos usan estas funciones", () => {
    const city = readFileSync("src/app/destinos/[pais]/[ciudad]/page.tsx", "utf8");
    expect(city).toContain("freeSectionTitle()");
    expect(city).toContain("cityFreeIntro(");
    expect(readFileSync("src/booking/notify.ts", "utf8")).not.toMatch(/`Free tour \$\{/);
  });
});

describe("REQ-271 filtro «Tipo de actividad» de /tours (PO 6-11)", () => {
  it("REQ-271 el grupo viejo dice «Visitas guiadas y Pieza libre» (en: «Guided tours & free tours»)", async () => {
    const { groupLabel } = await import("@/tours/lib/extra-filters");
    expect(groupLabel("visitas", "es")).toBe("Visitas guiadas y Pieza libre");
    expect(groupLabel("visitas", "en")).toBe("Guided tours & free tours");
  });
});
