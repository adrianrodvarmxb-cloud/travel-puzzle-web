// I/O · REQ-1291, REQ-1296: procesa un correo que llega a comercial@ (copia del reenvío de cPanel).
import { aplicarEvento } from "./lib/etapas";
import { proveedorDeCorreo } from "./lib/identificar";
import { rutaDocumento } from "./lib/documentos";
import type { ProveedoresRepo } from "./repository";

export interface CorreoEntrante {
  messageId: string; fecha: string; de: string; para: string[]; cc: string[]; asunto: string; texto: string;
  adjuntos: { nombre: string; tipo: string; contenido: Uint8Array }[];
}

export interface DepsEntrante { repo: ProveedoresRepo; subir: (ruta: string, contenido: Uint8Array, tipo: string) => Promise<void>; log?: (m: string) => void }

export type ResultadoEntrante = { estado: "duplicado" | "sin_proveedor" | "nuestro" } | { estado: "registrado"; proveedorId: string; documentos: number; fallidos: number };

const INTERNO = /@(.+\.)?travelpuzzle\.com(\.mx)?$/i;

export async function procesarEntrante(c: CorreoEntrante, deps: DepsEntrante): Promise<ResultadoEntrante> {
  if (await deps.repo.yaRegistrado(c.messageId)) return { estado: "duplicado" };
  const proveedores = await deps.repo.todos();
  const id = proveedorDeCorreo([c.de, ...c.para, ...c.cc], proveedores);
  if (!id) return { estado: "sin_proveedor" };
  const p = proveedores.find((x) => x.id === id)!;
  const deNosotros = INTERNO.test(c.de);
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
