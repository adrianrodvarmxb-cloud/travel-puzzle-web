// Puro · REQ-10693 (regla del PO, 15 nov 2026): ningún correo a un proveedor se envía directo. Se deja como borrador
// programado a las 5:00 de la mañana (hora de la Ciudad de México) del siguiente día hábil y el PO recibe el enlace de
// Gmail para revisarlo; si lo borra, no sale. Vale para los recordatorios y reintentos de Mila (reemplaza la hora de
// envío de REQ-1566: la ventana 9:00–11:00 del proveedor deja de decidir el envío) y para cualquier otro correo a proveedores.
import { ZONA_MX } from "./horario";

/** Hora local (CDMX) a la que sale el borrador programado. */
export const HORA_ENVIO = 5;

function partesEn(ms: number, tz: string) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), h: Number(p.hour), min: Number(p.minute), dia: String(p.weekday) };
}

/** Instante (ISO UTC) de las `hora`:00 de la fecha local `y-m-d` en la zona `tz`. */
function instanteLocal(y: number, m: number, d: number, hora: number, tz: string): string {
  const guess = Date.UTC(y, m - 1, d, hora);
  const l = partesEn(guess, tz);
  const comoUtc = Date.UTC(l.y, l.m - 1, l.d, l.h, l.min);
  return new Date(guess - (comoUtc - guess)).toISOString();
}

const esHabil = (dia: string) => dia !== "Sat" && dia !== "Sun";

/**
 * REQ-10693: cuándo sale el borrador: el siguiente día hábil (lunes a viernes) a las 5:00 de CDMX, siempre después de
 * `ahora`. Un sábado o domingo cae en lunes; un viernes a las 6:00 cae en lunes; un jueves a las 3:00 cae ese mismo
 * jueves no: siempre es el día siguiente (el PO necesita la noche para revisar).
 */
export function proximoEnvio(ahoraIso: string, tz: string = ZONA_MX): string {
  const base = Date.parse(ahoraIso);
  if (!Number.isFinite(base)) throw new Error(`fecha inválida: ${ahoraIso}`);
  for (let d = 1; d <= 7; d++) {
    const p = partesEn(base + d * 86_400_000, tz);
    if (!esHabil(p.dia)) continue;
    return instanteLocal(p.y, p.m, p.d, HORA_ENVIO, tz);
  }
  throw new Error("sin día hábil en la semana");
}

export interface BorradorProgramado { id: string; enlace: string; enviarEn: string }

/** REQ-10693: el aviso al PO con el enlace, corto, para WhatsApp o correo. */
export function avisoDeBorrador(p: { proveedor: string; asunto: string; tipo: string; enviarEn: string; enlace: string }, tz: string = ZONA_MX): string {
  const f = new Intl.DateTimeFormat("es-MX", { timeZone: tz, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `Borrador programado (${p.tipo}) a ${p.proveedor}: «${p.asunto}». Sale el ${f.format(new Date(p.enviarEn))} (CDMX) si no lo borras. Revisar: ${p.enlace}`;
}

/** REQ-10693: motivo con el que la revisión se detiene cuando no hay buzón de borradores (nunca se manda directo). */
export const SIN_BUZON = "sin buzón de borradores programados (REQ-10693): no se envía directo";
