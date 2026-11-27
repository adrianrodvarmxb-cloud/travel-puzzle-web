// Puro · REQ-10693 (regla del PO, 15 nov 2026, precisada en el chat): ningún correo a un proveedor se envía directo.
// Todo correo queda como borrador de Gmail con envío programado y el PO recibe el enlace (si lo borra, no sale; si lo
// corrige, sale corregido). La hora:
//  - Recordatorios y reintentos de Mila: dentro del horario del proveedor, de 5:00 a 16:00 de su hora local, lunes a
//    viernes (reemplaza la ventana 9:00–11:00 de REQ-1566). Si ya cabe hoy, sale a la hora que toca; si es antes de las
//    5:00, a las 5:00 de hoy; si ya pasaron las 16:00 o no es día hábil, a las 5:00 del siguiente día hábil.
//  - Correos que pide el PO fuera del horario del proveedor: a las 5:00 del siguiente día hábil (misma función).
// Sin zona del proveedor, la de México. Sin red, reloj ni process.env: la hora llega por parámetro.
import { ZONA_MX } from "./horario";

/** Horario en que un correo puede llegarle al proveedor (su hora local). */
export const VENTANA_ENVIO = { desde: 5, hasta: 16 } as const;
/** Hora a la que sale lo que se pasa al siguiente día hábil. */
export const HORA_ENVIO = VENTANA_ENVIO.desde;

const zonaValida = (tz?: string) => { try { if (!tz) return ZONA_MX; new Intl.DateTimeFormat("en-US", { timeZone: tz }); return tz; } catch { return ZONA_MX; } };

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
 * REQ-10693: cuándo sale el borrador para que le llegue al proveedor en su horario (5:00–16:00, lunes a viernes).
 * Dentro del horario: ahora mismo. Antes de las 5:00 de un día hábil: a las 5:00 de hoy. Después de las 16:00 o en fin
 * de semana: a las 5:00 del siguiente día hábil.
 */
export function proximoEnvio(ahoraIso: string, zonaProveedor?: string): string {
  const base = Date.parse(ahoraIso);
  if (!Number.isFinite(base)) throw new Error(`fecha inválida: ${ahoraIso}`);
  const tz = zonaValida(zonaProveedor);
  const hoy = partesEn(base, tz);
  if (esHabil(hoy.dia)) {
    if (hoy.h >= VENTANA_ENVIO.desde && hoy.h < VENTANA_ENVIO.hasta) return new Date(base).toISOString();
    if (hoy.h < VENTANA_ENVIO.desde) return instanteLocal(hoy.y, hoy.m, hoy.d, HORA_ENVIO, tz);
  }
  for (let d = 1; d <= 7; d++) {
    const p = partesEn(base + d * 86_400_000, tz);
    if (!esHabil(p.dia)) continue;
    return instanteLocal(p.y, p.m, p.d, HORA_ENVIO, tz);
  }
  throw new Error("sin día hábil en la semana");
}

/** REQ-10693: ¿el instante cae dentro del horario del proveedor (5:00–16:00, lunes a viernes)? */
export function enHorarioProveedor(iso: string, zonaProveedor?: string): boolean {
  const p = partesEn(Date.parse(iso), zonaValida(zonaProveedor));
  return esHabil(p.dia) && p.h >= VENTANA_ENVIO.desde && p.h < VENTANA_ENVIO.hasta;
}

export interface BorradorProgramado { id: string; enlace: string; enviarEn: string }

/** REQ-10693: motivo con el que la revisión se detiene cuando no hay buzón de borradores (nunca se manda directo). */
export const SIN_BUZON = "sin buzón de borradores programados (REQ-10693): no se envía directo";
