import { describe, expect, it } from "vitest";
import { aboutPageJsonLd, organizationWithContactJsonLd, ORG_ID } from "./pages-jsonld";
import { organizationJsonLd } from "./jsonld";

const site = "https://travelpuzzle.com.mx/";

describe("JSON-LD de las páginas institucionales", () => {
  it("REQ-245: AboutPage enlaza a la Organization por @id estable", () => {
    const a = aboutPageJsonLd(site, "Nosotros");
    expect(a).toMatchObject({
      "@type": "AboutPage",
      "@id": "https://travelpuzzle.com.mx/nosotros#webpage",
      url: "https://travelpuzzle.com.mx/nosotros",
      name: "Nosotros",
      inLanguage: "es-MX",
      about: { "@id": ORG_ID("https://travelpuzzle.com.mx") },
    });
  });

  it("REQ-245: Organization con contactPoint desde las variables, sin domicilio de calle", () => {
    const o = organizationWithContactJsonLd(site, ["https://www.instagram.com/travelpuzzle/", "http://inseguro"], { whatsapp: "525536490320", email: "info@travelpuzzle.com.mx" });
    expect(o["@id"]).toBe("https://travelpuzzle.com.mx/#organization");
    expect(o.sameAs).toEqual(["https://www.instagram.com/travelpuzzle/"]);
    expect(o.contactPoint).toEqual({ "@type": "ContactPoint", contactType: "customer service", telephone: "+525536490320", email: "info@travelpuzzle.com.mx", availableLanguage: ["Spanish"] });
    expect(JSON.stringify(o)).not.toMatch(/address|streetAddress|Lázaro|Cárdenas/i);
  });

  it("REQ-245: sin WhatsApp ni correo válidos no se inventa un contactPoint", () => {
    const o = organizationWithContactJsonLd(site, [], { whatsapp: "abc", email: "no-es-correo" });
    expect(o).not.toHaveProperty("contactPoint");
  });

  it("REQ-245: no cambia organizationJsonLd que ya usa la home (OCP)", () => {
    expect(organizationJsonLd(site, [])).not.toHaveProperty("@id");
  });
});
