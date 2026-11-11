/**
 * Copy de /nosotros (es/en). Puro.
 * REQ-243: cada sección tiene estado. Solo se pinta la «aprobada» y sin huecos `[PO: …]`. Lo que falta del cliente
 * (historia, misión y visión, frase de marca, equipo) queda aquí como borrador marcado y no sale en el sitio.
 * REQ-244: solo promete lo que hay en producción. Los tours los operan guías y agencias de cada destino; Travel Puzzle
 * es la agencia que ayuda a elegirlos y reservarlos (nunca se dice que los arman expertos, nunca un proveedor como operador).
 * Fuentes del borrador: plan del 6 nov 2026 (scratchpad paginas-nuevas/nosotros-contacto.md) y Drive 2023.
 */
import { TERMINOS } from "@/legal/lib/terminos";
import { textsOf } from "@/site/lib/vocab";

export type SectionStatus = "aprobado" | "pendiente";
export interface Card { title: string; text: string; link?: { label: string; href: string } }

interface Base { id: string; status: SectionStatus; eyebrow: string; title: string }
export type AboutSection =
  | (Base & { kind: "story"; paragraphs: string[]; photo: { src: string; alt: string } | null; caption: string })
  | (Base & { kind: "cards"; cards: Card[] })
  | (Base & { kind: "facts"; intro: string; rows: { label: string; value: string }[]; link: { label: string; href: string } })
  | (Base & { kind: "stats" })
  | (Base & { kind: "quote"; text: string })
  | (Base & { kind: "team"; members: { name: string; role: string; photo: string | null }[]; note: string });

export interface AboutContent {
  eyebrow: string;
  h1: string;
  lead: string;
  breadcrumbHome: string;
  meta: { title: string; description: string };
  sections: AboutSection[];
}

export const ABOUT_SECTIONS = ["historia", "proposito", "como-trabajamos", "cifras", "agencia", "equipo", "frase"] as const;

const GAP = /\[PO:/;

/** Hueco del cliente sin llenar: texto con [PO: …] o equipo sin personas confirmadas. */
export function hasPendingGap(s: AboutSection): boolean {
  if (textsOf(s).some((t) => GAP.test(t))) return true;
  if (s.kind === "team" && s.members.length === 0) return true;
  if (s.kind === "story" && !s.paragraphs.length) return true;
  return false;
}

// REQ-243
export function visibleAboutSections(c: AboutContent): AboutSection[] {
  return c.sections.filter((s) => s.status === "aprobado" && !hasPendingGap(s));
}

const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s)\p{L}/gu, (m) => m.toUpperCase());

/** Datos de la agencia tomados del texto vigente de /terminos (fuente única; si no se encuentran, la fila no sale). */
export function agencyFacts(terms: string = TERMINOS): { holder: string | null; rnt: string | null; profeco: string | null } {
  const holder = /^([A-ZÁÉÍÓÚÑ ]+), con nombre comercial TRAVEL PUZZLE/.exec(terms)?.[1] ?? null;
  return {
    holder: holder ? titleCase(holder.trim()) : null,
    rnt: /Registro Nacional de Turismo No\. (\d+)/.exec(terms)?.[1] ?? null,
    profeco: /Procuraduría Federal del Consumidor con el No\. ([\d-]+)/.exec(terms)?.[1] ?? null,
  };
}

function factRows(lang: string): { label: string; value: string }[] {
  const f = agencyFacts();
  const es = lang === "es";
  return [
    f.holder && { label: es ? "Titular" : "Owner", value: es ? `${f.holder}, con nombre comercial Travel Puzzle` : `${f.holder}, trading as Travel Puzzle` },
    f.rnt && { label: es ? "Registro Nacional de Turismo" : "National Tourism Registry (RNT)", value: f.rnt },
    f.profeco && { label: es ? "Contrato de adhesión ante Profeco" : "Consumer contract registered with Profeco", value: es ? `No. ${f.profeco}` : `No. ${f.profeco}` },
  ].filter((r): r is { label: string; value: string } => !!r);
}

