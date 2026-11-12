// Puro · REQ-1293 (P4 = A): recordatorios a los 5 y 10 días hábiles; sin respuesta, reintento a los 2 meses.
import type { EstadoProveedor } from "./etapas";

export type Accion = "recordatorio" | "marcar_sin_respuesta" | "reintento" | null;

const DIA = 86_400_000;
const soloFecha = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);

// REQ-1293: días hábiles (lunes a viernes) entre dos fechas, sin contar el día de inicio.
export function diasHabiles(desdeIso: string, hastaIso: string): number {
  let n = 0;
  for (let t = soloFecha(desdeIso) + DIA; t <= soloFecha(hastaIso); t += DIA) {
    const d = new Date(t).getUTCDay();
    if (d !== 0 && d !== 6) n++;
  }
  return n;
}

const sumarMeses = (iso: string, m: number) => { const d = new Date(soloFecha(iso)); d.setUTCMonth(d.getUTCMonth() + m); return d.getTime(); };

// REQ-1293: qué le toca hoy a un proveedor.
export function siguienteAccion(s: EstadoProveedor, hoyIso: string): Accion {
  if (s.etapa === "sin_respuesta") return s.sinRespuestaDesde && soloFecha(hoyIso) >= sumarMeses(s.sinRespuestaDesde, 2) ? "reintento" : null;
  if (s.etapa !== "contactado" || !s.ultimoNuestro) return null;
  if (s.ultimoSuyo && s.ultimoSuyo >= s.ultimoNuestro) return null;
  const dias = diasHabiles(s.ultimoNuestro, hoyIso);
  if (s.recordatorios >= 2) return dias >= 5 ? "marcar_sin_respuesta" : null;
  return dias >= 5 ? "recordatorio" : null; // 5 días hábiles después de cada envío: día 5 y día 10
}
