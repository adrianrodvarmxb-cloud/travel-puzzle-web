import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// REQ-062: todas las páginas públicas (acompañamiento, reservas, ayuda, legales, errores) llevan el header del home con el logo animado.
const INTERNAS = [/^src\/app\/admin\//, /^src\/app\/\(auth\)\//, /^src\/app\/api\//, /^src\/app\/resenas\/moderar\//];
/** Componentes que ya traen el header del sitio (Navbar con el logo animado). */
const ENVOLTURAS: Record<string, string> = {
  LegalPage: "src/components/legal/LegalPage.tsx",
  HelpPage: "src/components/help/HelpPage.tsx",
  ToursPageClient: "src/components/tours/ToursPageClient.tsx",
  TourDetailClient: "src/components/tours/one/TourDetailClient.tsx",
  EmailFrame: "src/components/booking/email-ui.tsx",
  EventDetailClient: "src/components/events/EventDetailClient.tsx",
  BookingPageView: "src/app/reserva/[token]/BookingPageView.tsx",
};

function pages(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) pages(p, out);
    else if (/^(page|error|not-found|global-error)\.tsx$/.test(f)) out.push(p);
  }
  return out;
}

const hasHeader = (src: string, seen = new Set<string>()): boolean => {
  if (/<Navbar\b|<SiteHeader\b/.test(src)) return true;
  return Object.entries(ENVOLTURAS).some(([name, file]) => {
    if (seen.has(file) || !new RegExp(`<${name}\\b`).test(src)) return false;
    seen.add(file);
    return hasHeader(readFileSync(file, "utf8"), seen);
  });
};

describe("REQ-062 header con logo animado en todo el sitio público", () => {
  const publicas = pages("src/app").filter((p) => !INTERNAS.some((re) => re.test(p)));
  it("REQ-062: hay páginas públicas que revisar (la auditoría no está vacía)", () => {
    expect(publicas.length).toBeGreaterThan(15);
  });
  it.each(publicas.filter((p) => !p.endsWith("global-error.tsx")))("REQ-062: %s usa el header del sitio", (p) => {
    expect(hasHeader(readFileSync(p, "utf8"))).toBe(true);
  });
  it("REQ-062: el error global (sin proveedores) muestra al menos el logo animado", () => {
    expect(readFileSync("src/app/global-error.tsx", "utf8")).toMatch(/logo-travel\.gif|<Logo\b/);
  });
});
