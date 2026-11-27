// I/O · REQ-10693: la bandeja de borradores. `dejarBorrador` la usa la revisión diaria en vez de enviar; `enviarVencidos`
// corre en el cron de cada hora y manda por Resend solo lo que sigue «programado» y ya llegó a su hora. store, correo y
// reloj llegan por parámetro.
import type { Correo } from "./lib/correo";
import { aplicarAccion, avisoInterno, clasificar, enlaceBorrador, type Accion, type Borrador, type ModoBorradores } from "./lib/borradores";
import type { BorradoresRepo } from "./borrador-repo";

export interface DepsBorradores {
  repo: BorradoresRepo;
  /** Envío real (Resend). Solo lo llama `enviarVencidos`. */
  enviar: (c: Correo) => Promise<string>;
  hoy: string;
  siteUrl: string;
  nuevoId?: () => string;
  /** Aviso interno al PO (correo a adrianrodvar@ con copia a Claudia, o WhatsApp por el puente). */
  avisarPO?: (asunto: string, texto: string) => Promise<void>;
  log?: (m: string) => void;
  /** REQ-10762: «manual» (nada sale solo) o «auto». Sin esto, «auto» (comportamiento de REQ-10693). */
  modo?: ModoBorradores;
  /** REQ-10762: en modo manual, el único borrador que sale: el que el PO mandó con «Enviar ya». */
  soloId?: string;
}

/** REQ-10693: deja el correo como borrador programado y le avisa al PO con el enlace. Nunca envía. */
export async function dejarBorrador(c: Correo, p: { proveedorId: string; proveedor: string; tipo: string; enviarEn: string; zonaHoraria?: string }, deps: DepsBorradores): Promise<{ id: string; enlace: string; enviarEn: string }> {
  const id = (deps.nuevoId ?? (() => crypto.randomUUID()))();
  const b = await deps.repo.crear({ id, proveedorId: p.proveedorId, tipo: p.tipo, para: c.to, cc: c.cc, asunto: c.subject, texto: c.text, inReplyTo: c.inReplyTo ?? null, enviarEn: p.enviarEn }, deps.hoy);
  const enlace = enlaceBorrador(deps.siteUrl, b.id);
  const aviso = avisoInterno(b, p.proveedor, enlace, p.zonaHoraria, deps.modo ?? "auto");
  await deps.avisarPO?.(aviso.asunto, aviso.texto).catch((e) => deps.log?.(`[borradores] aviso al PO: ${(e as Error).message}`));
  return { id: b.id, enlace, enviarEn: b.enviarEn };
}

/**
 * REQ-10693: manda lo que llegó a su hora; lo cancelado no sale; lo vencido hace más de 6 h se marca y no sale solo.
 * REQ-10762: en modo manual solo sale `deps.soloId` (el «Enviar ya» del PO); el cron no manda ni marca nada.
 */
export async function enviarVencidos(deps: DepsBorradores, remitente: string): Promise<{ enviados: number; vencidos: number; errores: string[]; esperan: number }> {
  const lista = await deps.repo.porEstado(["programado"]);
  const { enviar, vencidos, esperan } = clasificar(lista, Date.parse(deps.hoy), { modo: deps.modo ?? "auto", soloId: deps.soloId });
  const r = { enviados: 0, vencidos: vencidos.length, errores: [] as string[], esperan: esperan.length };
  for (const b of enviar) {
    try {
      const mensajeId = await deps.enviar({ from: remitente, to: b.para, cc: b.cc, subject: b.asunto, text: b.texto, inReplyTo: b.inReplyTo ?? undefined });
      await deps.repo.guardar(b.id, { estado: "enviado", mensajeId, enviadoEn: deps.hoy, updatedAt: deps.hoy });
      r.enviados++;
    } catch (e) {
      const nota = (e as Error).message.slice(0, 300);
      await deps.repo.guardar(b.id, { estado: "error", nota, updatedAt: deps.hoy });
      r.errores.push(`${b.id}: ${nota}`);
    }
  }
  for (const b of vencidos) await deps.repo.guardar(b.id, { estado: "vencido", nota: "venció hace más de 6 h sin enviarse (el cron no corrió); revísalo", updatedAt: deps.hoy });
  return r;
}

/** REQ-10693: el PO cancela, edita o manda ya un borrador desde /admin/borradores. */
export async function accionDelPO(id: string, a: Accion, deps: Pick<DepsBorradores, "repo" | "hoy">): Promise<{ ok: true; borrador: Borrador } | { ok: false; motivo: string }> {
  const b = await deps.repo.porId(id);
  if (!b) return { ok: false, motivo: "no existe" };
  const r = aplicarAccion(b, a, deps.hoy);
  if (!r.ok) return r;
  await deps.repo.guardar(id, r.cambios);
  return { ok: true, borrador: { ...b, ...r.cambios } };
}
