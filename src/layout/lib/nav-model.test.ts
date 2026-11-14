import { describe, it, expect } from "vitest";
import { headerLinks, mobileSectionLinks, footerColumns } from "./nav-model";

// REQ-1400: menú del header, menú móvil y pie por columnas, según el encargo del PO (7 nov 2026).
const labels = { destinos: "Destinos", tours: "Experiencias", transfers: "Traslados", blog: "Blog" };
const base = { labels, transfers: true, primeraPieza: true, blog: false };
const off = { nosotros: false, contacto: false, expertos: false, blog: false };
const pillars = [{ href: "/blog/china", label: "China desde México" }, { href: "/blog/peru", label: "Perú y Machu Picchu" }];
const footer = (over: Partial<typeof off> = {}, extra: { help?: boolean; wa?: string; email?: string } = {}, blog = false) =>
  footerColumns({
    lang: "es",
    ...base,
    blog,
    pages: { ...off, ...over },
    helpEnabled: extra.help ?? true,
    whatsappUrl: extra.wa ?? "https://wa.me/5215555555555",
    email: extra.email ?? "info@travelpuzzle.com.mx",
    pillars: pillars,
  });

describe("REQ-1400: header público", () => {
  it("REQ-1400: Destinos · Experiencias · Traslados, sin Inicio ni Cómo funciona", () => {
    expect(headerLinks(base).map((l) => l.href)).toEqual(["/destinos", "/tours", "/traslados"]);
  });
  it("REQ-1400: Blog entra al header solo cuando la visibilidad lo deja (blog=true)", () => {
    expect(headerLinks({ ...base, blog: true }).map((l) => l.href)).toEqual(["/destinos", "/tours", "/traslados", "/blog"]);
    expect(headerLinks(base).map((l) => l.href)).not.toContain("/blog");
  });
  it("REQ-1400: sin Destinos ni Traslados, el header queda con lo que existe", () => {
    expect(headerLinks({ ...base, primeraPieza: false, transfers: false }).map((l) => l.href)).toEqual(["/tours"]);
  });
});

