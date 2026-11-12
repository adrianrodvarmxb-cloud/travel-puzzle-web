// I/O · REQ-1579 (cl. 8.2), REQ-1580, REQ-1581, REQ-1582: cambio de tarifa. Recibe todo por parámetro.
// Sin la confirmación del PO no cambia nada: ni anexo, ni precio, ni respuesta al proveedor.
import { armarCorreo, type Correo } from "./lib/correo";
import { asuntoRespuesta } from "./lib/borrador";
import { codigoAviso, correoEnterados, correoPideFecha, estadoInicial, leerCambio, leerFecha, pareceCambioTarifa, precioNuevo, puedeConfirmar, renglonDelAviso, textoAvisoPO, yaRige, type Moneda } from "./lib/tarifas";
import type { MarkupRates } from "../trips/lib/markup";
import type { ProveedorFila } from "./repository";
import type { Aviso, TarifasRepo } from "./tarifa-repo";

export interface PrecioViaje { moneda: string; adult: number | null }
export interface DepsTarifa {
  repo: TarifasRepo;
  enviar: (c: Correo) => Promise<string>;
  hoy: string;
  /** REQ-1580: WhatsApp al PO por el puente de Mila (REQ-1570); sin puente, el aviso solo queda en /admin/tarifas. */
  avisarPO?: (texto: string) => Promise<void>;
  /** Márgenes por tipo (secreto MARKUP_RATES; no viven en el repo, REQ-038). */
  rates: MarkupRates | null;
  precioOpcion: (tripId: string, optionId: string) => Promise<PrecioViaje | null>;
  guardarPrecio: (tripId: string, optionId: string, adult: number) => Promise<void>;
  nuevoId: () => string;
  log?: (m: string) => void;
}
export interface MensajeProveedor { messageId: string; asunto: string; texto: string }

async function notificar(p: ProveedorFila, a: Aviso, deps: DepsTarifa) {
  if (!deps.avisarPO || a.estado !== "por_confirmar" || !a.netoNuevo || !a.desde) return;
  const r = a.tarifaId ? await deps.repo.renglon(a.tarifaId) : null;
  const actual = r?.tripId && r.optionId ? await deps.precioOpcion(r.tripId, r.optionId) : null;
  const nuevo = r && deps.rates && actual && actual.moneda === (a.moneda ?? r.moneda) ? precioNuevo(a.netoNuevo, r.kind, deps.rates, r.publicado) : null;
  try {
    await deps.avisarPO(textoAvisoPO({ codigo: codigoAviso(a.numero), proveedor: p.nombre, producto: r?.producto ?? "(elige el producto en el panel)", netoAntes: a.netoAntes, netoNuevo: a.netoNuevo, moneda: a.moneda ?? undefined, desde: a.desde, precioAntes: actual?.adult ?? null, precioNuevo: nuevo }));
  } catch (e) { deps.log?.(`[tarifas] no se avisó al PO: ${(e as Error).message}`); }
}

// REQ-1579, REQ-1582: revisa cada respuesta de un proveedor. Devuelve el aviso creado o completado.
export async function revisarTarifa(p: ProveedorFila, m: MensajeProveedor, deps: DepsTarifa): Promise<Aviso | null> {
  const ahora = deps.hoy;
  // REQ-1582: si esperábamos la fecha, la toma de esta respuesta.
  const esperando = (await deps.repo.avisos(["falta_fecha"])).find((a) => a.proveedorId === p.id);
  if (esperando) {
    const desde = leerFecha(m.texto, ahora);
    if (!desde) return null;
    await deps.repo.guardarAviso(esperando.id, { desde, estado: "por_confirmar" }, ahora);
    const a = { ...esperando, desde, estado: "por_confirmar" as const };
    await notificar(p, a, deps);
    return a;
  }
  if (!pareceCambioTarifa(m.asunto, m.texto)) return null;
  const c = leerCambio(m.texto, ahora);
  const anexo = await deps.repo.anexo(p.id);
  const r = renglonDelAviso(`${m.asunto}\n${m.texto}`, anexo);
  const a = await deps.repo.crearAviso({ id: deps.nuevoId(), proveedorId: p.id, mensajeId: m.messageId, asunto: m.asunto, texto: m.texto, tarifaId: r?.id ?? null,
    netoAntes: c.netoAntes ?? r?.neto ?? null, netoNuevo: c.netoNuevo ?? null, moneda: c.moneda ?? r?.moneda ?? null, desde: c.desde ?? null, estado: estadoInicial(c), createdAt: ahora }, ahora);
  if (a.estado === "falta_fecha") {
    const correo = armarCorreo({ para: p.correos.filter((x) => !p.correosInvalidos.includes(x)), asunto: asuntoRespuesta(m.asunto || `Travel Puzzle · ${p.nombre}`), cuerpo: correoPideFecha(p.idioma, p.contacto || undefined), idioma: p.idioma, inReplyTo: m.messageId });
    if (correo) await deps.enviar(correo);
  }
  await notificar(p, a, deps);
  return a;
}

export type Resultado = { ok: true; estado: "confirmado" | "aplicado" } | { ok: false; motivo: string };

