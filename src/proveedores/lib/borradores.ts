// Puro · REQ-10693: bandeja de borradores programados a proveedores (la mitad que decide; la I/O vive en borrador-repo.ts
// y borradores.ts). Un borrador sale solo a su hora si sigue «programado»; el PO lo ve, edita o cancela antes.
export type EstadoBorrador = "programado" | "enviado" | "cancelado" | "vencido" | "error";

export interface Borrador {
  id: string; proveedorId: string; tipo: string; para: string[]; cc: string[]; asunto: string; texto: string;
  inReplyTo: string | null; enviarEn: string; estado: EstadoBorrador; mensajeId: string | null; nota: string;
  editadoPor: string | null; enviadoEn: string | null; createdAt: string; updatedAt: string;
}

/** Un borrador vencido hace más de esto ya no sale solo: se marca «vencido» y se avisa (el PO decide). */
export const VENCIDO_MAX_MS = 6 * 60 * 60_000;

/** REQ-10693: enlace que recibe el PO (panel del sitio, solo ADMIN). */
export const enlaceBorrador = (siteUrl: string, id: string) => `${siteUrl.replace(/\/+$/, "")}/admin/borradores#${encodeURIComponent(id)}`;

/** REQ-10762 (PO, 17-11-2026): «manual» = nada sale solo, el PO manda cada borrador con «Enviar ya»; «auto» = REQ-10693. */
export type ModoBorradores = "manual" | "auto";
export const modoBorradores = (env: Record<string, string | undefined>): ModoBorradores => (env.PROVEEDORES_BORRADORES_MODO === "auto" ? "auto" : "manual");

/** REQ-10762: envíos hechos por el PO desde el panel; después de 3 se pasa a «auto» (en su propio PR, con aviso). */
export const ENVIOS_MANUALES_PARA_AUTO = 3;
export const enviosManuales = (lista: readonly Pick<Borrador, "estado" | "editadoPor">[]): number => lista.filter((b) => b.estado === "enviado" && b.editadoPor === "PO (panel)").length;

/**
 * REQ-10693: qué toca mandar ahora, qué venció y qué sigue esperando. No muta la lista.
 * REQ-10762: en modo manual solo sale `soloId` (el que el PO mandó); sin `soloId`, nada sale y nada vence.
 */
export function clasificar(lista: readonly Borrador[], ahoraMs: number, o: { modo?: ModoBorradores; soloId?: string } = {}): { enviar: Borrador[]; vencidos: Borrador[]; esperan: Borrador[] } {
  const enviar: Borrador[] = [], vencidos: Borrador[] = [], esperan: Borrador[] = [];
  for (const b of lista) {
    if (b.estado !== "programado") continue;
    if (o.modo === "manual") { if (o.soloId && b.id === o.soloId) enviar.push(b); else esperan.push(b); continue; }
    const t = Date.parse(b.enviarEn);
    if (!Number.isFinite(t) || t > ahoraMs) esperan.push(b);
    else if (ahoraMs - t <= VENCIDO_MAX_MS) enviar.push(b);
    else vencidos.push(b);
  }
  return { enviar, vencidos, esperan };
}

export type Accion = { accion: "cancelar"; motivo?: string } | { accion: "enviar_ahora" } | { accion: "editar"; asunto?: string; texto?: string; enviarEn?: string };

/** REQ-10693: lo que el PO puede hacer con un borrador; solo sobre uno «programado». */
export function aplicarAccion(b: Borrador, a: Accion, ahoraIso: string, quien = "PO (panel)"): { ok: true; cambios: Partial<Borrador> } | { ok: false; motivo: string } {
  if (b.estado !== "programado") return { ok: false, motivo: `el borrador ya está ${b.estado}` };
  if (a.accion === "cancelar") return { ok: true, cambios: { estado: "cancelado", nota: (a.motivo ?? "cancelado por el PO").slice(0, 300), editadoPor: quien, updatedAt: ahoraIso } };
  if (a.accion === "enviar_ahora") return { ok: true, cambios: { enviarEn: ahoraIso, editadoPor: quien, updatedAt: ahoraIso } };
  const cambios: Partial<Borrador> = { editadoPor: quien, updatedAt: ahoraIso };
  if (a.asunto !== undefined) { const s = a.asunto.trim(); if (!s || s.length > 300) return { ok: false, motivo: "asunto vacío o muy largo" }; cambios.asunto = s; }
  if (a.texto !== undefined) { const t = a.texto.trim(); if (!t || t.length > 20_000) return { ok: false, motivo: "texto vacío o muy largo" }; cambios.texto = t; }
  if (a.enviarEn !== undefined) {
    const t = Date.parse(a.enviarEn);
    if (!Number.isFinite(t) || t < Date.parse(ahoraIso) - 5 * 60_000 || t - Date.parse(ahoraIso) > 30 * 86_400_000) return { ok: false, motivo: "hora inválida (entre ahora y 30 días)" };
    cambios.enviarEn = new Date(t).toISOString();
  }
  return { ok: true, cambios };
}

/** REQ-10693: el aviso interno al PO (correo o WhatsApp) con el enlace. */
export function avisoInterno(b: Pick<Borrador, "tipo" | "asunto" | "enviarEn">, proveedor: string, enlace: string, zonaProveedor?: string, modo: ModoBorradores = "auto"): { asunto: string; texto: string } {
  const fmt = (tz: string) => { try { return new Intl.DateTimeFormat("es-MX", { timeZone: tz, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(b.enviarEn)); } catch { return b.enviarEn; } };
  const mx = fmt("America/Mexico_City");
  const suya = zonaProveedor && zonaProveedor !== "America/Mexico_City" ? ` (${fmt(zonaProveedor)} hora del proveedor)` : "";
  if (modo === "manual") {
    // REQ-10762: en modo manual nada sale solo; el PO lo manda con «Enviar ya».
    return {
      asunto: `Borrador listo para ${proveedor}: ${b.asunto}`,
      texto: `Mila dejó listo un ${b.tipo} para ${proveedor}: «${b.asunto}».\nNo sale hasta que lo mandes desde el panel (hora sugerida: ${mx} CDMX${suya}).\nVer, editar, mandar o cancelar: ${enlace}`,
    };
  }
  return {
    asunto: `Borrador programado a ${proveedor}: ${b.asunto}`,
    texto: `Mila dejó listo un ${b.tipo} para ${proveedor}: «${b.asunto}».\nSale el ${mx} (CDMX)${suya} si no lo cancelas.\nVer, editar o cancelar: ${enlace}`,
  };
}
