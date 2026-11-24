import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { loadDictionary } from "@/i18n/load-dictionary";
import { translations } from "@/lib/translations";
import { LOCALES } from "@/i18n/lib/locales";

/**
 * REQ-10869 (ola 15, REQ-1562/REQ-1563): el cliente del layout solo trae el diccionario de español de forma estática;
 * los otros 5 llegan con `import()` (un chunk por idioma) y solo cuando se usan.
 * Recorre los imports estáticos (no `import type`, no `import()`) desde el provider de idioma.
 */
const ROOT = process.cwd();
const ENTRADAS = ["src/lib/language-context.tsx", "src/components/providers/AppProviders.tsx", "src/components/layout/Navbar.tsx"];
const OTROS = ["en", "pt", "de", "fr", "it"].map((l) => join(ROOT, "src/lib/translations", `${l}.ts`));
const INDICE = join(ROOT, "src/lib/translations/index.ts");

function resolver(desde: string, spec: string): string | null {
  const base = spec.startsWith("@/") ? join(ROOT, "src", spec.slice(2)) : spec.startsWith(".") ? resolve(dirname(desde), spec) : null;
  if (!base) return null;
  for (const e of ["", ".ts", ".tsx", ".js", "/index.ts", "/index.tsx"]) {
    const p = base + e;
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  return null;
}

function estaticos(f: string): string[] {
  const s = readFileSync(f, "utf8");
  return [...s.matchAll(/(?:^|\n)\s*(?:import|export)\s+(?!type\b)[^'"]*?from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

function cadenaA(entrada: string, destinos: string[]): string[] | null {
  const vistos = new Set<string>();
  const pila: [string, string[]][] = [[resolve(ROOT, entrada), [entrada]]];
  while (pila.length) {
    const [f, cadena] = pila.pop()!;
    if (vistos.has(f)) continue;
    vistos.add(f);
    if (destinos.includes(f)) return cadena;
    for (const spec of estaticos(f)) {
      const r = resolver(f, spec);
      if (r) pila.push([r, [...cadena, relative(ROOT, r)]]);
    }
  }
  return null;
}

describe("REQ-10869: el navegador no descarga los 6 diccionarios en cada página", () => {
  for (const e of ENTRADAS) {
    it(`REQ-10869: ${e} no importa de forma estática otro diccionario ni el índice de los 6`, () => {
      expect(cadenaA(e, [...OTROS, INDICE])).toBeNull();
    });
  }
  it("REQ-10869: la carga bajo demanda trae el mismo diccionario que el índice, en los 6 idiomas", async () => {
    for (const l of LOCALES) expect(await loadDictionary(l)).toBe(translations[l]);
  });
});
