/** Textos fijos de la ficha y las tarjetas de viajes, en los 6 idiomas del sitio. Puro. */
const ES = {
  from: "Desde", perPerson: "por persona", days: (n: number) => `${n} ${n === 1 ? "día" : "días"}`,
  recommended: "Recomendado por Travel Puzzle", highlights: "Lo mejor", description: "Descripción", itinerary: "Itinerario", day: "Día",
  includes: "Incluye", excludes: "No incluye", important: "Información importante", bring: "Qué llevar", accessibility: "Accesibilidad",
  visa: "Visa y requisitos", meeting: "Punto de encuentro", hotel: "También te recogemos en tu hotel.", endPoint: "Termina en",
  options: "Opciones y precios", adult: "Adulto", child: (a: number, b: number) => `Niño (${a}–${b} años)`, infant: "Infante", group: "En grupo", private: "Privado",
  extras: "Extras opcionales", cancellation: "Cancelación", cancelStandard: "Cancelación gratuita hasta 24 h antes.", cancelNone: "Sin reembolso.",
  cancelTier: (d: number, p: number) => `Hasta ${d} días antes: ${p}% de reembolso.`, languages: "Idiomas del guía", group_size: (a: number | null, b: number | null) => `Grupo de ${a ?? 1} a ${b ?? "∞"} personas`,
  flights: "Incluye vuelos", noFlights: "No incluye vuelos", cta: "Cotizar por WhatsApp", ctaHelp: "Un asesor en español te responde y arma tu reserva.",
  guarantees: "Garantías Travel Puzzle", g1: "Guía en español", g2: "Asesores con experiencia", g3: "Itinerarios a tu medida", g4: "Opciones de pago",
  video: "Video", seeMap: "Ver en el mapa", difficulty: { facil: "Fácil", moderada: "Moderada", exigente: "Exigente" } as Record<string, string>,
  kinds: { tour: "Tour", circuito: "Circuito", unica: "Experiencia única", personalizado: "Viaje a tu medida" } as Record<string, string>,
  filterAll: "Todo", filterFree: "Free tours", filterTour: "Tours", filterCircuit: "Circuitos", filterExp: "Experiencias",
  carouselEyebrow: "VIAJES BY TRAVEL PUZZLE", carouselTitle: "Viajes armados por nuestros expertos", seeTrip: "Ver viaje",
};
type Copy = typeof ES;

