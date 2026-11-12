import { experiencesCount } from "@/tours/lib/catalog-name";

/** Textos del home (español por defecto; inglés para quien lo elija; los demás idiomas usan inglés). */
const es = {
  heroTitle: "Arma tu próximo viaje",
  heroSub: (tours: string, cities: string) => `${tours} experiencias con guías locales en ${cities} ciudades del mundo`,
  heroSubEmpty: "Experiencias con guías locales en todo el mundo",
  searchPlaceholder: "¿A dónde vas? Ciudad, país o experiencia",
  /** REQ-173: en celular (<640 px) la frase completa se corta; se muestra esta (PO, 6 nov 2026). */
  searchPlaceholderShort: "Ciudad, país o experiencia",
  searchCta: "Buscar",
  countryPlaceholder: "O elige un país",
  destTitle: "Destinos populares",
  destSub: "Elige una ciudad y descubre sus experiencias",
  tours: (n: string) => experiencesCount(n, "es"),
  featTitle: "Los favoritos de los viajeros",
  featSub: "Las experiencias con más reseñas",
  free: "Free tour",
  /** REQ-480: insignia azul sobre la foto. */
  freeBadge: "Pieza libre",
  reviews: (n: string) => `${n} reseñas`,
  seeAll: "Ver todas las experiencias",
  whyTitle: "¿Por qué Travel Puzzle?",
  whySub: "Somos una agencia mexicana: te armamos tu viaje pieza por pieza.",
  reasons: [
    ["Guías locales", "Recorridos con guías que viven en cada ciudad y la conocen a fondo."],
    ["Opiniones de viajeros", "Lee lo que cuentan quienes ya vivieron la experiencia antes de elegir."],
    ["Asesoría por WhatsApp", "Te ayudamos en español antes, durante y después de tu viaje."],
    ["Tu reserva a la mano", "Confirmación, recordatorios y tu reserva en un solo lugar."],
  ] as [string, string][],
  statTours: "experiencias disponibles",
  statCities: "ciudades",
  statCountries: "países",
  statRating: (n: string) => `calificación promedio · ${n} reseñas`,
  contTitle: "Explora por continente",
  contSub: "Encuentra experiencias en el país que vas a visitar",
  continents: { "america-norte": "Norteamérica y el Caribe", "america-sur": "Sudamérica", europa: "Europa", asia: "Asia y Medio Oriente", africa: "África", oceania: "Oceanía" },
  countriesN: (n: string) => `${n} países`,
  expertEyebrow: "Asesoría personalizada",
  expertTitle: "Te armamos tu viaje.",
  expertSub: "Cuéntanos a dónde vas y cuántos días tienes. Un asesor de Travel Puzzle te propone experiencias y horarios a tu medida.",
  expertCta: "Hablar con un asesor",
  expertWa: "Hola Travel Puzzle, quiero ayuda para armar mi viaje. Voy a: ",
  footerSlogan: "Te armamos tu viaje",
  footerTours: "Experiencias",
  footerContact: "Contacto",
  footerFollow: "Síguenos",
  footerRights: (y: number) => `© ${y} Travel Puzzle México. Todos los derechos reservados.`,
  waBubble: "Escríbenos por WhatsApp",
  // Diseño tecnológico
  heroHeadline: "Tu próximo viaje, pieza por pieza.",
  heroEyebrow: "TRAVEL PUZZLE MÉXICO · TE ARMAMOS TU VIAJE",
  onScreen: (n: number, total: number) => `EN PANTALLA · ${String(n).padStart(2, "0")} / ${String(total).padStart(2, "0")}`,
  seeToursIn: (c: string) => `Ver experiencias en ${c} →`,
  statRatingShort: "CALIFICACIÓN PROMEDIO",
  destHeadline: "¿A dónde vamos?",
  destAll: (n: string) => `Ver los ${n} destinos →`,
  featEyebrow: "02 — FAVORITOS DE LOS VIAJEROS",
  featHeadline: "Los más elegidos.",
  howEyebrow: "03 — CÓMO FUNCIONA",
  howHeadline: "Tres piezas, un gran viaje.",
  howSteps: (bookings: boolean) => [
    ["Elige", "Recorridos con guías que viven la ciudad, con la opinión de quienes ya los hicieron."],
    bookings
      ? ["Reserva", "Confirmación inmediata y tu reserva siempre contigo."]
      : ["Te lo apartamos", "Un asesor de Travel Puzzle confirma tu lugar por WhatsApp."],
    ["Vive la ciudad", "Te acompañamos antes, durante y después, a un mensaje de distancia."],
  ] as [string, string][],
  contEyebrow: "04 — EL MUNDO",
  mapEyebrow: "05 — EL MAPA",
  mapHeadline: "Explora el mundo.",
  mapSub: "Acerca el mapa y toca una ciudad para ver sus experiencias.",
  mapLoading: "Cargando mapa…",
  mapError: "No pudimos cargar el mapa. Explora por continente o busca tu ciudad arriba.",
  close: "Cerrar",
  reviewsEyebrow: "06 — LO QUE DICEN",
  reviewsHeadline: "En palabras de los viajeros.",
  reviewsSub: "Lo que cuentan quienes ya recorrieron estas ciudades.",
  avgLabel: "CALIFICACIÓN PROMEDIO DE LAS EXPERIENCIAS", // REQ-803 (C7)
  // REQ-3322: aviso de origen y selección (LFPC art. 32; práctica UE). Sin nombrar al proveedor.
  reviewsDisclosure: "Selección de reseñas de 5 estrellas, escritas por viajeros que vivieron la experiencia con su operador local. Travel Puzzle no las escribe ni las edita. La calificación y las reseñas de cada una están en la página de cada experiencia.",
  expertEyebrowN: "07 — ASESORÍA PERSONALIZADA",
  // REQ-453: carrusel «Excursiones de un día» (definición del diccionario de taxonomía; sin promesas ni proveedor)
  dayEyebrow: "EXCURSIONES DE UN DÍA",
  dayHeadline: "Excursiones de un día.",
  daySub: "Sales de la ciudad y vuelves el mismo día.",
};

