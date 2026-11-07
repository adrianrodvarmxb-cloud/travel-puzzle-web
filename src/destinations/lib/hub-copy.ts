/**
 * REQ-665 (Gate 3, Ola 2): textos de servidor de los hubs y fichas de /destinos por idioma. Puro.
 * Son las mismas plantillas que ya existían en español (sitelinks-google), traducidas; no agregan texto nuevo
 * (FREETOUR C2). pt/fr/it/de usan el inglés y esas versiones van con noindex (INDEXABLE_LOCALES, REQ-662).
 * Español = exactamente el texto de antes (los tests de REQ-099/100 siguen igual).
 */
import { SITE_META } from "@/seo/lib/meta";
import { PRIMERA_PIEZA_LABEL } from "@/tours/lib/menu";

const BRAND = SITE_META.name;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export interface HubCopy {
  home: string;
  destinos: string;
  destinosEyebrow: string;
  countryEyebrow: string;
  destinosIntro: string;
  destinosEmpty: [string, string, string];
  destinosDescription: (where: string | null) => string;
  countryIntro: (country: string) => string;
  countryDescription: (cities: string, more: boolean, country: string) => string;
  countryList: (country: string) => string;
  cityCount: (n: number) => string;
  countryCityTours: (free: number, tours: number) => string;
  cityList: (city: string) => string;
  freeToursCityTitle: (city: string) => string;
  cityDescription: (free: number, tours: number, city: string, country: string) => string;
  cityFreeIntro: (city: string, free: number, tours: number) => string;
  freeSection: string;
  freeSubtitle: string;
  toursSection: string;
  toursSubtitle: string;
  transfersSection: string;
  transfersSubtitle: string;
  guide: (city: string) => string;
  faqTitle: string;
  faq: (city: string, free: number, tours: number) => { q: string; a: string }[];
  tourTitle: (title: string, city: string, isFreeTour: boolean) => string;
  tourDescription: (isFreeTour: boolean, city: string, notice: string | null) => string;
  and: string;
  featured: string;
}

const ES: HubCopy = {
  home: "Inicio",
  destinos: "Destinos",
  destinosEyebrow: "Destinos",
  countryEyebrow: "Destino",
  destinosIntro: "Elige tu país y tu ciudad: free tours, tours y traslados con guías locales.",
  destinosEmpty: ["Pronto verás aquí los destinos. Mientras, ", "busca tu experiencia", "."],
  destinosDescription: (where) => `Free tours, experiencias y traslados en ${where ?? "todo el mundo"}, con guías locales y un asesor en español por WhatsApp.`,
  countryIntro: (country) => `Ciudades de ${country} con free tours y tours con guías locales.`,
  countryDescription: (cities, more, country) => `Free tours y tours en ${cities}${more ? " y más ciudades" : ""} de ${country}, con guías locales.`,
  countryList: (country) => `Destinos en ${country}`,
  cityCount: (n) => `${n} ${n === 1 ? "ciudad" : "ciudades"}`,
  countryCityTours: (free, tours) => `${free} free tours · ${tours} tours`,
  cityList: (city) => `Experiencias en ${city}`,
  freeToursCityTitle: (city) => `Free tours en ${city.trim()}: tú decides cuánto vale | ${BRAND}`,
  cityDescription: (free, tours, city, country) => `${plural(free, "free tour", "free tours")} y ${plural(tours, "tour", "tours")} en ${city}, ${country}, con guías locales. Reserva en línea o con un asesor por WhatsApp.`,
  cityFreeIntro: (city, free, tours) => `${free} en Pieza libre y ${tours} ${tours === 1 ? "tour" : "tours"} con guías locales en ${city}.`,
  freeSection: `Pieza libre (${PRIMERA_PIEZA_LABEL})`,
  freeSubtitle: "Reservar es gratis; al final le das al guía lo que consideres justo.",
  toursSection: "Tours",
  toursSubtitle: "Tours con precio y viajes de Travel Puzzle.",
  transfersSection: "Traslados",
  transfersSubtitle: "Cada tarjeta dice quién lo cobra.",
  guide: (city) => `Guía de ${city}`,
  faqTitle: "Preguntas frecuentes",
  faq: (city, free, tours) => [
    ...(free ? [{ q: `¿Qué es un free tour en ${city}?`, a: "Es un recorrido con un guía local en el que reservar es gratis; al final le das al guía lo que consideres justo." }] : []),
    { q: `¿Cuántas experiencias hay en ${city}?`, a: `Hoy hay ${plural(free, "free tour", "free tours")} y ${plural(tours, "tour", "tours")} en ${city} en Travel Puzzle.` },
    {
      q: "¿Puedo cancelar mi reserva?",
      a: "Los free tours se cancelan gratis en cualquier momento; si tu grupo paga tarifa fija, la cancelación con reembolso es hasta 24 h antes. Los tours de pago tienen cancelación con reembolso hasta 24 h antes.",
    },
    { q: "¿Me ayudan con el resto del viaje?", a: "Sí. Un asesor de Travel Puzzle te ayuda en español por WhatsApp con traslados y otras experiencias." },
  ],
  tourTitle: (title, city, isFreeTour) => `${title.trim()} – ${isFreeTour ? "Free tour" : "Tour"} en ${city.trim()} | ${BRAND}`,
  tourDescription: (isFreeTour, city, notice) => `${isFreeTour ? "Free tour" : "Tour"} en ${city} con un guía local. ${notice ?? ""}`,
  and: "y",
  featured: "Actividades destacadas",
};