// REQ-1579: aplica el precio de un aviso confirmado que ya rige.
async function aplicar(a: Aviso, deps: DepsTarifa): Promise<Resultado> {
  const r = a.tarifaId ? await deps.repo.renglon(a.tarifaId) : null;
  if (!r || !r.tripId || !r.optionId) return { ok: true, estado: "confirmado" }; // sin viaje ligado: solo anexo
  if (!deps.rates) return { ok: false, motivo: "faltan los márgenes (secreto MARKUP_RATES)" };
  const actual = await deps.precioOpcion(r.tripId, r.optionId);
  if (!actual) return { ok: false, motivo: "no encontré el viaje u opción del anexo" };
  if (actual.moneda !== (a.moneda ?? r.moneda)) return { ok: false, motivo: `la tarifa es en ${a.moneda ?? r.moneda} y el viaje en ${actual.moneda}: revísalo a mano` };
  await deps.guardarPrecio(r.tripId, r.optionId, precioNuevo(a.netoNuevo!, r.kind, deps.rates, r.publicado)); // REQ-1581
  await deps.repo.guardarAviso(a.id, { estado: "aplicado" }, deps.hoy);
  return { ok: true, estado: "aplicado" };
}

// REQ-1579, REQ-1580: el comando que detona la confirmación del PO (botón del panel o «confirmo T-12»).
export async function confirmarTarifa(idONumero: string | number, quien: string, deps: DepsTarifa & { proveedor: (id: string) => Promise<ProveedorFila | null> }, tarifaId?: string): Promise<Resultado> {
  const a0 = await deps.repo.aviso(idONumero);
  if (!a0) return { ok: false, motivo: "no existe ese aviso" };
  if (tarifaId && !a0.tarifaId) { await deps.repo.guardarAviso(a0.id, { tarifaId }, deps.hoy); a0.tarifaId = tarifaId; }
  const v = puedeConfirmar({ estado: a0.estado, netoNuevo: a0.netoNuevo, desde: a0.desde, renglonId: a0.tarifaId });
  if (!v.ok) return v;
  const p = await deps.proveedor(a0.proveedorId);
  const r = await deps.repo.renglon(a0.tarifaId!);
  if (!p || !r) return { ok: false, motivo: "no encontré el proveedor o el renglón del anexo" };
  // 1) «Quedamos enterados» en el mismo hilo (cl. 8.2).
  const correo = armarCorreo({ para: p.correos.filter((x) => !p.correosInvalidos.includes(x)), asunto: asuntoRespuesta(a0.asunto || `Travel Puzzle · ${p.nombre}`), idioma: p.idioma, inReplyTo: a0.mensajeId,
    cuerpo: correoEnterados(p.idioma, { contacto: p.contacto || undefined, producto: r.producto, netoNuevo: a0.netoNuevo!, moneda: (a0.moneda ?? r.moneda) as Moneda, desde: a0.desde! }) });
  if (!correo) return { ok: false, motivo: "el proveedor no tiene un correo válido" };
  await deps.enviar(correo);
  // 2) Anexo actualizado.
  await deps.repo.actualizarRenglon(r.id, a0.netoNuevo!, a0.desde!, deps.hoy);
  await deps.repo.guardarAviso(a0.id, { estado: "confirmado", confirmadoPor: quien, confirmadoEn: deps.hoy }, deps.hoy);
  const a = { ...a0, estado: "confirmado" as const };
  // 3) Precio en la página, si ya rige; si no, lo aplica la revisión de cada hora ese día.
  if (!yaRige(a.desde!, deps.hoy)) return { ok: true, estado: "confirmado" };
  const res = await aplicar(a, deps);
  if (!res.ok) await deps.repo.guardarAviso(a.id, { nota: res.motivo }, deps.hoy);
  return res;
}

// REQ-1579: en la revisión de cada hora, aplica los confirmados cuya fecha ya llegó.
export async function aplicarVigentes(deps: DepsTarifa): Promise<{ aplicados: number; errores: string[] }> {
  const out = { aplicados: 0, errores: [] as string[] };
  for (const a of await deps.repo.avisos(["confirmado"])) {
    if (!a.desde || !yaRige(a.desde, deps.hoy)) continue;
    const r = await aplicar(a, deps);
    if (r.ok && r.estado === "aplicado") out.aplicados++;
    else if (!r.ok) { out.errores.push(`${codigoAviso(a.numero)}: ${r.motivo}`); await deps.repo.guardarAviso(a.id, { nota: r.motivo }, deps.hoy); }
  }
  return out;
}

export async function descartarTarifa(idONumero: string | number, deps: Pick<DepsTarifa, "repo" | "hoy">): Promise<Resultado | { ok: true; estado: "descartado" }> {
  const a = await deps.repo.aviso(idONumero);
  if (!a) return { ok: false, motivo: "no existe ese aviso" };
  if (a.estado === "aplicado" || a.estado === "confirmado") return { ok: false, motivo: "ya está confirmado" };
  await deps.repo.guardarAviso(a.id, { estado: "descartado" }, deps.hoy);
  return { ok: true, estado: "descartado" };
}
