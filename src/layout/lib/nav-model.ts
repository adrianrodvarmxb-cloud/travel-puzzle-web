/**
 * REQ-1400: estructura de navegación pública (header, menú móvil y pie por columnas). Puro: sin I/O.
 * Reglas del PO (7 nov 2026): header = Destinos · Experiencias · Traslados · Blog; Cómo funciona sale del header y
 * vive en el pie (Explora) y en el inicio; Nosotros, Blog y Contacto en el pie (Empresa); cada enlace aparece una vez en el menú móvil.
 */
import { ROUTES } from "@/destinations/lib/routes";
import { homeSections, type HomeSection } from "@/home/lib/sections";
import { PRIMERA_PIEZA_LABEL } from "@/tours/lib/menu";
import { PAGE_PATHS, type SitePages } from "@/site/lib/pages";
import { ACCOUNTS_ENABLED } from "@/lib/features";

export interface NavLink { href: string; label: string }
export interface FooterColumn { title: string; links: NavLink[] }

export interface HeaderOptions {
  labels: { destinos: string; tours: string; transfers: string; blog: string };
  transfers: boolean;
  primeraPieza: boolean;
  blog: boolean;
}

/** REQ-1400: Destinos (con la bandera de La Primera Pieza) · Experiencias · Traslados (bandera) · Blog (si hay artículos visibles). */
export function headerLinks(o: HeaderOptions): NavLink[] {
  const out: NavLink[] = [];
  if (o.primeraPieza) out.push({ href: ROUTES.destinos, label: o.labels.destinos });
  out.push({ href: "/tours", label: o.labels.tours });
  if (o.transfers) out.push({ href: "/traslados", label: o.labels.transfers });
  if (o.blog) out.push({ href: PAGE_PATHS.blog, label: o.labels.blog });
  return out;
}

/** REQ-1400: secciones del inicio para el menú móvil, sin Destinos (ya está en el header). */
export function mobileSectionLinks(lang: string, dayTrips = false): HomeSection[] {
  return homeSections(lang, { dayTrips })
    .filter((s) => s.href !== "/#destinos")
    .map((s, i) => ({ ...s, number: String(i + 1).padStart(2, "0") }));
}

export interface FooterOptions extends HeaderOptions {
  lang: string;
  pages: Partial<SitePages> | undefined;
  helpEnabled: boolean;
  whatsappUrl?: string;
  email?: string;
  /** REQ-1400: pilares activos del blog (topic cluster); solo se muestran con el blog visible. */
  pillars?: NavLink[];
  /** REQ-3335 (gate A3): guías de ciudad del idioma; cuando se pasan, reemplazan a los pilares en la columna «Guías». */
  guides?: NavLink[];
}

const TITLES: Record<string, { explore: string; company: string; guides: string; help: string }> = {
  es: { explore: "Explora", company: "Empresa", guides: "Guías", help: "Ayuda" },
  en: { explore: "Explore", company: "Company", guides: "Guides", help: "Help" },
};
const LABELS: Record<string, { howItWorks: string; help: string; whatsapp: string }> = {
  es: { howItWorks: "Cómo funciona", help: "Centro de ayuda", whatsapp: "WhatsApp" },
  en: { howItWorks: "How it works", help: "Help center", whatsapp: "WhatsApp" },
};

/** REQ-3458: el enlace a «La Primera Pieza» en el pie queda oculto, no borrado. */
export const FOOTER_PRIMERA_PIEZA = false;

