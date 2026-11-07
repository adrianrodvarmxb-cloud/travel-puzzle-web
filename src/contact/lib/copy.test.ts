import { describe, expect, it } from "vitest";
import { contactCopy, TOPICS } from "./copy";
import { PROHIBIDAS_SITIO, textsOf } from "@/site/lib/vocab";
import { footerPageLinks, sitePagesFromEnv } from "@/site/lib/pages";
import { contactPageJsonLd } from "@/seo/lib/pages-jsonld";

describe("copy de /contacto", () => {
  it("REQ-249: H1 «Contacto» igual al enlace del pie y description ≤155", () => {
    expect(contactCopy("es").h1).toBe("Contacto");
    expect(contactCopy("es").meta.description.length).toBeLessThanOrEqual(155);
    expect(footerPageLinks(sitePagesFromEnv({ CONTACTO_ENABLED: "true" }), "es")).toEqual([{ href: "/contacto", label: "Contacto" }]);
  });

  it("REQ-249: sin vocabulario prohibido, sin domicilio y sin prometer llamadas (es y en)", () => {
    for (const lang of ["es", "en"]) {
      const all = textsOf(contactCopy(lang));
      expect(all.filter((t) => PROHIBIDAS_SITIO.test(t)), lang).toEqual([]);
      expect(all.join(" ")).not.toMatch(/Lázaro|Cárdenas|34080|llámanos|call us/i);
    }
  });

  it("REQ-249: cada tema del formulario tiene etiqueta en es y en", () => {
    for (const t of TOPICS) {
      expect(contactCopy("es").form.topics[t]).toBeTruthy();
      expect(contactCopy("en").form.topics[t]).toBeTruthy();
    }
  });

  it("REQ-249: JSON-LD ContactPage con la Organization por @id", () => {
    expect(contactPageJsonLd("https://travelpuzzle.com.mx", "Contacto")).toMatchObject({
      "@type": "ContactPage", url: "https://travelpuzzle.com.mx/contacto", about: { "@id": "https://travelpuzzle.com.mx/#organization" },
    });
  });
});
