import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { homeSections, HOME_SECTION_IDS } from "./sections";
import { isActiveLink } from "./sections";

describe("secciones del inicio para el menú", () => {
  it("sin viajes propios: las 7, en orden, con enlace al inicio", () => {
    const s = homeSections("es");
    expect(s.map((x) => x.href)).toEqual([
      "/#destinos", "/#favoritos", "/#como-funciona", "/#continentes", "/#mapa", "/#opiniones", "/#asesor",
    ]);
    expect(s.map((x) => x.number)).toEqual(["01", "02", "03", "04", "05", "06", "07"]);
  });
  it("en español y en inglés", () => {
    expect(homeSections("es")[0].label).toBe("Destinos");
    expect(homeSections("es")[6].label).toBe("Asesoría personalizada");
    expect(homeSections("en")[1].label).toBe("Traveler favorites");
    expect(homeSections("fr")[2].label).toBe("How it works");
  });
  it("REQ-068: con viajes propios encendidos aparece 'viajes' después de favoritos y se renumera", () => {
    const s = homeSections("es", { ownTrips: true });
    expect(s.map((x) => x.id)).toEqual(["destinos", "favoritos", "viajes", "como-funciona", "continentes", "mapa", "opiniones", "asesor"]);
    expect(s[2]).toMatchObject({ href: "/#viajes", number: "03", label: "Viajes armados por expertos" });
    expect(s[7].number).toBe("08");
  });
});

/** Orden en que el home pinta sus secciones: componentes de src/app/page.tsx → id de su <section>. */
function renderedSectionIds(): string[] {
  const page = readFileSync("src/app/page.tsx", "utf8");
  const dir = "src/components/home/v2";
  const idOf = new Map<string, string>();
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".tsx"))) {
    const m = readFileSync(`${dir}/${f}`, "utf8").match(/<section\s+id="([^"]+)"/);
    if (m) idOf.set(f.replace(/\.tsx$/, ""), m[1]);
  }
  const main = page.slice(page.indexOf("<main"), page.indexOf("</main>"));
  return [...main.matchAll(/<([A-Z]\w+)\b/g)].map((m) => idOf.get(m[1])).filter((x): x is string => !!x);
}

describe("REQ-068: el menú se actualiza solo cuando el home agrega secciones", () => {
  it("REQ-068: toda sección con id que pinta el home está en el menú, en el mismo orden", () => {
    expect(renderedSectionIds()).toEqual(HOME_SECTION_IDS);
  });
});

describe("REQ-068: enlace activo del menú", () => {
  it("REQ-068: inicio solo exacto; tours también en sus páginas internas; anclas nunca", () => {
    expect(isActiveLink("/", "/")).toBe(true);
    expect(isActiveLink("/tours", "/")).toBe(false);
    expect(isActiveLink("/tours/123", "/tours")).toBe(true);
    expect(isActiveLink("/toursx", "/tours")).toBe(false);
    expect(isActiveLink("/", "/#como-funciona")).toBe(false);
    expect(isActiveLink("/traslados", "/traslados")).toBe(true);
  });
});
