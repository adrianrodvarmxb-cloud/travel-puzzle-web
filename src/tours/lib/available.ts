/**
 * REQ-1346 (INC-008): un solo total «experiencias disponibles» para el inicio, el encabezado de /tours y el filtro:
 * los tours que /tours lista (sin transporte) + los viajes sin transporte (REQ-172). Ligero: lo usa también el cliente.
 */
import { toursTrips } from "@/trips/lib/public";

const FORMATOS_TRANSPORTE = new Set(["transporte", "traslado"]);

// REQ-1346
export function experienciasDisponibles(toursEnExperiencias: number, trips: readonly { kind: string; formato?: string }[]): number {
  // «Sin transporte»: ni el tipo transporte (REQ-172) ni el formato transporte/traslado (no tiene chip en /tours).
  return toursEnExperiencias + toursTrips([...trips]).filter((t) => !FORMATOS_TRANSPORTE.has(t.formato ?? "")).length;
}
