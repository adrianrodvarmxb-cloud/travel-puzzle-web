/**
 * REQ-665 (Gate 3): title y description de home y /traslados por idioma. Puro. Español = exactamente el texto de
 * siempre (SITE_META y la metadata de /traslados); los demás idiomas usan el inglés (van con noindex, REQ-662).
 */
import { SITE_META } from "@/seo/lib/meta";

const EN = {
  home: { title: "Travel Puzzle · We put your trip together", description: "Tours with local guides all over the world and a Spanish-speaking advisor who stays with you on WhatsApp." },
  traslados: { title: "Airport transfers to your hotel", description: "Book your private transfer from the airport to your hotel in hundreds of cities around the world." },
};
const ES = {
  home: { title: SITE_META.title, description: SITE_META.description },
  traslados: { title: "Traslados del aeropuerto a tu hotel", description: "Reserva tu traslado privado del aeropuerto a tu hotel en cientos de ciudades del mundo." },
};

// REQ-665
export const pageCopy = (lang: string) => (lang === "es" ? ES : EN);
