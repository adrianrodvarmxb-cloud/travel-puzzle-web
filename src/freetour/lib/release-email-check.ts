/**
 * REQ-080: en cada release se valida que FREETOUR no le manda correos propios al cliente
 * de Modo 2 (skill cumplimiento-freetour, regla A4). Puro: evalúa la lista de remitentes
 * que llegaron al buzón de prueba; no reserva, no lee correo y no llama a ninguna API.
 * Procedimiento completo: docs/runbook/release-freetour-sin-correos.md.
 */
export interface ReceivedEmail {
  from: string;
  subject?: string;
  receivedAt?: string;
}

export interface EmailCheckResult {
  /** true solo si hubo correos de Travel Puzzle y ninguno de FREETOUR ni desconocido. */
  ok: boolean;
  freetour: ReceivedEmail[];
  /** Remitentes que no son ni Travel Puzzle ni FREETOUR: revisión manual. */
  unknown: ReceivedEmail[];
  ours: number;
}

const OUR_DOMAINS = ["travelpuzzle.com.mx"];
const FREETOUR_DOMAINS = ["freetour.com", "freetour.dev"];

const matches = (domain: string, list: string[]) => list.some((d) => domain === d || domain.endsWith(`.${d}`));

/** "Nombre <a@b.com>" o "a@b.com" → "b.com" (minúsculas). */
// REQ-080
export function senderDomain(from: string): string | null {
  const m = /@([a-z0-9.-]+\.[a-z]{2,})\s*>?\s*$/i.exec(from.trim());
  return m ? m[1].toLowerCase() : null;
}

// REQ-080
export function checkNoFreetourEmails(emails: readonly ReceivedEmail[], ourDomains: string[] = OUR_DOMAINS): EmailCheckResult {
  const freetour: ReceivedEmail[] = [];
  const unknown: ReceivedEmail[] = [];
  let ours = 0;
  for (const e of emails) {
    const domain = senderDomain(e.from);
    if (domain && matches(domain, ourDomains)) ours++;
    else if ((domain && matches(domain, FREETOUR_DOMAINS)) || /freetour/i.test(e.from)) freetour.push(e);
    else unknown.push(e);
  }
  return { ok: ours > 0 && freetour.length === 0 && unknown.length === 0, freetour, unknown, ours };
}

/** Checklist de release (se imprime con src/scripts/release-check-freetour.ts). */
// REQ-080
export const RELEASE_CHECKLIST: readonly string[] = [
  "1. Solo con OK del PO: una reserva de prueba de un free tour en producción, con un buzón de prueba de Travel Puzzle (nunca datos de un cliente).",
  "2. Esperar 30 minutos y revisar bandeja de entrada, spam y promociones del buzón de prueba.",
  "3. Exportar los remitentes recibidos a un JSON [{ \"from\", \"subject\", \"receivedAt\" }] y correr: npx tsx src/scripts/release-check-freetour.ts <archivo.json>.",
  "4. Si aparece un correo de FREETOUR o un remitente desconocido: NO PUBLICAR, avisar a support@freetour.com y abrir incidente en docs/incidentes/.",
  "5. Cancelar la reserva de prueba desde /reserva/{token} y confirmar el correo de cancelación de Travel Puzzle.",
  "6. Avisar a support@freetour.com que fue una reserva de prueba (regla B6).",
  "7. Registrar la corrida (fecha, refNumber, remitentes, resultado) en docs/runbook/release-freetour-sin-correos.md.",
];
