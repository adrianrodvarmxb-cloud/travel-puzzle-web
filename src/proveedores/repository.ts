// I/O · Proveedores en D1 (migrations/0027_proveedores_mila.sql). Recibe la base por parámetro.
import type { EstadoProveedor, Etapa } from "./lib/etapas";
import type { Cobro, Integracion } from "./lib/integracion";
import type { Bloqueos } from "./lib/choques";

export interface Db {
  all<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  run(sql: string, ...params: unknown[]): Promise<void>;
}

export interface ProveedorFila extends EstadoProveedor {
  id: string; nombre: string; tipo: string; publicado: boolean; bloqueado: boolean; agencyId: string | null;
  canal: string; idioma: "es" | "en"; contacto: string; correos: string[]; dominios: string[]; destinos: string;
  ultimoAsunto: string | null; hiloId: string | null; notas: string;
  integracion: Integracion; cobro: Cobro; tiempoRespuesta: string; // REQ-1298, REQ-1299
  correosInvalidos: string[]; // REQ-1565
  zonaHoraria: string; // REQ-1566
  checklist: string[]; // REQ-1665
  bloqueos: Bloqueos; // REQ-1669
}

type Cruda = Omit<ProveedorFila, "publicado" | "bloqueado" | "correos" | "dominios" | "etapa" | "correosInvalidos" | "checklist" | "bloqueos"> & {
  publicado: number; bloqueado: number; correos: string; dominios: string; etapa: Etapa; correosInvalidos: string; checklist?: string; bloqueos?: string;
};

const parse = (s: string): string[] => { try { const v = JSON.parse(s); return Array.isArray(v) ? v.map(String) : []; } catch { return []; } };
const objeto = (s?: string): Bloqueos => { try { const v = JSON.parse(s ?? "{}"); return v && typeof v === "object" && !Array.isArray(v) ? v : {}; } catch { return {}; } };
const fila = (r: Cruda): ProveedorFila => ({ ...r, publicado: !!r.publicado, bloqueado: !!r.bloqueado, correos: parse(r.correos), dominios: parse(r.dominios), correosInvalidos: parse(r.correosInvalidos ?? "[]"), checklist: parse(r.checklist ?? "[]"), bloqueos: objeto(r.bloqueos),
  ultimoSuyo: r.ultimoSuyo ?? undefined, ultimoNuestro: r.ultimoNuestro ?? undefined, sinRespuestaDesde: r.sinRespuestaDesde ?? undefined });

export function createProveedoresRepo(db: Db) {
  return {
    async todos(): Promise<ProveedorFila[]> {
      return (await db.all<Cruda>(`SELECT * FROM "Proveedor"`)).map(fila);
    },
    // REQ-1291: guarda etapa, último mensaje de cada lado, recordatorios y el hilo.
    async guardarEstado(id: string, s: EstadoProveedor & { ultimoAsunto?: string | null; hiloId?: string | null }, ahora: string) {
      await db.run(
        `UPDATE "Proveedor" SET "etapa"=?, "ultimoSuyo"=?, "ultimoNuestro"=?, "recordatorios"=?, "sinRespuestaDesde"=?,
          "ultimoAsunto"=COALESCE(?, "ultimoAsunto"), "hiloId"=COALESCE(?, "hiloId"), "updatedAt"=? WHERE "id"=?`,
        s.etapa, s.ultimoSuyo ?? null, s.ultimoNuestro ?? null, s.recordatorios, s.sinRespuestaDesde ?? null,
        s.ultimoAsunto ?? null, s.hiloId ?? null, ahora, id,
      );
    },
    async registrarMensaje(m: { id: string; proveedorId: string; direccion: "entrada" | "salida"; asunto: string; resumen: string; fecha: string; tipo: string }) {
      await db.run(`INSERT OR IGNORE INTO "ProveedorMensaje" ("id","proveedorId","direccion","asunto","resumen","fecha","tipo") VALUES (?,?,?,?,?,?,?)`,
        m.id, m.proveedorId, m.direccion, m.asunto, m.resumen.slice(0, 500), m.fecha, m.tipo);
    },
    // REQ-1568: lo de la última semana, con el nombre del proveedor.
    async mensajesDesde(fecha: string) {
      return db.all<{ proveedor: string; direccion: "entrada" | "salida"; tipo: string; resumen: string; fecha: string }>(
        `SELECT p."nombre" AS proveedor, m."direccion", m."tipo", m."resumen", m."fecha" FROM "ProveedorMensaje" m JOIN "Proveedor" p ON p."id" = m."proveedorId" WHERE m."fecha" >= ? ORDER BY m."fecha"`, fecha);
    },
    async documentosDesde(fecha: string) {
      return db.all<{ proveedor: string; nombre: string; fecha: string }>(
        `SELECT p."nombre" AS proveedor, d."nombre", d."fecha" FROM "ProveedorDocumento" d JOIN "Proveedor" p ON p."id" = d."proveedorId" WHERE d."fecha" >= ? ORDER BY d."fecha"`, fecha);
    },
    async yaRegistrado(id: string): Promise<boolean> {
      return (await db.all(`SELECT 1 FROM "ProveedorMensaje" WHERE "id"=? LIMIT 1`, id)).length > 0;
    },
    // REQ-1565: guarda las direcciones que rebotaron; Mila deja de escribirles.
    async marcarInvalidos(id: string, correos: string[], ahora: string) {
      await db.run(`UPDATE "Proveedor" SET "correosInvalidos"=?, "updatedAt"=? WHERE "id"=?`, JSON.stringify(correos), ahora, id);
    },
    // REQ-1665: guarda los puntos de alta recibidos.
    async marcarChecklist(id: string, recibidos: string[], ahora: string) {
      await db.run(`UPDATE "Proveedor" SET "checklist"=?, "updatedAt"=? WHERE "id"=?`, JSON.stringify(recibidos), ahora, id);
    },
    // REQ-1296
    async registrarDocumento(d: { id: string; proveedorId: string; mensajeId: string; nombre: string; bytes: number; fecha: string }) {
      await db.run(`INSERT OR IGNORE INTO "ProveedorDocumento" ("id","proveedorId","mensajeId","nombre","bytes","fecha") VALUES (?,?,?,?,?,?)`,
        d.id, d.proveedorId, d.mensajeId, d.nombre, d.bytes, d.fecha);
    },
  };
}
export type ProveedoresRepo = ReturnType<typeof createProveedoresRepo>;

// I/O · adaptador de Prisma (D1) a la interfaz Db.
export const dbDePrisma = (prisma: { $queryRawUnsafe<T>(q: string, ...v: unknown[]): Promise<T>; $executeRawUnsafe(q: string, ...v: unknown[]): Promise<number> }): Db => ({
  all: <T,>(sql: string, ...p: unknown[]) => prisma.$queryRawUnsafe<T[]>(sql, ...p),
  run: async (sql: string, ...p: unknown[]) => { await prisma.$executeRawUnsafe(sql, ...p); },
});