describe("REQ-1400: menú móvil sin repeticiones", () => {
  it("REQ-1400: Destinos aparece una sola vez (en el header, no como sección 01)", () => {
    const hrefs = [...headerLinks(base), ...mobileSectionLinks("es")].map((l) => l.href);
    expect(hrefs.filter((h) => h === "/destinos")).toHaveLength(1);
    expect(hrefs).not.toContain("/#destinos");
  });
  it("REQ-1400: ninguna ruta del menú móvil se repite", () => {
    const hrefs = [...headerLinks({ ...base, blog: true }), ...mobileSectionLinks("es")].map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("REQ-1400: pie por columnas", () => {
  it("REQ-1400: con el blog visible, la columna Guías enlaza los pilares activos (clúster de SEO)", () => {
    expect(footer({}, {}, true).map((c) => c.title)).toEqual(["Explora", "Empresa", "Guías", "Ayuda"]);
    expect(footer({}, {}, true)[2].links.map((l) => l.href)).toEqual(["/blog/china", "/blog/peru"]);
  });
  it("REQ-1400: sin blog visible no hay columna Guías", () => {
    expect(footer().map((c) => c.title)).toEqual(["Explora", "Empresa", "Ayuda"]);
  });
  it("REQ-1400: columnas Explora · Empresa · Ayuda, en ese orden", () => {
    expect(footer().map((c) => c.title)).toEqual(["Explora", "Empresa", "Ayuda"]);
  });
  it("REQ-1400: Explora lleva Destinos, Experiencias, Traslados y Cómo funciona", () => {
    expect(footer()[0].links.map((l) => l.href)).toEqual(["/destinos", "/tours", "/traslados", "/#como-funciona"]);
  });
  it("REQ-3458: el pie ya no muestra «La Primera Pieza» (PO, 12 nov 2026; reemplaza el enlace de REQ-601)", () => {
    expect(footer()[0].links.map((l) => l.label)).not.toContain("La Primera Pieza");
  });
  it("REQ-1400: Empresa solo muestra Nosotros, Blog y Contacto con su bandera", () => {
    expect(footer()[1].links).toEqual([]);
    expect(footer({ nosotros: true, contacto: true })[1].links.map((l) => l.href)).toEqual(["/nosotros", "/contacto"]);
    expect(footer({}, {}, true)[1].links.map((l) => l.href)).toEqual(["/blog"]);
  });
  it("REQ-3431: con EXPERTOS_ENABLED, Empresa enlaza «Habla con un asesor» (/asesores) junto a Contacto; apagada, no (PO 12-11: «A»)", () => {
    expect(footer({ nosotros: true, contacto: true, expertos: true })[1].links).toEqual([
      { href: "/nosotros", label: "Nosotros" }, { href: "/contacto", label: "Contacto" }, { href: "/asesores", label: "Habla con un asesor" },
    ]);
    expect(footer({ contacto: true })[1].links.map((l) => l.href)).not.toContain("/asesores");
    const en = footerColumns({ lang: "en", ...base, pages: { ...off, expertos: true }, helpEnabled: false });
    expect(en[1].links).toEqual([{ href: "/asesores", label: "Talk to an advisor" }]);
  });
  it("REQ-1400: Ayuda lleva Centro de ayuda, WhatsApp y correo; sin ayuda ni WhatsApp no aparecen", () => {
    expect(footer()[2].links.map((l) => l.href)).toEqual(["/ayuda", "https://wa.me/5215555555555", "mailto:info@travelpuzzle.com.mx"]);
    expect(footer({}, { help: false, wa: "" , email: ""})[2].links).toEqual([]);
  });
});

describe("REQ-1530/REQ-1531: header con sesión y Panel de admin", () => {
  it("REQ-1530: con sesión el header es el mismo que el público (sin Inicio ni Mis Reservas)", async () => {
    const { sessionNavLinks, ACCOUNT_PAGES_READY } = await import("./nav-model");
    const { ACCOUNTS_ENABLED } = await import("@/lib/features");
    const pub = headerLinks(base);
    // REQ-1595: las páginas de cuenta existen; se muestran solo con la bandera (cualquiera que sea el entorno).
    expect(ACCOUNT_PAGES_READY).toBe(ACCOUNTS_ENABLED);
    expect(sessionNavLinks(pub, { loggedIn: true, accountPagesReady: false, myBookingsLabel: "Mis Reservas" })).toEqual(pub);
    expect(sessionNavLinks(pub, { loggedIn: false, accountPagesReady: true, myBookingsLabel: "Mis Reservas" })).toEqual(pub);
  });
  it("REQ-1530/REQ-1595: «Mis reservas» solo con las páginas de cuenta (va a /mi-cuenta/reservas)", async () => {
    const { sessionNavLinks } = await import("./nav-model");
    const out = sessionNavLinks(headerLinks(base), { loggedIn: true, accountPagesReady: true, myBookingsLabel: "Mis Reservas" });
    expect(out.map((l) => l.href)).toEqual(["/destinos", "/tours", "/traslados", "/mi-cuenta/reservas"]);
  });
  it("REQ-1531: el Panel solo enlaza páginas que existen (gestor y solicitudes), nunca /dashboard", async () => {
    const { adminPanelLinks, LEGACY_DASHBOARD_LINKS } = await import("./nav-model");
    expect(LEGACY_DASHBOARD_LINKS).toBe(false);
    const hrefs = adminPanelLinks("es").map((l) => l.href);
    expect(hrefs).toEqual(["/admin/viajes", "/admin/solicitudes"]);
    expect(hrefs.some((h) => h.startsWith("/dashboard"))).toBe(false);
    expect(adminPanelLinks("en").map((l) => l.label)).toEqual(["Trip manager", "Requests"]);
  });
  it("REQ-1531: cada enlace del Panel tiene página en src/app", async () => {
    const { existsSync } = await import("node:fs");
    const { adminPanelLinks } = await import("./nav-model");
    for (const l of adminPanelLinks("es")) expect(existsSync(`src/app${l.href}/page.tsx`)).toBe(true);
  });
});

describe("REQ-1595: rutas de la cuenta de cliente", () => {
  it("REQ-1595: cada ruta de cuenta tiene su página en src/app", async () => {
    const { existsSync } = await import("node:fs");
    const { ACCOUNT_ROUTES } = await import("./nav-model");
    for (const href of Object.values(ACCOUNT_ROUTES)) expect(existsSync(`src/app${href}/page.tsx`)).toBe(true);
  });
});
