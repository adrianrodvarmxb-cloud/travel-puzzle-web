/**
 * Pilares del blog (plan del 6 nov 2026, §1; Gate A pendiente de firma). Puro.
 * «bloqueado» = no se pinta ni enlaza (free tours espera la autorización B1 por escrito; Asia, su inventario).
 * La página comercial apunta a /destinos/{pais} solo con PRIMERA_PIEZA_ENABLED; apagada, al buscador de /tours
 * (nunca a una ruta que da 404).
 * REQ-977: las rutas de país son por código (/destinos/cn, /pe, /co); /destinos/china daba 404.
 * REQ-978: pilar «Ciudad de México», derivado del catálogo (77 experiencias el 6 nov 2026).
 */
export interface Pillar {
  slug: string;
  name: string;
  h1: string;
  term: string;
  intro: string;
  status: "activo" | "bloqueado";
  commercial: { label: string; destinos: string | null; search: string };
}

export const PILLARS: Pillar[] = [
  {
    slug: "china", name: "China desde México", h1: "Viajar a China desde México", term: "viajar a china desde mexico",
    intro: "Guías para preparar tu viaje a China desde México: documentos, pagos, conexión, rutas y temporadas.",
    status: "activo", commercial: { label: "Ver viajes a China", destinos: "/destinos/cn", search: "China" },
  },
  {
    slug: "peru", name: "Perú y Machu Picchu", h1: "Viajar a Perú desde México", term: "viajar a peru desde mexico",
    intro: "Guías para preparar tu viaje a Perú desde México: cómo llegar a Machu Picchu, boletos, altura y rutas.",
    status: "activo", commercial: { label: "Ver viajes a Perú", destinos: "/destinos/pe", search: "Perú" },
  },
  {
    slug: "colombia", name: "Colombia desde México", h1: "Viajar a Colombia desde México", term: "viajar a colombia desde mexico",
    intro: "Guías para preparar tu viaje a Colombia desde México: requisitos, presupuesto y rutas.",
    status: "activo", commercial: { label: "Ver viajes a Colombia", destinos: "/destinos/co", search: "Colombia" },
  },
  {
    slug: "europa", name: "Europa, primer viaje", h1: "Viajar a Europa desde México", term: "viajar a europa desde mexico",
    intro: "Guías para tu primer viaje a Europa desde México: requisitos, qué ciudades elegir y cómo recorrerlas.",
    status: "activo", commercial: { label: "Ver tours en Europa", destinos: null, search: "Europa" },
  },
  {
    slug: "mexico", name: "Ciudad de México", h1: "Qué hacer en la Ciudad de México", term: "que hacer en la ciudad de mexico",
    intro: "Guías para recorrer la Ciudad de México: recorridos a pie, visitas guiadas y cómo moverte.",
    status: "activo", commercial: { label: "Ver experiencias en la Ciudad de México", destinos: "/destinos/mx/ciudad-de-mexico", search: "Ciudad de México" },
  },
  {
    slug: "free-tours", name: "Free tours", h1: "Qué es un free tour y cómo funciona", term: "que es un free tour",
    intro: "Cómo funcionan los free tours: reserva, propina al guía y qué esperar.",
    status: "bloqueado", commercial: { label: "Ver La Primera Pieza", destinos: "/la-primera-pieza", search: "free tour" },
  },
];

export const pillarBySlug = (slug: string) => PILLARS.find((p) => p.slug === slug) ?? null;
export const PILLAR_SLUGS = PILLARS.map((p) => p.slug) as [string, ...string[]];

/** Página comercial del pilar sin enlazar rutas apagadas. */
export function commercialHref(p: Pillar, primeraPieza: boolean): string {
  return primeraPieza && p.commercial.destinos ? p.commercial.destinos : `/tours?search=${encodeURIComponent(p.commercial.search)}`;
}

/** Rutas que hoy dan 404 si su bandera está apagada (el verificador de enlaces las rechaza). */
export function offRoutes(flags: { primeraPieza: boolean }): RegExp[] {
  return [...(flags.primeraPieza ? [] : [/^\/destinos(\/|$)/, /^\/la-primera-pieza(\/|$)/]), /^\/trenes(\/|$)/];
}
