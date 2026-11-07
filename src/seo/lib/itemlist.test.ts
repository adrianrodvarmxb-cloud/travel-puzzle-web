import { describe, expect, it } from "vitest";
import { destinationTree } from "@/destinations/lib/catalog";
import { fx, tour } from "@/destinations/fixtures/destinos";
import { canonicalHrefs, itemListJsonLd } from "./itemlist";

const site = "https://travelpuzzle.com.mx";

describe("REQ-582: ItemList de los listados", () => {
  it("REQ-582: ListItem con posición desde 1, name y URL absoluta, sin repetir y en orden", () => {
    const l = itemListJsonLd({ siteUrl: site, name: "Experiencias", items: [{ name: "A", href: "/destinos/mx/cdmx/a" }, { name: "B", href: "/viajes/francia/b" }, { name: "A otra vez", href: "/destinos/mx/cdmx/a" }] })!;
    expect(l["@type"]).toBe("ItemList");
    expect(l.name).toBe("Experiencias");
    expect(l.numberOfItems).toBe(2);
    expect(l.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "A", url: `${site}/destinos/mx/cdmx/a` },
      { "@type": "ListItem", position: 2, name: "B", url: `${site}/viajes/francia/b` },
    ]);
  });
  it("REQ-582: una tarjeta /tours/{id} se lista con su URL canónica de /destinos", () => {
    const t = tour(10, 1, { title: "Centro" });
    const tree = destinationTree({ ...fx, tours: [t], trips: [], now: new Date("2026-11-05T12:00:00Z") });
    const hrefs = canonicalHrefs(tree);
    const l = itemListJsonLd({ siteUrl: site, name: "X", items: [{ name: "Centro", href: `/tours/${t.id}` }, { name: "Sin ficha", href: "/tours/zzz" }], resolve: hrefs })!;
    expect((l.itemListElement as { url: string }[]).map((x) => x.url)).toEqual([`${site}/destinos/mx/ciudad-de-mexico/${t.slug}`, `${site}/tours/zzz`]);
  });
  it("REQ-582: máximo 50 elementos y nada si la lista está vacía", () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ name: `T${i}`, href: `/x/${i}` }));
    expect((itemListJsonLd({ siteUrl: site, name: "X", items: many })!.itemListElement as unknown[]).length).toBe(50);
    expect(itemListJsonLd({ siteUrl: site, name: "X", items: [] })).toBeNull();
    expect(itemListJsonLd({ siteUrl: site, name: "X", items: [{ name: " ", href: "/a" }, { name: "B", href: "" }] })).toBeNull();
  });
});
