import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// Auditoría 7 nov 2026 (D07): «Mismo header (logo animado) y footer en todas las páginas». En producción, /tours y las
// fichas de tour (FREETOUR) no traían el pie del home. Estas páginas deben montar el SiteFooter con los datos del sitio.
const mountsSiteFooter = (p: string) => {
  const src = readFileSync(p, "utf8");
  expect(src, p).toMatch(/import \{[^}]*\bSiteFooter\b[^}]*\} from '@\/components\/home\/v2'/);
  expect(src, p).toMatch(/import \{ siteFooterFromEnv \} from '@\/layout\/lib\/site-footer'/);
  expect(src, p).toMatch(/<SiteFooter \{\.\.\.siteFooterFromEnv\(/);
};

describe("Pie del home en /tours y en las fichas de tour (auditoría 2026-11-07, D07)", () => {
  it("REQ-1100: /tours (Experiencias) monta el pie del home", () => {
    mountsSiteFooter("src/app/tours/page.tsx");
  });

  it("REQ-1101: la ficha de tour bajo /destinos y la ficha vieja /tours/[id] montan el pie del home", () => {
    mountsSiteFooter("src/app/destinos/[pais]/[ciudad]/[slug]/page.tsx");
    mountsSiteFooter("src/app/tours/[id]/page.tsx");
  });

  it("REQ-1101: el pie va una sola vez por ficha (la ficha de viaje propio ya lo trae en TripDetailView)", () => {
    const src = readFileSync("src/app/destinos/[pais]/[ciudad]/[slug]/page.tsx", "utf8");
    expect(src.match(/<SiteFooter /g)).toHaveLength(1);
    expect(readFileSync("src/components/trips/TripDetailView.tsx", "utf8").match(/<SiteFooter /g)).toHaveLength(1);
  });
});
