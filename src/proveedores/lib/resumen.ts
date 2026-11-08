// Puro · REQ-1333: resumen semanal para Adri, Claudia y el 618 112 9459.
import type { Etapa } from "./etapas";

export interface FilaResumen { nombre: string; etapa: Etapa; publicado: boolean; correosInvalidos: string[]; ultimoSuyo?: string }
export interface MensajeResumen { proveedor: string; direccion: "entrada" | "salida"; tipo: string; resumen: string; fecha: string }
export interface DocResumen { proveedor: string; nombre: string; fecha: string }

const NOMBRE_ETAPA: Record<Etapa, string> = {
  por_contactar: "Esperan tu primer correo", contactado: "Contactados", respondio: "Respondieron",
  en_alta: "En alta", activo: "Activos", sin_respuesta: "Sin respuesta",
};
const ORDEN: Etapa[] = ["activo", "en_alta", "respondio", "contactado", "sin_respuesta", "por_contactar"];
const MAX = 3800; // WhatsApp admite 4096; se deja margen

const linea = (t: string, n = 110) => { const x = t.replace(/\s+/g, " ").trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x; };

// REQ-1333: lunes 9:00 de México.
export function esHoraResumen(iso: string): boolean {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: "America/Mexico_City", weekday: "short", hour: "2-digit", hourCycle: "h23" });
  const p = Object.fromEntries(f.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return p.weekday === "Mon" && Number(p.hour) === 9;
}

// REQ-1333: 5 bloques; vacío no sale un bloque; nunca más de lo que admite WhatsApp.
export function textoResumen(p: { proveedores: FilaResumen[]; mensajes: MensajeResumen[]; documentos: DocResumen[]; proximos: string[] }): string {
  const conteo = ORDEN.map((e) => [e, p.proveedores.filter((x) => x.etapa === e).length] as const).filter(([, n]) => n > 0);
  const respuestas = p.mensajes.filter((m) => m.direccion === "entrada" && m.tipo === "respuesta");
  const porPresentar = p.proveedores.filter((x) => x.etapa === "por_contactar").sort((a, b) => Number(b.publicado) - Number(a.publicado));
  const rebotes = p.proveedores.filter((x) => x.correosInvalidos.length);
  const bloques: string[] = ["*Resumen semanal de proveedores · Travel Puzzle*"];
  if (conteo.length) bloques.push(["*1. Avance*", ...conteo.map(([e, n]) => `• ${NOMBRE_ETAPA[e]}: ${n}`)].join("\n"));
  if (respuestas.length) bloques.push(["*2. Esta semana contestaron*", ...respuestas.slice(0, 10).map((m) => `• ${m.proveedor}: ${linea(m.resumen)}`)].join("\n"));
  const tuyo = [
    ...porPresentar.slice(0, 10).map((x) => `• Primer correo pendiente: ${x.nombre}${x.publicado ? " (publicado)" : ""}`),
    ...rebotes.map((x) => `• Rebotó ${x.correosInvalidos.join(", ")} (${x.nombre}): ¿tienes otro contacto?`),
  ];
  if (porPresentar.length > 10) tuyo.push(`• …y ${porPresentar.length - 10} más esperando tu primer correo`);
  if (tuyo.length) bloques.push(["*3. Te toca a ti*", ...tuyo].join("\n"));
  if (p.documentos.length) bloques.push(["*4. Documentos nuevos*", ...p.documentos.slice(0, 10).map((d) => `• ${d.proveedor}: ${d.nombre}`)].join("\n"));
  if (p.proximos.length) bloques.push(["*5. Esta semana sale*", ...p.proximos.slice(0, 10).map((x) => `• ${x}`)].join("\n"));
  const t = bloques.join("\n\n");
  return t.length > MAX ? `${t.slice(0, MAX - 40)}\n\n(…el resto en el panel)` : t;
}
