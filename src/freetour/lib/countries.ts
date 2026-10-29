import { zCountriesResponse, type Country } from "../schemas/country";

/**
 * Convierte la respuesta de GET /countries en el contenido de data/countries.json.
 * Función pura: valida, descarta campos que el sitio no usa y ordena por id.
 */
export function toCountriesFile(response: unknown): Country[] {
  const parsed = zCountriesResponse.parse(response);
  if (parsed.data.length === 0) {
    throw new Error("Freetour respondió sin países; no se sobrescribe el archivo");
  }
  return [...parsed.data].sort((a, b) => a.id - b.id);
}
