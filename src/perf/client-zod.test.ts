import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

/**
 * REQ-10865 (ola 15, REQ-1562): el JS que carga TODA página (cliente del layout) no arrastra zod.
 * zod pesa ~96 KB sin comprimir; solo lo usan el servidor y algunas páginas.
 * Recorre los imports (no `import type`) desde cada módulo de cliente del layout.
 */
const ROOT = process.cwd();
const ENTRADAS = [
  "src/components/layout/Navbar.tsx",
  "src/ops/reportClientError.ts",
  "src/components/common/ClientErrorListener.tsx",
  "src/components/common/SectionBoundary.tsx",
  // El mapa (home, /tours, /destinos y el punto de encuentro de las fichas): su tarjeta no arrastra el diccionario.
  "src/components/map/CityCard.tsx",
  // «Favorito de los viajeros» en las tarjetas de home y /tours.
  "src/components/tours/TravelerFavoriteBadge.tsx",
];

function resolver(desde: string, spec: string): string | null {
  const base = spec.startsWith("@/") ? join(ROOT, "src", spec.slice(2)) : spec.startsWith(".") ? resolve(dirname(desde), spec) : null;
  if (!base) return null;
  for (const e of ["", ".ts", ".tsx", ".js", "/index.ts", "/index.tsx"]) {
    const p = base + e;
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  return null;
}

function importa(f: string): string[] {
  const s = readFileSync(f, "utf8");
  return [...s.matchAll(/(?:^|\n)\s*(?:import|export)\s+(?!type\b)[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1] || m[2]);
}

/** Cadena de archivos desde la entrada hasta el primero que importa zod, o null. */
function cadenaAZod(entrada: string): string[] | null {
  const vistos = new Set<string>();
  const pila: [string, string[]][] = [[resolve(ROOT, entrada), [entrada]]];
  while (pila.length) {
    const [f, cadena] = pila.pop()!;
    if (vistos.has(f)) continue;
    vistos.add(f);
    for (const spec of importa(f)) {
      if (spec === "zod") return cadena;
      const r = resolver(f, spec);
      if (r) pila.push([r, [...cadena, relative(ROOT, r)]]);
    }
  }
  return null;
}

describe("REQ-10865: el cliente del layout no carga zod", () => {
  for (const e of ENTRADAS) {
    it(`REQ-10865: ${e} no llega a zod`, () => {
      expect(cadenaAZod(e)).toBeNull();
    });
  }

  it("REQ-10865: la política de cuentas y el reporte de errores siguen exportando lo mismo (sin romper a quien los usa)", async () => {
    const policy = await import("@/accounts/lib/policy");
    expect(policy.PASSWORD_SIGNUP_ENABLED).toBe(false);
    expect(policy.accountNameSchema.safeParse(" Ana ").success).toBe(true);
    const ce = await import("@/ops/lib/clientError");
    expect(JSON.parse(ce.clientErrorPayload(new Error("x"), "s", "/p", "d"))).toMatchObject({ message: "x", path: "/p", source: "s", digest: "d" });
  });
});
