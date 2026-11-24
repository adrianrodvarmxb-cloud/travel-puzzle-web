import { describe, expect, it } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguageProvider, useLanguage } from "@/lib/language-context";
import LocalizedLink from "./LocalizedLink";
import { LanguageSuggestion } from "./LanguageSuggestion";
import { AppProviders } from "@/components/providers/AppProviders";
import { translations } from "@/lib/translations";
import { readFileSync } from "node:fs";

function Probe() {
  const { language, t } = useLanguage();
  return h("span", { "data-lang": language }, t("nav.home"));
}
const links = () => [
  h(LocalizedLink, { key: 1, href: "/destinos/mx" }, "a"),
  h(LocalizedLink, { key: 2, href: "/nosotros" }, "b"),
  h(LocalizedLink, { key: 3, href: "/#como-funciona" }, "c"),
  h(LocalizedLink, { key: 4, href: "https://wa.me/52" }, "d"),
];
const render = (props: Record<string, unknown>, ...children: unknown[]) => renderToStaticMarkup(h(LanguageProvider, props as never, ...(children as never[])));

describe("cliente con idioma en la URL", () => {
  it("REQ-654: con locked, el primer render usa el idioma del servidor (SSR = cliente)", () => {
    // REQ-10869: el diccionario del idioma de la URL llega del servidor (el layout lo pasa); el cliente no baja los 6.
    const html = render({ initialLanguage: "en", locked: true, initialDictionary: translations.en }, h(Probe));
    expect(html).toContain('data-lang="en"');
    expect(html).toContain(">Home<");
  });

  it("REQ-10869: AppProviders pasa el diccionario del servidor y el layout lo manda con el idioma de la URL", () => {
    const html = renderToStaticMarkup(h(AppProviders, { language: "en", locked: true, dictionary: translations.en } as never, h(Probe)));
    expect(html).toContain(">Home<");
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    expect(layout).toMatch(/dictionary=\{route\?\.locked && route\.lang !== "es" \? translations\[route\.lang\] : undefined\}/);
  });

  it("REQ-650: sin locked, español como hoy aunque llegue initialLanguage", () => {
    expect(render({}, h(Probe))).toContain('data-lang="es"');
  });

  it("REQ-655: los enlaces en alcance llevan el prefijo; fuera de alcance y externos no", () => {
    const html = render({ initialLanguage: "en", locked: true }, ...links());
    expect(html).toContain('href="/en/destinos/mx"');
    expect(html).toContain('href="/nosotros"');
    expect(html).toContain('href="/en#como-funciona"');
    expect(html).toContain('href="https://wa.me/52"');
  });

  it("REQ-650/REQ-655: sin bandera (no locked) o sin provider, los href no cambian", () => {
    expect(render({ initialLanguage: "en" }, ...links())).toContain('href="/destinos/mx"');
    expect(renderToStaticMarkup(h(LocalizedLink, { href: "/destinos/mx" }, "x"))).toContain('href="/destinos/mx"');
  });

  it("REQ-657: el aviso no está en el HTML del servidor", () => {
    const html = render({ initialLanguage: "en", locked: true }, h(LanguageSuggestion));
    expect(html).not.toContain("also available");
    expect(html).not.toContain('role="region"');
  });
});
