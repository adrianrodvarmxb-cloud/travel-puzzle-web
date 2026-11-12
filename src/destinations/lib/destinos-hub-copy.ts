/** REQ-3475…3477: textos de /destinos (es y en; los demás idiomas usan inglés). Puro. */
import type { HubContinent } from "./destinos-hub";

const es = {
  searchLabel: "Busca tu destino",
  searchPlaceholder: "Ciudad o país",
  searchCta: "Buscar",
  topTitle: "Los más buscados",
  topSub: "Las ciudades favoritas de los viajeros",
  mapTitle: "Explora el mapa",
  mapSub: "Acerca el mapa y toca una ciudad para ver sus experiencias.",
  contTitle: "Por continente",
  contSub: "Elige un continente y descubre sus países",
  azTitle: "Todos los destinos de la A a la Z",
  azSub: "Todos los países donde tenemos experiencias",
  continents: { "america-norte": "Norteamérica y el Caribe", "america-sur": "Sudamérica", europa: "Europa", asia: "Asia y Medio Oriente", africa: "África", oceania: "Oceanía", otros: "Otros destinos" } as Record<HubContinent, string>,
};
type Copy = typeof es;
const en: Copy = {
  searchLabel: "Find your destination",
  searchPlaceholder: "City or country",
  searchCta: "Search",
  topTitle: "Most searched",
  topSub: "Travelers' favorite cities",
  mapTitle: "Explore the map",
  mapSub: "Zoom in and tap a city to see its experiences.",
  contTitle: "By continent",
  contSub: "Pick a continent and discover its countries",
  azTitle: "All destinations A to Z",
  azSub: "Every country where we have experiences",
  continents: { "america-norte": "North America & Caribbean", "america-sur": "South America", europa: "Europe", asia: "Asia & Middle East", africa: "Africa", oceania: "Oceania", otros: "Other destinations" },
};
export const destinosHubCopy = (lang: string): Copy => (lang === "es" ? es : en);
/** Ancla de cada continente (chips del buscador → pestaña y lista A–Z). */
export const continentAnchor = (c: HubContinent) => `continente-${c}`;
