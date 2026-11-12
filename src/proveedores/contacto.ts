// I/O · REQ-3430: atiende el acceso protegido de la revisión cada 6 h a la lista compartida. Recibe repo, hora, secreto y bandera por parámetro.
import { z } from "zod";
import { consultar, type Apartado } from "./lib/consulta";

export interface PeticionContacto { autorizacion: string | null; metodo: "GET" | "POST"; proveedor: string | null; cuerpo?: unknown }
export interface DepsContacto {
  repo: { listar: (id: string) => Promise<Apartado[]>; apartar: (a: Apartado) => Promise<void>; liberar: (id: string, agente: "revision6h", ahora: string) => Promise<void> };
  ahora: string; secreto: string; encendido: boolean;
}
export interface Respuesta { status: number; cuerpo: Record<string, unknown> }

// «envio» es solo de Mila; la revisión cada 6 h aparta por borrador, negociación o folio, hasta 14 días.
const Cuerpo = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("apartar"), motivo: z.enum(["borrador", "negociacion", "folio"]), horas: z.number().int().min(1).max(336), nota: z.string().max(200).optional() }),
  z.object({ accion: z.literal("liberar") }),
]);

// REQ-3430
export async function atenderContacto(p: PeticionContacto, d: DepsContacto): Promise<Respuesta> {
  if (!d.secreto || p.autorizacion !== `Bearer ${d.secreto}`) return { status: 401, cuerpo: { error: "Unauthorized" } };
  if (!d.encendido) return { status: 200, cuerpo: { ok: false, motivo: "proveedores_off" } };
  const proveedor = (p.proveedor ?? "").trim();
  if (!/^[a-z0-9-]{1,80}$/.test(proveedor)) return { status: 400, cuerpo: { error: "proveedor inválido" } };
  if (p.metodo === "GET") return { status: 200, cuerpo: consultar(await d.repo.listar(proveedor), "revision6h", proveedor, d.ahora) };
  const c = Cuerpo.safeParse(p.cuerpo);
  if (!c.success) return { status: 400, cuerpo: { error: "cuerpo inválido" } };
  if (c.data.accion === "liberar") { await d.repo.liberar(proveedor, "revision6h", d.ahora); return { status: 200, cuerpo: { ok: true } }; }
  const decision = consultar(await d.repo.listar(proveedor), "revision6h", proveedor, d.ahora);
  if (!decision.ok) return { status: 409, cuerpo: decision };
  const hasta = new Date(Date.parse(d.ahora) + c.data.horas * 3_600_000).toISOString();
  await d.repo.apartar({ proveedorId: proveedor, agente: "revision6h", motivo: c.data.motivo, desde: d.ahora, hasta, ...(c.data.nota && { nota: c.data.nota }) });
  return { status: 200, cuerpo: { ok: true } };
}
