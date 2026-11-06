import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// REQ-062, REQ-300, REQ-301: todas las páginas públicas (acompañamiento, reservas, ayuda, legales, errores) llevan el header del home con el logo animado.
/**
 * Rutas exentas del header público, cada una con su motivo (REQ-301). Agregar otra exige motivo y rompe el test de la lista.
 * - admin: el panel se queda como está (PO, 6 nov 2026).
 * - resenas/moderar: confirmación interna de Publicar/Ocultar desde el correo del equipo (equivale al admin).
 * - (auth): iniciar sesión y registro apagados con ACCOUNTS_ENABLED; apagados responden el 404 con el header.
 * - api: no pinta páginas.
 */
const EXENTAS: Record<string, RegExp> = {
  admin: /^src\/app\/admin\//,
  moderar: /^src\/app\/resenas\/moderar\//,
  auth: /^src\/app\/\(auth\)\//,
  api: /^src\/app\/api\//,
};
const INTERNAS = Object.values(EXENTAS);
/** Componentes que ya traen el header del sitio (Navbar con el logo animado). */
const ENVOLTURAS: Record<string, string> = {
  LegalPage: "src/components/legal/LegalPage.tsx",
  HelpPage: "src/components/help/HelpPage.tsx",
  ToursPageClient: "src/components/tours/ToursPageClient.tsx",
  TourDetailClient: "src/components/tours/one/TourDetailClient.tsx",
  EmailFrame: "src/components/booking/email-ui.tsx",
  EventDetailClient: "src/components/events/EventDetailClient.tsx",
  BookingPageView: "src/app/reserva/[token]/BookingPageView.tsx",
  DestinationsLayout: "src/components/destinations/DestinationsLayout.tsx",
  TripDetailView: "src/components/trips/TripDetailView.tsx",
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
  it("REQ-301: solo el admin (y lo interno o apagado, con motivo) queda fuera del header común", () => {
    expect(Object.keys(EXENTAS).sort()).toEqual(["admin", "api", "auth", "moderar"]);
    expect(readFileSync("src/app/(auth)/layout.tsx", "utf8")).toMatch(/if \(!ACCOUNTS_ENABLED\) notFound\(\)/);
  });
  it("REQ-300: ninguna página pública vuelve a pintar el encabezado fijo de la tarjeta (cardHeader)", () => {
    const todas = [...publicas, ...Object.values(ENVOLTURAS)].filter((p) => p !== ENVOLTURAS.EmailFrame);
    for (const p of todas) expect(readFileSync(p, "utf8"), p).not.toMatch(/cardHeader/);
  });
  it("REQ-062: el error global (sin proveedores) muestra al menos el logo animado", () => {
    expect(readFileSync("src/app/global-error.tsx", "utf8")).toMatch(/logo-travel\.gif|<Logo\b/);
  });
});
