/** Textos del home (español por defecto; inglés para quien lo elija; los demás idiomas usan inglés). */
const es = {
  heroTitle: "Arma tu próximo viaje",
  heroSub: (tours: string, cities: string) => `${tours} tours con guías locales en ${cities} ciudades del mundo`,
  heroSubEmpty: "Tours con guías locales en todo el mundo",
  searchPlaceholder: "¿A dónde vas? Ciudad, país o tour",
  searchCta: "Buscar",
  countryPlaceholder: "O elige un país",
  destTitle: "Destinos populares",
  destSub: "Elige una ciudad y descubre sus tours",
  tours: (n: string) => `${n} tours`,
  featTitle: "Los favoritos de los viajeros",
  featSub: "Los tours con más reseñas reales",
  free: "Gratis",
  reviews: (n: string) => `${n} reseñas`,
  seeAll: "Ver todos los tours",
  whyTitle: "¿Por qué Travel Puzzle?",
  whySub: "Somos una agencia mexicana: armamos tu viaje pieza por pieza.",
  reasons: [
    ["Guías locales", "Recorridos con guías que viven en cada ciudad y la conocen a fondo."],
    ["Reseñas reales", "Cada calificación viene de viajeros que ya hicieron el tour."],
    ["Atención por WhatsApp", "Te ayudamos en español antes, durante y después de tu tour."],
    ["Tu reserva a la mano", "Confirmación, recordatorios y tu reserva en un solo lugar."],
  ] as [string, string][],
  statTours: "tours disponibles",
  statCities: "ciudades",
  statCountries: "países",
  statRating: (n: string) => `calificación promedio · ${n} reseñas`,
  contTitle: "Explora por continente",
  contSub: "Encuentra tours en el país que vas a visitar",
  continents: { "america-norte": "Norteamérica y el Caribe", "america-sur": "Sudamérica", europa: "Europa", asia: "Asia y Medio Oriente", africa: "África", oceania: "Oceanía" },
  countriesN: (n: string) => `${n} países`,
  expertEyebrow: "Asesoría personalizada",
  expertTitle: "¿Quieres que armemos tu viaje?",
  expertSub: "Cuéntanos a dónde vas y un asesor de Travel Puzzle te ayuda a elegir tours, horarios y todo lo que necesites.",
  expertCta: "Hablar con un asesor",
  expertWa: "Hola Travel Puzzle, quiero armar mi viaje.",
  footerSlogan: "Armamos tu viaje",
  footerTours: "Tours",
  footerContact: "Contacto",
  footerFollow: "Síguenos",
  footerRights: (y: number) => `© ${y} Travel Puzzle México. Todos los derechos reservados.`,
  waBubble: "Escríbenos por WhatsApp",
};

type Copy = typeof es;

const en: Copy = {
  heroTitle: "Plan your next trip",
  heroSub: (tours, cities) => `${tours} tours with local guides in ${cities} cities worldwide`,
  heroSubEmpty: "Tours with local guides around the world",
  searchPlaceholder: "Where to? City, country or tour",
  searchCta: "Search",
  countryPlaceholder: "Or pick a country",
  destTitle: "Popular destinations",
  destSub: "Pick a city and discover its tours",
  tours: (n) => `${n} tours`,
  featTitle: "Travelers' favorites",
  featSub: "The tours with the most real reviews",
  free: "Free",
  reviews: (n) => `${n} reviews`,
  seeAll: "See all tours",
  whyTitle: "Why Travel Puzzle?",
  whySub: "We're a Mexican travel agency: we build your trip piece by piece.",
  reasons: [
    ["Local guides", "Tours led by guides who live in each city and know it inside out."],
    ["Real reviews", "Every rating comes from travelers who already took the tour."],
    ["WhatsApp support", "We help you before, during and after your tour."],
    ["Your booking at hand", "Confirmation, reminders and your booking in one place."],
  ],
  statTours: "tours available",
  statCities: "cities",
  statCountries: "countries",
  statRating: (n) => `average rating · ${n} reviews`,
  contTitle: "Explore by continent",
  contSub: "Find tours in the country you're visiting",
  continents: { "america-norte": "North America & Caribbean", "america-sur": "South America", europa: "Europe", asia: "Asia & Middle East", africa: "Africa", oceania: "Oceania" },
  countriesN: (n) => `${n} countries`,
  expertEyebrow: "Personal advice",
  expertTitle: "Want us to plan your trip?",
  expertSub: "Tell us where you're going and a Travel Puzzle advisor will help you choose tours, times and anything else you need.",
  expertCta: "Talk to an advisor",
  expertWa: "Hi Travel Puzzle, I'd like help planning my trip.",
  footerSlogan: "Armamos tu viaje",
  footerTours: "Tours",
  footerContact: "Contact",
  footerFollow: "Follow us",
  footerRights: (y) => `© ${y} Travel Puzzle México. All rights reserved.`,
  waBubble: "Message us on WhatsApp",
};

export function homeCopy(lang: string): Copy {
  return lang === "es" ? es : en;
}

export function waLink(number: string | undefined, text: string): string | null {
  const n = (number ?? "").replace(/\D/g, "");
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}
