/**
 * REQ-105: asesor por WhatsApp, el respaldo del interruptor automático cuando no hay
 * adaptador, no hay inventario o el adaptador falla. Sin número, no hay asesor y la tarjeta no se muestra.
 */
import type { Advisor } from "../lib/switch";

export function createWhatsAppAdvisor(number: string | undefined): Advisor & { whatsapp: string | null } {
  const digits = number?.replace(/\D/g, "") ?? "";
  return { whatsapp: digits.length >= 10 ? digits : null };
}
