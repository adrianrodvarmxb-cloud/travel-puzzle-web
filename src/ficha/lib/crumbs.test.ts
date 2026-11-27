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

describe("REQ-10894: ciudad con el mismo nombre que su país", () => {
  it("REQ-10894: Singapur › Singapur se queda en una sola miga (la de la ciudad, con su ruta); nunca dos seguidas iguales", () => {
    const sg = fichaCrumbs({ country: { code: "SG", name: "Singapur" }, city: { slug: "singapur", name: "Singapur" }, title: "Singapur: city tour compartido en inglés", lang: "es" });
    expect(sg.map((c) => c.name)).toEqual(["Inicio", "Destinos", "Singapur", "Singapur: city tour compartido en inglés"]);
    expect(sg[2].href).toBe("/destinos/sg/singapur");
    expect(sg[3].href).toBe("/destinos/sg/singapur#ficha");
    for (let i = 1; i < sg.length; i++) expect(sg[i].name).not.toBe(sg[i - 1].name);
    // Con acentos o mayúsculas distintas también es la misma: «Mexico» y «México».
    const mx = fichaCrumbs({ country: { code: "MX", name: "México" }, city: { slug: "mexico", name: "Mexico" }, title: "Tour", lang: "es" });
    expect(mx.map((c) => c.name)).toEqual(["Inicio", "Destinos", "Mexico", "Tour"]);
    // País y ciudad distintos: como siempre.
    expect(fichaCrumbs(base).map((c) => c.name)).toEqual(["Inicio", "Destinos", "Argentina", "El Calafate", "Glaciar Perito Moreno"]);
  });
});