const ES = (): AboutContent => ({
  eyebrow: "Nosotros",
  h1: "Nosotros",
  lead: "Somos Travel Puzzle, una agencia de viajes mexicana. Te armamos tu viaje: te ayudamos a elegir tours y traslados en tu destino, y un asesor te acompaña por WhatsApp.",
  breadcrumbHome: "Inicio",
  meta: {
    title: "Nosotros",
    description: "Conoce Travel Puzzle, agencia de viajes mexicana: te ayudamos a elegir tours y traslados en tu destino, con un asesor por WhatsApp.",
  },
  sections: [
    {
      id: "historia", kind: "story", status: "pendiente", eyebrow: "Nuestra historia", title: "Una viajera que armaba sus propios viajes",
      paragraphs: [
        "Claudia Leticia Rodríguez Laveaga, [PO: cargo que se publica; «fundadora y CEO» no aparece en ningún documento vigente], viaja desde [PO: «desde muy joven» o «desde los 22 años»: el Drive dice las dos]. Hoy ha visitado [PO: número actual de países; en 2023 eran «más de 30»] países.",
        "Por años armó sus propios itinerarios: vuelos, hoteles, tours y rutas en tren. Con esa idea creó Travel Puzzle en [PO: Durango o Ciudad de México] en [PO: año de fundación].",
      ],
      photo: null,
      caption: "[PO: retrato horizontal de al menos 1200 px con permiso de uso; biografia.jpg es una captura de texto y no sirve]",
    },
    {
      id: "proposito", kind: "cards", status: "pendiente", eyebrow: "Propósito", title: "Misión y visión",
      cards: [
        { title: "Misión", text: "Armar la experiencia de tus sueños en los destinos que elijas, con buenos itinerarios y guías locales. [PO: confirmar redacción de 2023]" },
        { title: "Visión", text: "[PO: confirmar visión; la de 2023 dice «líder… al mejor precio», que no se puede respaldar]" },
      ],
    },
    {
      id: "como-trabajamos", kind: "cards", status: "aprobado", eyebrow: "Cómo trabajamos", title: "Así te ayudamos",
      cards: [
        { title: "Tú eliges la ciudad y el tour", text: "Busca por ciudad y elige tu tour. Si quieres ayuda, un asesor de Travel Puzzle te propone tours y horarios para los días que tienes." },
        { title: "Guías locales en cada destino", text: "Los tours los operan guías y agencias de cada ciudad. Nosotros te ayudamos a elegirlos y a reservarlos." },
        { title: "Hablas con Travel Puzzle", text: "Toda la comunicación sobre tus reservas es con nosotros, por WhatsApp o en info@travelpuzzle.com.mx, de 10:00 a 14:00 y de 16:00 a 20:00 horas." },
        { title: "Reglas a la vista", text: "Las condiciones de reserva y cancelación están publicadas antes de que reserves.", link: { label: "Términos y condiciones", href: "/terminos" } },
      ],
    },
    { id: "cifras", kind: "stats", status: "aprobado", eyebrow: "Hoy en el sitio", title: "Lo que puedes reservar hoy" },
    {
      id: "agencia", kind: "facts", status: "aprobado", eyebrow: "Datos de la agencia", title: "Quién está detrás",
      intro: "Estos datos son los mismos de nuestros Términos y condiciones.",
      rows: factRows("es"),
      link: { label: "Leer los Términos y condiciones", href: "/terminos" },
    },
    {
      id: "equipo", kind: "team", status: "pendiente", eyebrow: "Equipo", title: "Quiénes te atienden",
      members: [],
      note: "[PO: quién sale, con cargo, foto y permiso escrito. Base 2023: Claudia Rodríguez Laveaga, Adrián Rodvar, David y Giovanny Pinto; confirmar si siguen]",
    },
    {
      id: "frase", kind: "quote", status: "pendiente", eyebrow: "", title: "",
      text: "Vivimos un viaje tres veces: cuando lo soñamos, cuando lo vivimos y cuando lo recordamos. [PO: confirmar que se usa (presentación 2023)]",
    },
  ],
});

const EN = (): AboutContent => ({
  eyebrow: "About us",
  h1: "About us",
  lead: "We are Travel Puzzle, a Mexican travel agency. We build your trip: we help you choose tours and transfers at your destination, and an advisor is with you on WhatsApp.",
  breadcrumbHome: "Home",
  meta: ES().meta, // REQ-243: metadatos solo en español (D7).
  sections: [
    {
      id: "historia", kind: "story", status: "pendiente", eyebrow: "Our story", title: "A traveler who planned her own trips",
      paragraphs: ["[PO: traducción cuando se apruebe la historia en español]"], photo: null, caption: "[PO: retrato con permiso]",
    },
    {
      id: "proposito", kind: "cards", status: "pendiente", eyebrow: "Purpose", title: "Mission and vision",
      cards: [{ title: "Mission", text: "[PO: traducción cuando se apruebe la misión]" }],
    },
    {
      id: "como-trabajamos", kind: "cards", status: "aprobado", eyebrow: "How we work", title: "How we help you",
      cards: [
        { title: "You choose the city and the tour", text: "Search by city and pick your tour. If you want help, a Travel Puzzle advisor will suggest tours and times for the days you have." },
        { title: "Local guides at every destination", text: "Tours are run by guides and agencies in each city. We help you choose and book them." },
        { title: "You talk to Travel Puzzle", text: "All communication about your bookings is with us, on WhatsApp or at info@travelpuzzle.com.mx, from 10:00 to 14:00 and 16:00 to 20:00." },
        { title: "Clear rules", text: "Booking and cancellation conditions are published before you book.", link: { label: "Terms and conditions", href: "/terminos" } },
      ],
    },
    { id: "cifras", kind: "stats", status: "aprobado", eyebrow: "On the site today", title: "What you can book today" },
    {
      id: "agencia", kind: "facts", status: "aprobado", eyebrow: "Agency details", title: "Who is behind it",
      intro: "These details match our Terms and conditions (in Spanish).",
      rows: factRows("en"),
      link: { label: "Read the Terms and conditions", href: "/terminos" },
    },
    { id: "equipo", kind: "team", status: "pendiente", eyebrow: "Team", title: "Who helps you", members: [], note: "[PO: equipo confirmado]" },
    { id: "frase", kind: "quote", status: "pendiente", eyebrow: "", title: "", text: "[PO: frase de marca]" },
  ],
});

export function aboutContent(lang: string): AboutContent {
  return lang === "es" ? ES() : EN();
}

/** D8: hay cifras que mostrar (si no, la sección «Hoy en el sitio» no sale ni siquiera con su título). */
import { hasLiveStats } from "./public-stats";
export { hasLiveStats };

/** REQ-243: secciones que se pintan, en orden, ya sin la de cifras si no hay datos. La numeración no salta. */
export function aboutSectionsToShow(sections: AboutSection[], stats: Parameters<typeof hasLiveStats>[0]): AboutSection[] {
  return sections.filter((s) => s.kind !== "stats" || hasLiveStats(stats));
}
