// I/O · REQ-1293, REQ-1294: la revisión diaria de Mila (recordatorios, «sin respuesta», reintentos y la tanda de nuevos).
// REQ-10693 (PO, 15 nov 2026): Mila NUNCA envía directo. Cada correo queda como borrador con envío programado dentro del
// horario del proveedor (5:00–16:00 de su hora; si ya pasó, 5:00 del siguiente día hábil; `proximoEnvio`) y el PO recibe
// el enlace de Gmail; sin buzón de borradores, el correo se detiene.
import { aplicarEvento } from "./lib/etapas";
import { siguienteAccion } from "./lib/seguimiento";
import { tandaDelDia } from "./lib/tandas";
import { armarCorreo, rellenar, type Correo } from "./lib/correo";
import { plantilla, type TipoCorreo } from "./lib/plantillas";
import type { ProveedorFila, ProveedoresRepo } from "./repository";
import { numerar } from "./lib/integracion";
import { pedidosDeAlta, type TipoProveedor } from "./lib/checklist";
import { puedeEscribir } from "./lib/choques";
import { fechaLocal } from "./lib/horario";
import { apartarEnvio, consultar, type Apartado } from "./lib/consulta";
import { abiertas, textoRecordatorio } from "./lib/preguntas";
import { SIN_BUZON, proximoEnvio, type BorradorProgramado } from "./lib/programacion";

// REQ-3430: lista privada compartida con la revisión cada 6 h (opcional para no romper usos actuales; en producción la arma deps.ts).
export interface ContactoCompartido { listar: (proveedorId: string) => Promise<Apartado[]>; apartar: (a: Apartado) => Promise<void> }
export interface DepsDiario {
  repo: ProveedoresRepo;
  /** REQ-10693: ya no se usa para proveedores (nunca se envía directo); queda por compatibilidad con otros usos. */
  enviar?: (c: Correo) => Promise<string>;
  /** REQ-10693: deja el correo en la bandeja de borradores programados (/admin/borradores) y devuelve su id y enlace; la bandeja avisa al PO. */
  borrador?: (c: Correo, p: { proveedorId: string; proveedor: string; tipo: string; enviarEn: string; zonaHoraria?: string }) => Promise<BorradorProgramado>;
  hoy: string; log?: (m: string) => void; contacto?: ContactoCompartido;
}
// REQ-1297: «porPresentar» = los proveedores de la tanda del día cuyo primer correo manda Adri (Mila no lo envía).
// REQ-1669: «detenidos» = proveedores a los que tocaba escribir y no se escribió, con el motivo.
// REQ-10693: «enviados» cuenta borradores programados (no envíos directos); «borradores» trae su enlace y su hora.
export interface Reporte { enviados: number; sinRespuesta: number; errores: string[]; porPresentar: string[]; detenidos: string[]; borradores: { proveedor: string; tipo: string; enviarEn: string; enlace: string }[] }

const fechaCorta = (iso?: string) => (iso ? iso.slice(0, 10) : undefined);

