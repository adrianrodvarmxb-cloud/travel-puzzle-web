import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { sitePagesFromEnv } from "@/site/lib/pages";
import { advisorCopy } from "./lib/copy";

describe("REQ-3382: /asesores encendida en producción (REQ-250…252, REQ-1308)", () => {
  const wrangler = readFileSync("wrangler.jsonc", "utf8");
  const valor = (n: string) => wrangler.match(new RegExp(`"${n}":\\s*"([^"]*)"`))?.[1];

  it("REQ-3382: wrangler.jsonc enciende EXPERTOS_ENABLED y el formulario tiene su endpoint encendido (CONTACTO_ENABLED)", () => {
    expect(valor("EXPERTOS_ENABLED")).toBe("true");
    expect(valor("CONTACTO_ENABLED")).toBe("true");
    expect(sitePagesFromEnv({ EXPERTOS_ENABLED: valor("EXPERTOS_ENABLED") }).expertos).toBe(true);
  });

  it("REQ-3382: el formulario de asesores envía a /api/contacto (buzón info@, REQ-1320)", () => {
    expect(readFileSync("src/components/advisors/AdvisorForm.tsx", "utf8")).toMatch(/fetch\('\/api\/contacto'/);
  });

  it("REQ-3382: el horario prometido es el de REQ-1248 en español y en inglés, nunca 9:00 a 19:00", () => {
    for (const lang of ["es", "en"]) {
      const c = advisorCopy(lang);
      const textos = `${c.wa.hours}\n${c.form.sentText}`;
      expect(textos, lang).not.toMatch(/9:00/);
      expect(textos, lang).toMatch(/10:00/);
      expect(textos, lang).toMatch(/20:00/);
    }
  });
});
