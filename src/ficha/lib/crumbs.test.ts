import { describe, expect, it } from "vitest";
import { fichaCrumbs } from "./crumbs";

const base = { country: { code: "AR", name: "Argentina" }, city: { slug: "el-calafate", name: "El Calafate" }, title: "Glaciar Perito Moreno", lang: "es" as const };

describe("fichaCrumbs", () => {
  it("REQ-10808: Inicio › Destinos › país › ciudad › ficha, con las rutas canónicas", () => {
    expect(fichaCrumbs(base)).toEqual([
      { name: "Inicio", href: "/" },
      { name: "Destinos", href: "/destinos" },
      { name: "Argentina", href: "/destinos/ar" },
      { name: "El Calafate", href: "/destinos/ar/el-calafate" },
      { name: "Glaciar Perito Moreno", href: "/destinos/ar/el-calafate#ficha" },
    ]);
  });

  it("REQ-10808: en inglés, Inicio y Destinos salen del texto de los hubs", () => {
    const c = fichaCrumbs({ ...base, lang: "en" });
    expect(c[0].name).not.toBe("Inicio");
    expect(c[2].href).toBe("/destinos/ar");
  });

  it("REQ-10808: sin ciudad válida la miga termina en el país; sin país, en Destinos (nunca N/D)", () => {
    expect(fichaCrumbs({ ...base, city: { slug: "", name: "" } }).map((c) => c.href)).toEqual(["/", "/destinos", "/destinos/ar", "/destinos/ar#ficha"]);
    expect(fichaCrumbs({ ...base, city: { slug: "Mal Slug", name: "X" } }).map((c) => c.name)).not.toContain("X");
    const sinPais = fichaCrumbs({ ...base, country: { code: "", name: "" } });
    expect(sinPais.map((c) => c.href)).toEqual(["/", "/destinos", "/destinos#ficha"]);
    expect(JSON.stringify(sinPais)).not.toContain("N/D");
  });
});