const EN: Copy = {
  ...ES, from: "From", perPerson: "per person", days: (n) => `${n} ${n === 1 ? "day" : "days"}`, recommended: "Recommended by Travel Puzzle",
  highlights: "Highlights", description: "Description", itinerary: "Itinerary", day: "Day", includes: "Included", excludes: "Not included",
  important: "Important information", bring: "What to bring", accessibility: "Accessibility", visa: "Visa & requirements", meeting: "Meeting point",
  hotel: "Hotel pickup also available.", endPoint: "Ends at", options: "Options & prices", adult: "Adult", child: (a, b) => `Child (${a}–${b} yrs)`, infant: "Infant",
  group: "Group", private: "Private", extras: "Optional extras", cancellation: "Cancellation", cancelStandard: "Free cancellation up to 24 h before.",
  cancelNone: "Non-refundable.", cancelTier: (d, p) => `Up to ${d} days before: ${p}% refund.`, languages: "Guide languages",
  group_size: (a, b) => `Group of ${a ?? 1} to ${b ?? "∞"} people`, flights: "Flights included", noFlights: "Flights not included",
  cta: "Get a quote on WhatsApp", ctaHelp: "An advisor replies and puts your booking together.", guarantees: "Travel Puzzle guarantees",
  g1: "Spanish-speaking guide", g2: "Experienced advisors", g3: "Tailor-made itineraries", g4: "Payment options", video: "Video", seeMap: "See on map",
  difficulty: { facil: "Easy", moderada: "Moderate", exigente: "Challenging" }, kinds: { tour: "Tour", circuito: "Multi-day tour", unica: "Unique experience", personalizado: "Tailor-made trip" },
  filterAll: "All", filterFree: "Free tours", filterTour: "Tours", filterCircuit: "Multi-day", filterExp: "Experiences",
  carouselEyebrow: "TRIPS BY TRAVEL PUZZLE", carouselTitle: "Trips crafted by our experts", seeTrip: "See trip",
};
const PT: Copy = { ...EN, from: "A partir de", perPerson: "por pessoa", days: (n) => `${n} ${n === 1 ? "dia" : "dias"}`, recommended: "Recomendado pela Travel Puzzle", highlights: "Destaques", description: "Descrição", itinerary: "Roteiro", day: "Dia", includes: "Inclui", excludes: "Não inclui", important: "Informações importantes", bring: "O que levar", accessibility: "Acessibilidade", visa: "Visto e requisitos", meeting: "Ponto de encontro", options: "Opções e preços", adult: "Adulto", child: (a, b) => `Criança (${a}–${b} anos)`, infant: "Bebê", group: "Em grupo", private: "Privado", cancellation: "Cancelamento", cta: "Cotar pelo WhatsApp", guarantees: "Garantias Travel Puzzle", g1: "Guia em espanhol", g2: "Consultores experientes", g3: "Roteiros sob medida", g4: "Opções de pagamento", seeTrip: "Ver viagem", carouselTitle: "Viagens criadas pelos nossos especialistas", filterAll: "Tudo", filterExp: "Experiências", filterCircuit: "Circuitos" };
const DE: Copy = { ...EN, from: "Ab", perPerson: "pro Person", days: (n) => `${n} ${n === 1 ? "Tag" : "Tage"}`, recommended: "Empfohlen von Travel Puzzle", highlights: "Highlights", description: "Beschreibung", itinerary: "Reiseverlauf", day: "Tag", includes: "Inklusive", excludes: "Nicht inklusive", important: "Wichtige Informationen", bring: "Was mitbringen", accessibility: "Barrierefreiheit", visa: "Visum & Voraussetzungen", meeting: "Treffpunkt", options: "Optionen & Preise", adult: "Erwachsener", child: (a, b) => `Kind (${a}–${b} J.)`, infant: "Kleinkind", group: "Gruppe", private: "Privat", cancellation: "Stornierung", cta: "Angebot per WhatsApp", guarantees: "Travel-Puzzle-Garantien", g1: "Spanischsprachiger Guide", g2: "Erfahrene Berater", g3: "Maßgeschneiderte Reisen", g4: "Zahlungsoptionen", seeTrip: "Reise ansehen", carouselTitle: "Reisen von unseren Experten", filterAll: "Alle", filterExp: "Erlebnisse", filterCircuit: "Rundreisen" };
const FR: Copy = { ...EN, from: "À partir de", perPerson: "par personne", days: (n) => `${n} ${n === 1 ? "jour" : "jours"}`, recommended: "Recommandé par Travel Puzzle", highlights: "Points forts", description: "Description", itinerary: "Itinéraire", day: "Jour", includes: "Inclus", excludes: "Non inclus", important: "Informations importantes", bring: "À apporter", accessibility: "Accessibilité", visa: "Visa et exigences", meeting: "Point de rendez-vous", options: "Options et prix", adult: "Adulte", child: (a, b) => `Enfant (${a}–${b} ans)`, infant: "Bébé", group: "En groupe", private: "Privé", cancellation: "Annulation", cta: "Devis sur WhatsApp", guarantees: "Garanties Travel Puzzle", g1: "Guide hispanophone", g2: "Conseillers expérimentés", g3: "Itinéraires sur mesure", g4: "Options de paiement", seeTrip: "Voir le voyage", carouselTitle: "Voyages conçus par nos experts", filterAll: "Tout", filterExp: "Expériences", filterCircuit: "Circuits" };
const IT: Copy = { ...EN, from: "Da", perPerson: "a persona", days: (n) => `${n} ${n === 1 ? "giorno" : "giorni"}`, recommended: "Consigliato da Travel Puzzle", highlights: "Punti salienti", description: "Descrizione", itinerary: "Itinerario", day: "Giorno", includes: "Incluso", excludes: "Non incluso", important: "Informazioni importanti", bring: "Cosa portare", accessibility: "Accessibilità", visa: "Visto e requisiti", meeting: "Punto d'incontro", options: "Opzioni e prezzi", adult: "Adulto", child: (a, b) => `Bambino (${a}–${b} anni)`, infant: "Neonato", group: "In gruppo", private: "Privato", cancellation: "Cancellazione", cta: "Preventivo su WhatsApp", guarantees: "Garanzie Travel Puzzle", g1: "Guida in spagnolo", g2: "Consulenti esperti", g3: "Itinerari su misura", g4: "Opzioni di pagamento", seeTrip: "Vedi viaggio", carouselTitle: "Viaggi creati dai nostri esperti", filterAll: "Tutto", filterExp: "Esperienze", filterCircuit: "Tour" };

export function tripCopy(lang: string): Copy {
  return ({ es: ES, en: EN, pt: PT, de: DE, fr: FR, it: IT } as Record<string, Copy>)[lang] ?? EN;
}
export type TripCopy = Copy;
