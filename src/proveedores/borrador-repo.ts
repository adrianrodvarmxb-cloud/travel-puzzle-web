// I/O · REQ-10693: borradores programados en D1 (migrations/0034_proveedor_borrador.sql). Recibe la base por parámetro.
import type { Db } from "./repository";
import type { Borrador, EstadoBorrador } from "./lib/borradores";

type Cruda = Omit<Borrador, "para" | "cc"> & { para: string; cc: string };
const lista = (s: string): string[] => { try { const v = JSON.parse(s); return Array.isArray(v) ? v.map(String) : []; } catch { return []; } };
const fila = (r: Cruda): Borrador => ({ ...r, para: lista(r.para), cc: lista(r.cc) });

export function createBorradoresRepo(db: Db) {
  return {
    async crear(b: Omit<Borrador, "estado" | "mensajeId" | "nota" | "editadoPor" | "enviadoEn" | "createdAt" | "updatedAt">, ahora: string): Promise<Borrador> {
      await db.run(`INSERT INTO "ProveedorBorrador" ("id","proveedorId","tipo","para","cc","asunto","texto","inReplyTo","enviarEn","estado","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?,?,?,'programado',?,?)`,
        b.id, b.proveedorId, b.tipo, JSON.stringify(b.para), JSON.stringify(b.cc), b.asunto, b.texto, b.inReplyTo, b.enviarEn, ahora, ahora);
      return { ...b, estado: "programado", mensajeId: null, nota: "", editadoPor: null, enviadoEn: null, createdAt: ahora, updatedAt: ahora };
    },
    async porId(id: string): Promise<Borrador | null> {
      return (await db.all<Cruda>(`SELECT * FROM "ProveedorBorrador" WHERE "id"=?`, id)).map(fila)[0] ?? null;
    },
    async porEstado(estados: EstadoBorrador[], limite = 200): Promise<Borrador[]> {
      return (await db.all<Cruda>(`SELECT * FROM "ProveedorBorrador" WHERE "estado" IN (${estados.map(() => "?").join(",")}) ORDER BY "enviarEn" LIMIT ?`, ...estados, limite)).map(fila);
    },
    async guardar(id: string, c: Partial<Pick<Borrador, "estado" | "asunto" | "texto" | "enviarEn" | "mensajeId" | "nota" | "editadoPor" | "enviadoEn" | "updatedAt">>) {
      const campos = Object.keys(c) as (keyof typeof c)[];
      if (!campos.length) return;
      await db.run(`UPDATE "ProveedorBorrador" SET ${campos.map((k) => `"${k}"=?`).join(", ")} WHERE "id"=?`, ...campos.map((k) => c[k] ?? null), id);
    },
  };
}
export type BorradoresRepo = ReturnType<typeof createBorradoresRepo>;
