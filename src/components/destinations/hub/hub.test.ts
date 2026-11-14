import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/components/i18n/LocalizedLink", () => ({ default: ({ href, children, ...p }: { href: string; children: unknown }) => createElement("a", { href, ...p }, children as never) }));

import { TopDestinations } from "./TopDestinations";
import { ContinentTabs } from "./ContinentTabs";
import { CountriesAZ } from "./CountriesAZ";
import { DestinosSearch } from "./DestinosSearch";
import type { HubGroup } from "@/destinations/lib/destinos-hub";

const groups: HubGroup[] = [
  { continent: "europa", countries: [{ name: "España", href: "/destinos/es", cities: 2, tours: 129, image: "https://img/es.jpg" }, { name: "Italia", href: "/destinos/it", cities: 2, tours: 340, image: null }] },
  { continent: "otros", countries: [{ name: "Afganistán", href: "/destinos/af", cities: 1, tours: 4, image: "https://img/af.jpg" }] },
];
const html = (el: ReturnType<typeof createElement>) => renderToStaticMarkup(el);

describe("REQ-3475: buscador y «Más buscados»", () => {
  it("REQ-3475: el buscador manda a /tours con el texto y lleva los chips de continente", () => {
    const h = html(createElement(DestinosSearch, { lang: "es", continents: groups.map((g) => g.continent) }));
    expect(h).toContain('action="/tours"');
    expect(h).toContain('name="search"');
    expect(h).toContain('href="#continente-europa"');
    expect(h).toContain("Otros destinos");
  });
  it("REQ-3475: cada tarjeta lleva foto, ciudad, país, número de tours y enlace a su página", () => {
    const h = html(createElement(TopDestinations, { lang: "es", cities: [{ name: "Madrid", country: "España", href: "/destinos/es/madrid", tours: 120, image: "https://img/madrid.jpg" }] }));
    for (const s of ['href="/destinos/es/madrid"', "Madrid", "España", "120 experiencias", 'src="https://img/madrid.jpg"', "Los más buscados"]) expect(h).toContain(s);
  });
});

describe("REQ-3476: continentes en pestañas", () => {
  it("REQ-3476: todas las pestañas vienen en el HTML servido (Google ve todos los enlaces) y la primera está activa", () => {
    const h = html(createElement(ContinentTabs, { lang: "es", groups }));
    expect(h).toContain('role="tablist"');
    expect(h).toContain('href="/destinos/af"');
    expect(h).toContain('aria-selected="true"');
    expect(h).toContain("Europa");
  });
  it("REQ-3476: un país sin foto se muestra igual, con su nombre y números", () => {
    const h = html(createElement(ContinentTabs, { lang: "es", groups }));
    expect(h).toContain("Italia");
    expect(h).toContain("2 ciudades · 340 experiencias");
  });
});

describe("REQ-3477: A–Z por continente", () => {
  it("REQ-3477: todos los países enlazados, agrupados por continente, con su número de tours", () => {
    const h = html(createElement(CountriesAZ, { lang: "es", groups }));
    for (const s of ['href="/destinos/es"', 'href="/destinos/it"', 'href="/destinos/af"', "Todos los destinos de la A a la Z", "Otros destinos"]) expect(h).toContain(s);
  });
  it("REQ-3477: en celular cada continente es un acordeón (botón con aria-expanded)", () => {
    expect(html(createElement(CountriesAZ, { lang: "es", groups }))).toMatch(/aria-expanded="false"/);
  });
});
