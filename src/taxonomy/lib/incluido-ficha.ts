/**
 * REQ-10728 / REQ-10733 (ficha única, ola 3; regla de REQ-10707, vale para todos los proveedores por REQ-10709): las
 * etiquetas «incluido» con cantidad en la ficha del viaje, tras `INCLUIDO_ETIQUETAS_ENABLED`. Puro: usa la regla firmada
 * `etiquetasIncluido` y solo agrega el idioma (es, en; los demás usan en). Sin cantidad cierta, sin etiqueta.
 */
import { etiquetasIncluido, type EntradaIncluido, type EtiquetaIncluido } from "./incluido-cantidad";

export interface IncluidoFichaEnv { INCLUIDO_ETIQUETAS_ENABLED?: string }

export function incluidoFichaEnabled(env: IncluidoFichaEnv): boolean {
  return env.INCLUIDO_ETIQUETAS_ENABLED === "true";
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

const EN: Record<EtiquetaIncluido["concepto"], (n: number | "diario") => string> = {
  desayuno: (n) => (n === "diario" ? "Daily breakfast" : plural(n, "breakfast included", "breakfasts included")),
  comida: (n) => (n === "diario" ? "Daily lunch" : plural(n, "lunch included", "lunches included")),
  cena: (n) => (n === "diario" ? "Daily dinner" : plural(n, "dinner included", "dinners included")),
  hotel: (n) => (n === "diario" ? "Hotel included" : plural(n, "hotel night included", "hotel nights included")),
  tren: (n) => plural(n as number, "train journey included", "train journeys included"),
  autobus: (n) => plural(n as number, "bus journey included", "bus journeys included"),
};

/** Texto de una etiqueta en el idioma pedido; en español, el que ya trae la regla firmada. */
export function textoEtiquetaIncluido(e: EtiquetaIncluido, lang: string): string {
  if (lang === "es") return e.etiqueta;
  if (e.cantidad === "turistico") return "Sightseeing bus included";
  if (e.idaYVuelta) return e.concepto === "tren" ? "Round-trip train included" : "Round-trip bus included";
  return EN[e.concepto](e.cantidad);
}

// REQ-10728, REQ-10733
export function etiquetasIncluidoFicha(input: EntradaIncluido, lang: string, env: IncluidoFichaEnv): string[] {
  if (!incluidoFichaEnabled(env)) return [];
  return etiquetasIncluido(input).etiquetas.map((e) => textoEtiquetaIncluido(e, lang));
}