/** REQ-1400: pie por columnas. Las páginas institucionales solo aparecen con su bandera encendida. */
export function footerColumns(o: FooterOptions): FooterColumn[] {
  const t = TITLES[o.lang] ?? TITLES.en;
  const l = LABELS[o.lang] ?? LABELS.en;
  const pageLabel = (k: keyof typeof PAGE_PATHS) => ({ href: PAGE_PATHS[k], label: pageText(k, o.lang) });

  const explore: NavLink[] = [
    ...(o.primeraPieza ? [{ href: ROUTES.destinos, label: o.labels.destinos }] : []),
    { href: "/tours", label: o.labels.tours },
    ...(o.transfers ? [{ href: "/traslados", label: o.labels.transfers }] : []),
    { href: "/#como-funciona", label: l.howItWorks },
    // REQ-3458: «La Primera Pieza» fuera del pie (PO, 12 nov 2026). Regreso: FOOTER_PRIMERA_PIEZA = true.
    ...(o.primeraPieza && FOOTER_PRIMERA_PIEZA ? [{ href: ROUTES.primeraPieza, label: PRIMERA_PIEZA_LABEL }] : []),
  ];

  const company: NavLink[] = [];
  if (o.pages?.nosotros) company.push(pageLabel("nosotros"));
  if (o.blog) company.push({ href: PAGE_PATHS.blog, label: o.labels.blog });
  if (o.pages?.contacto) company.push(pageLabel("contacto"));
  // REQ-3431: /asesores junto a Contacto (PO 12-11: «A»), solo con EXPERTOS_ENABLED.
  if (o.pages?.expertos) company.push(pageLabel("expertos"));

  const help: NavLink[] = [
    ...(o.helpEnabled ? [{ href: "/ayuda", label: l.help }] : []),
    ...(o.whatsappUrl ? [{ href: o.whatsappUrl, label: l.whatsapp }] : []),
    ...(o.email ? [{ href: `mailto:${o.email}`, label: o.email }] : []),
  ];

  const cols: FooterColumn[] = [
    { title: t.explore, links: explore },
    { title: t.company, links: company },
  ];
  // REQ-3335: las guías de ciudad mandan; los pilares del blog solo quedan como respaldo si no se pasan guías.
  if (o.guides !== undefined) {
    if (o.guides.length) cols.push({ title: t.guides, links: o.guides });
  } else if (o.blog && o.pillars?.length) cols.push({ title: t.guides, links: o.pillars });
  cols.push({ title: t.help, links: help });
  return cols;
}

const PAGE_TEXT: Record<string, Record<string, string>> = {
  es: { nosotros: "Nosotros", contacto: "Contacto", expertos: "Habla con un asesor" },
  en: { nosotros: "About us", contacto: "Contact", expertos: "Talk to an advisor" },
};
function pageText(k: string, lang: string): string {
  return (PAGE_TEXT[lang] ?? PAGE_TEXT.en)[k];
}

/** REQ-1530/REQ-1595: «Mis reservas» y «Mi cuenta» existen (/mi-cuenta) y se muestran solo con ACCOUNTS_ENABLED. */
export const ACCOUNT_PAGES_READY = ACCOUNTS_ENABLED;
/** REQ-1595: rutas de la cuenta de cliente. */
export const ACCOUNT_ROUTES = { signIn: "/mi-cuenta/entrar", bookings: "/mi-cuenta/reservas", account: "/mi-cuenta" } as const;
/** REQ-1531: enlaces del Panel viejo (/dashboard/*, del sitio de Vercel) ocultos; esas páginas no existen. */
export const LEGACY_DASHBOARD_LINKS = false;

/** REQ-1530: con o sin sesión el header es el público; «Mis Reservas» solo con las páginas de cuenta listas. */
export function sessionNavLinks(
  pub: NavLink[],
  o: { loggedIn: boolean; accountPagesReady: boolean; myBookingsLabel: string },
): NavLink[] {
  return o.loggedIn && o.accountPagesReady ? [...pub, { href: ACCOUNT_ROUTES.bookings, label: o.myBookingsLabel }] : pub;
}

export interface PanelLink extends NavLink { icon: string }
const PANEL: Record<string, { trips: string; requests: string }> = {
  es: { trips: "Gestor de viajes", requests: "Solicitudes" },
  en: { trips: "Trip manager", requests: "Requests" },
};
/** REQ-1531: el Panel de ADMIN solo enlaza páginas que existen. */
export function adminPanelLinks(lang: string): PanelLink[] {
  const t = PANEL[lang] ?? PANEL.en;
  return [
    { href: "/admin/viajes", label: t.trips, icon: "🧩" },
    { href: "/admin/solicitudes", label: t.requests, icon: "📋" },
  ];
}
