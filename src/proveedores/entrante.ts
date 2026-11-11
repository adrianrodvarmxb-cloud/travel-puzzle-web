// I/O · REQ-1291, REQ-1296: procesa un correo que llega a comercial@ (copia del reenvío de cPanel).
import { aplicarEvento } from "./lib/etapas";
import { proveedorDeCorreo } from "./lib/identificar";
import { rutaDocumento } from "./lib/documentos";
import { tipoEntrante, direccionesRebotadas } from "./lib/clasificar";
import type { ProveedoresRepo } from "./repository";

export interface CorreoEntrante {
  messageId: string; fecha: string; de: string; para: string[]; cc: string[]; asunto: string; texto: string;
  adjuntos: { nombre: string; tipo: string; contenido: Uint8Array }[];
  encabezados?: Record<string, string>; // REQ-1565
}

export interface DepsEntrante { repo: ProveedoresRepo; subir: (ruta: string, contenido: Uint8Array, tipo: string) => Promise<void>; log?: (m: string) => void }

export type ResultadoEntrante = { estado: "duplicado" | "sin_proveedor" | "nuestro" }
  | { estado: "automatica"; proveedorId: string } | { estado: "rebote"; proveedorId: string; correos: string[] } | { estado: "registrado"; proveedorId: string; documentos: number; fallidos: number };

const INTERNO = /@(.+\.)?travelpuzzle\.com(\.mx)?$/i;

export async function procesarEntrante(c: CorreoEntrante, deps: DepsEntrante): Promise<ResultadoEntrante> {
  if (await deps.repo.yaRegistrado(c.messageId)) return { estado: "duplicado" };
  const proveedores = await deps.repo.todos();
  const tipo = tipoEntrante(c);
  // REQ-1565: un rebote marca la dirección como inválida y no cambia la etapa.
  if (tipo === "rebote") {
    for (const p of proveedores) {
      const malas = direccionesRebotadas(c.texto, p.correos);
      if (!malas.length) continue;
      const invalidos = [...new Set([...p.correosInvalidos, ...malas])];
      await deps.repo.marcarInvalidos(p.id, invalidos, c.fecha);
      await deps.repo.registrarMensaje({ id: c.messageId, proveedorId: p.id, direccion: "entrada", asunto: c.asunto, resumen: c.texto, fecha: c.fecha, tipo: "rebote" });
      deps.log?.(`[proveedores] rebotó ${malas.join(", ")} (${p.id})`);
      return { estado: "rebote", proveedorId: p.id, correos: malas };
    }
    return { estado: "sin_proveedor" };
  }
  const id = proveedorDeCorreo([c.de, ...c.para, ...c.cc], proveedores);
  if (!id) return { estado: "sin_proveedor" };
  const p = proveedores.find((x) => x.id === id)!;
  const deNosotros = INTERNO.test(c.de);
  // REQ-1565: una respuesta automática queda en el historial, pero no cuenta como respuesta.
  if (!deNosotros && tipo === "automatica") {
    await deps.repo.registrarMensaje({ id: c.messageId, proveedorId: id, direccion: "entrada", asunto: c.asunto, resumen: c.texto, fecha: c.fecha, tipo: "automatica" });
    return { estado: "automatica", proveedorId: id };
  }
  await deps.repo.registrarMensaje({ id: c.messageId, proveedorId: id, direccion: deNosotros ? "salida" : "entrada", asunto: c.asunto, resumen: c.texto, fecha: c.fecha, tipo: deNosotros ? "manual" : "respuesta" });
  const s = aplicarEvento(p, deNosotros ? "enviamos" : "contestaron", c.fecha);
  await deps.repo.guardarEstado(id, { ...s, ultimoAsunto: c.asunto, hiloId: c.messageId }, c.fecha);
  if (deNosotros) return { estado: "nuestro" };
  let documentos = 0, fallidos = 0;
  for (const a of c.adjuntos) {
    const ruta = rutaDocumento(id, c.fecha, a.nombre);
    if (!ruta) continue;
    try {
      await deps.subir(ruta, a.contenido, a.tipo);
      await deps.repo.registrarDocumento({ id: ruta, proveedorId: id, mensajeId: c.messageId, nombre: a.nombre, bytes: a.contenido.byteLength, fecha: c.fecha });
      documentos++;
    } catch (e) { fallidos++; deps.log?.(`[proveedores] no se subió ${a.nombre}: ${(e as Error).message}`); }
  }
  return { estado: "registrado", proveedorId: id, documentos, fallidos };
}