async function mandar(p: ProveedorFila, tipo: TipoCorreo, deps: DepsDiario, r: Reporte): Promise<boolean> {
  // REQ-1665: solo lo que falta de la lista de alta.
  const clase = (["dmc", "plataforma", "api"].includes(p.tipo) ? p.tipo : "dmc") as TipoProveedor;
  const datos = { pedidos: numerar(pedidosDeAlta({ tipo: clase, integracion: p.integracion, cobro: p.cobro, idioma: p.idioma, recibidos: p.checklist ?? [] })),
    pendientes: undefined as string | undefined, contacto: p.contacto, proveedor: p.nombre, destinos: p.destinos, asunto: p.ultimoAsunto ?? `Travel Puzzle · ${p.nombre}`, fecha: fechaCorta(p.ultimoNuestro), tema: p.destinos ? `trabajar juntos en ${p.destinos}` : undefined };
  // REQ-1665: el recordatorio recuerda lo que falta (sin lista, la línea no sale).
  if (tipo === "recordatorio" && datos.pedidos) datos.pendientes = `${p.idioma === "en" ? "What we still need:" : "Lo que nos falta:"}\n${datos.pedidos}`;
  // REQ-10732 (plan REQ-3457, G1-A): con preguntas abiertas, el recordatorio pide primero lo que desbloquea vender (hasta 5 puntos por tema)
  // y abajo «Para cerrar el alta» en 2 o 3 líneas. Sin preguntas, el texto es el de hoy (REQ-1665).
  if (tipo === "recordatorio" && abiertas(p.preguntas ?? []).length > 0) {
    const en = p.idioma === "en";
    const rec = textoRecordatorio({ preguntas: p.preguntas ?? [], idioma: p.idioma, alta: pedidosDeAlta({ tipo: clase, integracion: p.integracion, cobro: p.cobro, idioma: p.idioma, recibidos: p.checklist ?? [] }) });
    datos.pendientes = [
      en ? "What would help us move forward:" : "Lo que nos ayudaría a avanzar:",
      ...rec.arriba.map((x, i) => `${i + 1}. ${x}`),
      ...(rec.cierre.length ? [en ? "To complete onboarding:" : "Para cerrar el alta:", ...rec.cierre.map((x) => `- ${x}`)] : []),
    ].join("\n");
  }
  const t = plantilla(tipo, p.idioma, datos);
  const correo = armarCorreo({ para: p.correos.filter((x) => !p.correosInvalidos.map((y) => y.toLowerCase()).includes(x.toLowerCase())), // REQ-1565
    asunto: rellenar(t.asunto, datos), cuerpo: rellenar(t.cuerpo, datos), idioma: p.idioma, inReplyTo: tipo === "recordatorio" ? p.hiloId ?? undefined : undefined });
  if (!correo) return false;
  // REQ-10693: nunca directo. Borrador programado al siguiente día hábil a las 5:00 CDMX; el PO recibe el enlace.
  if (!deps.borrador) throw new Error(SIN_BUZON);
  const enviarEn = proximoEnvio(deps.hoy, p.zonaHoraria);
  const b = await deps.borrador(correo, { proveedorId: p.id, proveedor: p.nombre, tipo, enviarEn, zonaHoraria: p.zonaHoraria });
  await deps.repo.registrarMensaje({ id: b.id, proveedorId: p.id, direccion: "salida", asunto: correo.subject, resumen: `[borrador programado ${enviarEn}] ${correo.text}`, fecha: enviarEn, tipo });
  // El seguimiento cuenta desde la hora programada (si el PO lo borra, el siguiente ciclo vuelve a proponerlo).
  const s = aplicarEvento(p, "enviamos", enviarEn, tipo === "recordatorio");
  await deps.repo.guardarEstado(p.id, { ...s, ultimoAsunto: correo.subject }, deps.hoy);
  r.borradores.push({ proveedor: p.nombre, tipo, enviarEn, enlace: b.enlace });
  return true;
}

export async function revisionDiaria(deps: DepsDiario): Promise<Reporte> {
  const r: Reporte = { enviados: 0, sinRespuesta: 0, errores: [], porPresentar: [], detenidos: [], borradores: [] };
  const todos = (await deps.repo.todos()).filter((p) => !p.bloqueado && p.correos.some((x) => !p.correosInvalidos.includes(x))); // REQ-1565
  const intentar = async (p: ProveedorFila, tipo: TipoCorreo) => {
    const permiso = puedeEscribir({ bloqueos: p.bloqueos ?? {}, hiloId: p.hiloId }); // REQ-1669
    if (!permiso.ok) { r.detenidos.push(`${p.id}: ${permiso.motivo}`); return; }
    if (!deps.borrador) { r.detenidos.push(`${p.id}: ${SIN_BUZON}`); return; } // REQ-10693
    // REQ-3430: antes de enviar, consulta a la revisión cada 6 h; si no puede leer la lista, no envía.
    if (deps.contacto) {
      const lista = await deps.contacto.listar(p.id).catch(() => null);
      const d = consultar(lista, "mila", p.id, deps.hoy);
      if (!d.ok) { r.detenidos.push(`${p.id}: ${d.motivo}`); return; }
    }
    try {
      if (await mandar(p, tipo, deps, r)) { r.enviados++; await deps.contacto?.apartar(apartarEnvio("mila", p.id, deps.hoy)); } // REQ-3430
    } catch (e) { r.errores.push(`${p.id}: ${(e as Error).message}`); }
  };
  for (const p of todos) {
    // REQ-1566: los días se cuentan con el calendario del proveedor. REQ-10693: la hora de envío la decide el borrador
    // programado (5:00–16:00 del proveedor; si no, 5:00 del siguiente día hábil), así que la revisión decide a cualquier hora.
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
