import { describe, expect, it } from "vitest";
import { advisorCopy, visibleAdvisorBlocks } from "./copy";
import { PROHIBIDAS_SITIO, textsOf } from "@/site/lib/vocab";
import { footerPageLinks, sitePagesFromEnv } from "@/site/lib/pages";
import { contactMessageSchema, advisorMessageSchema, inboundMessageSchema } from "@/contact/schemas/message";
import { buildContactEmail } from "@/contact/lib/email";

describe("«Habla con un asesor de viaje»", () => {
  it("REQ-250: H1 «Habla con un asesor de viaje», igual al enlace del pie; nunca «expertos»", () => {
    expect(advisorCopy("es").h1).toBe("Habla con un asesor de viaje");
    expect(footerPageLinks(sitePagesFromEnv({ EXPERTOS_ENABLED: "true" }), "es")).toEqual([{ href: "/asesores", label: "Habla con un asesor de viaje" }]);
    for (const lang of ["es", "en"]) {
      const all = textsOf({ ...advisorCopy(lang), blocks: visibleAdvisorBlocks(advisorCopy(lang)) });
      expect(all.filter((t) => PROHIBIDAS_SITIO.test(t)), lang).toEqual([]);
    }
  });

  it("REQ-250: el bloque de personas (nombres y fotos de asesores) no se pinta sin material", () => {
    expect(visibleAdvisorBlocks(advisorCopy("es")).map((b) => b.id)).not.toContain("equipo");
    expect(advisorCopy("es").meta.description.length).toBeLessThanOrEqual(155);
  });

  it("REQ-251: formulario corto: nombre, correo, destino y aviso de privacidad; WhatsApp y fechas opcionales", () => {
    const ok = { kind: "asesor", name: "Ana", email: "ana@example.com", phone: "", destination: "Perú", when: "marzo, 8 días", message: "", consent: true, website: "", elapsedMs: 5000, language: "es" };
    expect(advisorMessageSchema.safeParse(ok).success).toBe(true);
    expect(advisorMessageSchema.safeParse({ ...ok, destination: "" }).success).toBe(false);
    expect(advisorMessageSchema.safeParse({ ...ok, consent: false }).success).toBe(false);
    // La misma ruta distingue los dos formularios.
    expect(inboundMessageSchema.parse(ok).kind).toBe("asesor");
    expect(contactMessageSchema.safeParse(ok).success).toBe(false);
  });

  it("REQ-251: el correo al equipo dice que es una solicitud de asesor, con destino y fechas", () => {
    const m = advisorMessageSchema.parse({ kind: "asesor", name: "Ana", email: "ana@example.com", destination: "Perú", when: "marzo", consent: true, elapsedMs: 5000 });
    const e = buildContactEmail(m);
    expect(e.subject).toBe("Asesor de viaje · Perú · Ana");
    expect(e.text).toContain("Destino: Perú");
    expect(e.text).toContain("Cuándo: marzo");
  });
});
