// REQ-1248: el horario de atención es de 10:00 a 14:00 y de 16:00 a 20:00 en todo el sitio (PO, 7 nov 2026).
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const archivos = (d: string): string[] => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? archivos(p) : /\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p) ? [p] : [];
});

describe("REQ-1248: horario de atención", () => {
  it("REQ-1248: ningún texto dice el horario viejo de 9:00 a 19:00", () => {
    const viejos = archivos(join(process.cwd(), "src")).filter((p) => /9:00 (a|to) 19:00/.test(readFileSync(p, "utf8")));
    expect(viejos).toEqual([]);
  });
  it("REQ-1248: contacto, ayuda, nosotros y términos dicen 10:00 a 14:00 y de 16:00 a 20:00", () => {
    for (const f of ["src/contact/lib/copy.ts", "src/help/lib/faq.ts", "src/about/lib/content.ts", "src/legal/lib/terminos.ts"]) {
      expect(readFileSync(join(process.cwd(), f), "utf8")).toContain("10:00 a 14:00 y de 16:00 a 20:00");
    }
  });
});
