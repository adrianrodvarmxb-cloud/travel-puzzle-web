import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * REQ-10871 (ola 15, REQ-1562 TBT / REQ-1563 peso; REQ-10633): el barril `@/components/home/v2` reexporta los 12
 * componentes de cliente del inicio. Una página de servidor que importa de él (aunque solo use `SiteFooter`) mete
 * los 12 en su JS del navegador. Fuera del inicio (`src/app/page.tsx`) y de la carpeta del barril, cada componente
 * se importa desde su archivo (`@/components/home/v2/SiteFooter`).
 */
const ROOT = process.cwd();
const PERMITIDOS = new Set(["src/app/page.tsx"]);
const BARRIL = /from\s+['"]@\/components\/home\/v2['"]/;

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return archivos(p);
    return /\.(tsx?|jsx?)$/.test(n) && !/\.test\./.test(n) ? [p] : [];
  });
}

function importadoresDelBarril(raiz = ROOT): string[] {
  return archivos(join(raiz, "src"))
    .map((p) => relative(raiz, p).split("\\").join("/"))
    .filter((r) => !r.startsWith("src/components/home/v2/") && !PERMITIDOS.has(r))
    .filter((r) => BARRIL.test(readFileSync(join(raiz, r), "utf8")));
}

describe("REQ-10871: el barril del inicio no viaja a las demás páginas", () => {
  it("REQ-10871: ningún archivo fuera del inicio importa de '@/components/home/v2'", () => {
    expect(importadoresDelBarril()).toEqual([]);
  });

  it("REQ-10871: cada componente que usan las demás páginas existe como archivo propio", () => {
    for (const n of ["SiteFooter", "WhatsAppBubble", "ExpertCta"]) {
      const s = readFileSync(join(ROOT, "src/components/home/v2", `${n}.tsx`), "utf8");
      expect(s).toMatch(new RegExp(`export (function|const) ${n}\\b`));
    }
  });
});