const EN: HubCopy = {
  home: "Home",
  destinos: "Destinations",
  destinosEyebrow: "Destinations",
  countryEyebrow: "Destination",
  destinosIntro: "Choose your country and city: free tours, tours and transfers with local guides.",
  destinosEmpty: ["Destinations will appear here soon. Meanwhile, ", "find your experience", "."],
  destinosDescription: (where) => `Free tours, experiences and transfers in ${where ?? "the whole world"}, with local guides and a Spanish-speaking advisor on WhatsApp.`,
  countryIntro: (country) => `Cities in ${country} with free tours and tours with local guides.`,
  countryDescription: (cities, more, country) => `Free tours and tours in ${cities}${more ? " and more cities" : ""} in ${country}, with local guides.`,
  countryList: (country) => `Destinations in ${country}`,
  cityCount: (n) => `${n} ${n === 1 ? "city" : "cities"}`,
  countryCityTours: (free, tours) => `${free} free tours · ${tours} tours`,
  cityList: (city) => `Experiences in ${city}`,
  freeToursCityTitle: (city) => `Free tours in ${city.trim()}: you decide what it's worth | ${BRAND}`,
  cityDescription: (free, tours, city, country) => `${plural(free, "free tour", "free tours")} and ${plural(tours, "tour", "tours")} in ${city}, ${country}, with local guides. Book online or with an advisor on WhatsApp.`,
  cityFreeIntro: (city, free, tours) => `${free} in Pieza libre and ${tours} ${tours === 1 ? "tour" : "tours"} with local guides in ${city}.`,
  freeSection: `Pieza libre (${PRIMERA_PIEZA_LABEL})`,
  freeSubtitle: "Booking is free; at the end you give the guide what you think is fair.",
  toursSection: "Tours",
  toursSubtitle: "Priced tours and Travel Puzzle trips.",
  transfersSection: "Transfers",
  transfersSubtitle: "Each card says who charges for it.",
  guide: (city) => `${city} guide`,
  faqTitle: "Frequently asked questions",
  faq: (city, free, tours) => [
    ...(free ? [{ q: `What is a free tour in ${city}?`, a: "It is a walk with a local guide where booking is free; at the end you give the guide what you think is fair." }] : []),
    { q: `How many experiences are there in ${city}?`, a: `Today there are ${plural(free, "free tour", "free tours")} and ${plural(tours, "tour", "tours")} in ${city} on Travel Puzzle.` },
    {
      q: "Can I cancel my booking?",
      a: "Free tours can be cancelled for free at any time; if your group pays a fixed rate, cancellation with a refund is up to 24 h before. Paid tours can be cancelled with a refund up to 24 h before.",
    },
    { q: "Can you help me with the rest of the trip?", a: "Yes. A Travel Puzzle advisor helps you in Spanish on WhatsApp with transfers and other experiences." },
  ],
  tourTitle: (title, city, isFreeTour) => `${title.trim()} – ${isFreeTour ? "Free tour" : "Tour"} in ${city.trim()} | ${BRAND}`,
  tourDescription: (isFreeTour, city, notice) => `${isFreeTour ? "Free tour" : "Tour"} in ${city} with a local guide. ${notice ?? ""}`,
  and: "and",
  featured: "Featured activities",
};

// REQ-665
export const hubCopy = (lang: string): HubCopy => (lang === "es" ? ES : EN);
