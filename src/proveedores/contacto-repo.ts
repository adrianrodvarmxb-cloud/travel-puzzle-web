// I/O · REQ-3430: lista privada compartida entre Mila y la revisión cada 6 h (migrations/0027, tabla ProveedorContacto). Recibe la base por parámetro.
import type { Db } from "./repository";
import type { Agente, Apartado } from "./lib/consulta";

export function createContactoRepo(db: Db) {
  return {
    async listar(proveedorId: string): Promise<Apartado[]> {
      return db.all<Apartado>(`SELECT "proveedorId", "agente", "motivo", "desde", "hasta", "nota" FROM "ProveedorContacto" WHERE "proveedorId"=?`, proveedorId);
    },
    async apartar(a: Apartado): Promise<void> {
      await db.run(`INSERT INTO "ProveedorContacto" ("proveedorId", "agente", "motivo", "desde", "hasta", "nota") VALUES (?, ?, ?, ?, ?, ?)`,
        a.proveedorId, a.agente, a.motivo, a.desde, a.hasta, a.nota ?? "");
    },
    // Cierra lo vivo de un agente con ese proveedor (p. ej. ya envió o soltó el borrador).
    async liberar(proveedorId: string, agente: Agente, ahora: string): Promise<void> {
      await db.run(`UPDATE "ProveedorContacto" SET "hasta"=? WHERE "proveedorId"=? AND "agente"=? AND "hasta">?`, ahora, proveedorId, agente, ahora);
    },
  };
}
export type ContactoRepo = ReturnType<typeof createContactoRepo>;
