/**
 * REQ-10756 (ficha única, ola 3; decisión 13 = REQ-10592): formato firmado por el PO viaje por viaje, a partir de la lista
 * antes/después por agencia (REQ-10748). Puro. La clave es `Trip.id` (`idFor(initials, ref)`). Solo entra lo firmado con
 * fecha y respuesta literal; lo que el PO dejó «como hoy» se anota en `seQuedanComoHoy` y no cambia nada.
 */
import raw from "../data/formato-firmado.json";
import { FORMATOS, type Formato } from "./types";

export interface FirmaFormato { proveedor: string; ref: string; titulo: string; antes: string; formato: string; firma: string }
export const FORMATO_FIRMADO = raw as { nota: string; viajes: Record<string, FirmaFormato>; seQuedanComoHoy: Record<string, string> };

const esFormato = (s: string): s is Formato => (FORMATOS as readonly string[]).includes(s);

// REQ-10756
export function formatoFirmado(tripId: string | null | undefined): Formato | null {
  if (!tripId) return null;
  const f = FORMATO_FIRMADO.viajes[tripId]?.formato;
  return f && esFormato(f) ? f : null;
}