type Copy = typeof es;

const en: Copy = {
  heroTitle: "Plan your next trip",
  heroSub: (tours, cities) => `${tours} experiences with local guides in ${cities} cities worldwide`,
  heroSubEmpty: "Experiences with local guides around the world",
  searchPlaceholder: "Where to? City, country or experience",
  searchPlaceholderShort: "City, country or experience",
  searchCta: "Search",
  countryPlaceholder: "Or pick a country",
  destTitle: "Popular destinations",
  destSub: "Pick a city and discover its experiences",
  tours: (n) => experiencesCount(n, "en"),
  featTitle: "Travelers' favorites",
  featSub: "The experiences with the most reviews",
  free: "Free tour",
  freeBadge: "Free Puzzle", // REQ-1103
  reviews: (n) => `${n} reviews`,
  seeAll: "See all experiences",
  whyTitle: "Why Travel Puzzle?",
  whySub: "We're a Mexican travel agency: we build your trip piece by piece.",
  reasons: [
    ["Local guides", "Experiences led by guides who live in each city and know it inside out."],
    ["Traveler opinions", "Read what people who already lived the experience say before you choose."],
    ["WhatsApp advice", "We help you before, during and after your trip."],
    ["Your booking at hand", "Confirmation, reminders and your booking in one place."],
  ],
  statTours: "experiences available",
  statCities: "cities",
  statCountries: "countries",
  statRating: (n) => `average rating · ${n} reviews`,
  contTitle: "Explore by continent",
  contSub: "Find experiences in the country you're visiting",
  continents: { "america-norte": "North America & Caribbean", "america-sur": "South America", europa: "Europe", asia: "Asia & Middle East", africa: "Africa", oceania: "Oceania" },
  countriesN: (n) => `${n} countries`,
  expertEyebrow: "Personal advice",
  expertTitle: "We build your trip.",
  expertSub: "Tell us where you're going and for how many days. A Travel Puzzle advisor will propose experiences and times tailored to you.",
  expertCta: "Talk to an advisor",
  expertWa: "Hi Travel Puzzle, I'd like help planning my trip. I'm going to: ",
  footerSlogan: "Te armamos tu viaje",
  footerTours: "Experiences",
  footerContact: "Contact",
  footerFollow: "Follow us",
  footerRights: (y) => `© ${y} Travel Puzzle México. All rights reserved.`,
  waBubble: "Message us on WhatsApp",
  heroHeadline: "Your next trip, piece by piece.",
  heroEyebrow: "TRAVEL PUZZLE MÉXICO · TE ARMAMOS TU VIAJE",
  onScreen: (n, total) => `ON SCREEN · ${String(n).padStart(2, "0")} / ${String(total).padStart(2, "0")}`,
  seeToursIn: (c) => `See experiences in ${c} →`,
  statRatingShort: "AVERAGE RATING",
  destHeadline: "Where to?",
  destAll: (n) => `See all ${n} destinations →`,
  featEyebrow: "02 — TRAVELER FAVORITES",
  featHeadline: "Travelers' top picks.",
  howEyebrow: "03 — HOW IT WORKS",
  howHeadline: "Three pieces, one great trip.",
  howSteps: (bookings) => [
    ["Choose", "Experiences with guides who live the city, with reviews from people who already took them."],
    bookings
      ? ["Book", "Instant confirmation and your booking always with you."]
      : ["We hold your spot", "A Travel Puzzle advisor confirms your place on WhatsApp."],
    ["Enjoy the city", "We're with you before, during and after, one message away."],
  ],
  contEyebrow: "04 — THE WORLD",
  mapEyebrow: "05 — THE MAP",
  mapHeadline: "Explore the world.",
  mapSub: "Zoom in and tap a city to see its experiences.",
  mapLoading: "Loading map…",
  mapError: "We couldn't load the map. Explore by continent or search your city above.",
  close: "Close",
  reviewsEyebrow: "06 — WHAT THEY SAY",
  reviewsHeadline: "In travelers' own words.",
  reviewsSub: "What people who already explored these cities have to say.",
  avgLabel: "AVERAGE EXPERIENCE RATING", // REQ-803 (C7)
  // REQ-3322
  reviewsDisclosure: "A selection of 5-star reviews, written by travelers who took the experience with its local operator. Travel Puzzle does not write or edit them. Each one's rating and reviews are on each experience's page.",
  expertEyebrowN: "07 — PERSONAL ADVICE",
  dayEyebrow: "DAY TRIPS",
  dayHeadline: "Day trips.",
  daySub: "Leave the city and be back the same day.",
};

export function homeCopy(lang: string): Copy {
  return lang === "es" ? es : en;
}

export function waLink(number: string | undefined, text: string): string | null {
  const n = (number ?? "").replace(/\D/g, "");
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}
