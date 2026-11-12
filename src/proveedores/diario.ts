// I/O · REQ-1293, REQ-1294: la revisión diaria de Mila (recordatorios, «sin respuesta», reintentos y la tanda de nuevos).
import { aplicarEvento } from "./lib/etapas";
import { siguienteAccion } from "./lib/seguimiento";
import { tandaDelDia } from "./lib/tandas";
import { armarCorreo, rellenar, type Correo } from "./lib/correo";
import { plantilla, type TipoCorreo } from "./lib/plantillas";
import type { ProveedorFila, ProveedoresRepo } from "./repository";
import { numerar } from "./lib/integracion";
import { pedidosDeAlta, type TipoProveedor } from "./lib/checklist";
import { puedeEscribir } from "./lib/choques";
import { enVentana, fechaLocal } from "./lib/horario";

export interface DepsDiario { repo: ProveedoresRepo; enviar: (c: Correo) => Promise<string>; hoy: string; log?: (m: string) => void }
// REQ-1297: «porPresentar» = los proveedores de la tanda del día cuyo primer correo manda Adri (Mila no lo envía).
// REQ-1576: «detenidos» = proveedores a los que tocaba escribir y no se escribió, con el motivo.
export interface Reporte { enviados: number; sinRespuesta: number; errores: string[]; porPresentar: string[]; detenidos: string[] }

const fechaCorta = (iso?: string) => (iso ? iso.slice(0, 10) : undefined);

async function mandar(p: ProveedorFila, tipo: TipoCorreo, deps: DepsDiario): Promise<boolean> {
  // REQ-1572: solo lo que falta de la lista de alta.
  const clase = (["dmc", "plataforma", "api"].includes(p.tipo) ? p.tipo : "dmc") as TipoProveedor;
  const datos = { pedidos: numerar(pedidosDeAlta({ tipo: clase, integracion: p.integracion, cobro: p.cobro, idioma: p.idioma, recibidos: p.checklist ?? [] })),
    pendientes: undefined as string | undefined, contacto: p.contacto, proveedor: p.nombre, destinos: p.destinos, asunto: p.ultimoAsunto ?? `Travel Puzzle · ${p.nombre}`, fecha: fechaCorta(p.ultimoNuestro), tema: p.destinos ? `trabajar juntos en ${p.destinos}` : undefined };
  // REQ-1572: el recordatorio recuerda lo que falta (sin lista, la línea no sale).
  if (tipo === "recordatorio" && datos.pedidos) datos.pendientes = `${p.idioma === "en" ? "What we still need:" : "Lo que nos falta:"}\n${datos.pedidos}`;
  const t = plantilla(tipo, p.idioma, datos);
  const correo = armarCorreo({ para: p.correos.filter((x) => !p.correosInvalidos.map((y) => y.toLowerCase()).includes(x.toLowerCase())), // REQ-1565
    asunto: rellenar(t.asunto, datos), cuerpo: rellenar(t.cuerpo, datos), idioma: p.idioma, inReplyTo: tipo === "recordatorio" ? p.hiloId ?? undefined : undefined });
  if (!correo) return false;
  const id = await deps.enviar(correo);
  await deps.repo.registrarMensaje({ id, proveedorId: p.id, direccion: "salida", asunto: correo.subject, resumen: correo.text, fecha: deps.hoy, tipo });
  const s = aplicarEvento(p, "enviamos", deps.hoy, tipo === "recordatorio");
  await deps.repo.guardarEstado(p.id, { ...s, ultimoAsunto: correo.subject }, deps.hoy);
  return true;
}

export async function revisionDiaria(deps: DepsDiario): Promise<Reporte> {
  const r: Reporte = { enviados: 0, sinRespuesta: 0, errores: [], porPresentar: [], detenidos: [] };
  const todos = (await deps.repo.todos()).filter((p) => !p.bloqueado && p.correos.some((x) => !p.correosInvalidos.includes(x))); // REQ-1565
  const intentar = async (p: ProveedorFila, tipo: TipoCorreo) => {
    const permiso = puedeEscribir({ bloqueos: p.bloqueos ?? {}, hiloId: p.hiloId }); // REQ-1576
    if (!permiso.ok) { r.detenidos.push(`${p.id}: ${permiso.motivo}`); return; }
    try { if (await mandar(p, tipo, deps)) r.enviados++; } catch (e) { r.errores.push(`${p.id}: ${(e as Error).message}`); }
  };
  for (const p of todos) {
    // REQ-1566: solo en horario hábil del proveedor, y los días hábiles con su calendario.
    if (!enVentana(deps.hoy, p.zonaHoraria)) continue;
    const local = { ...p, ultimoNuestro: p.ultimoNuestro && fechaLocal(p.ultimoNuestro, p.zonaHoraria), ultimoSuyo: p.ultimoSuyo && fechaLocal(p.ultimoSuyo, p.zonaHoraria),
      sinRespuestaDesde: p.sinRespuestaDesde && fechaLocal(p.sinRespuestaDesde, p.zonaHoraria) };
    const a = siguienteAccion(local, fechaLocal(deps.hoy, p.zonaHoraria));
    if (a === "recordatorio") await intentar(p, "recordatorio");
    else if (a === "reintento") await intentar(p, "reintento");
    else if (a === "marcar_sin_respuesta") { await deps.repo.guardarEstado(p.id, aplicarEvento(p, "sin_respuesta", deps.hoy), deps.hoy); r.sinRespuesta++; }
  }
  r.porPresentar = tandaDelDia(todos);
  return r;
}
