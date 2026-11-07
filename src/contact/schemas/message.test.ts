import { describe, expect, it } from "vitest";
import { contactMessageSchema, spamReason, MIN_FILL_MS } from "./message";

const ok = {
  kind: "contacto" as const,
  name: "Ana López",
  email: "Ana@Example.com ",
  phone: "",
  topic: "viaje" as const,
  message: "Quiero ir a Perú en marzo con mi familia.",
  consent: true,
  website: "",
  elapsedMs: 8000,
  language: "es",
};

describe("formulario de contacto (zod)", () => {
  it("REQ-247: acepta un mensaje válido y normaliza el correo", () => {
    const r = contactMessageSchema.safeParse(ok);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("ana@example.com");
  });

  it("REQ-247: exige nombre, correo válido, mensaje de 10 a 2000 caracteres y aceptar el aviso de privacidad", () => {
    for (const bad of [{ name: "" }, { email: "ana" }, { message: "hola" }, { message: "x".repeat(2001) }, { consent: false }, { topic: "spam" }]) {
      expect(contactMessageSchema.safeParse({ ...ok, ...bad }).success, JSON.stringify(bad)).toBe(false);
    }
  });

  it("REQ-247: el teléfono es opcional pero, si viene, solo con dígitos, espacios, +, guiones o paréntesis", () => {
    expect(contactMessageSchema.safeParse({ ...ok, phone: "+52 55 1234 5678" }).success).toBe(true);
    expect(contactMessageSchema.safeParse({ ...ok, phone: "llámame" }).success).toBe(false);
  });

  it("REQ-247 (anti-spam): campo trampa lleno, envío en menos de 3 s o más de 2 enlaces → se descarta", () => {
    const parse = (o: object) => contactMessageSchema.parse({ ...ok, ...o });
    expect(spamReason(parse({}))).toBeNull();
    expect(spamReason({ ...parse({}), website: "http://spam" } as never)).toBe("trampa");
    expect(spamReason(parse({ elapsedMs: MIN_FILL_MS - 1 }))).toBe("rapido");
    expect(spamReason(parse({ message: "mira https://a.com y https://b.com y www.c.com" }))).toBe("enlaces");
  });

  it("REQ-247: el campo trampa no tumba la validación (se acepta y se descarta en silencio)", () => {
    expect(contactMessageSchema.safeParse({ ...ok, website: "http://spam" }).success).toBe(true);
  });
});
