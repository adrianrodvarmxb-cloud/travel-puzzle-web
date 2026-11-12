// I/O · REQ-1672: anexo de tarifas y avisos de cambio en D1 (migrations/0026). Recibe la base por parámetro.
import type { Db } from "./repository";
import type { EstadoAviso, Moneda, RenglonAnexo } from "./lib/tarifas";
import type { MarkupKind } from "../trips/lib/markup";

export interface Aviso {
  id: string; numero: number; proveedorId: string; mensajeId: string; asunto: string; texto: string; tarifaId: string | null;
  netoAntes: number | null; netoNuevo: number | null; moneda: Moneda | null; desde: string | null; estado: EstadoAviso; nota: string;
  confirmadoPor: string | null; confirmadoEn: string | null; createdAt: string;
}
export type Renglon = RenglonAnexo & { proveedorId: string; publicado: number | null; desde: string };

export function createTarifasRepo(db: Db) {
  return {
    async anexo(proveedorId: string): Promise<Renglon[]> {
      return db.all<Renglon>(`SELECT * FROM "ProveedorTarifa" WHERE "proveedorId"=?`, proveedorId);
    },
    async renglon(id: string): Promise<Renglon | null> {
      return (await db.all<Renglon>(`SELECT * FROM "ProveedorTarifa" WHERE "id"=?`, id))[0] ?? null;
    },
    async actualizarRenglon(id: string, neto: number, desde: string, ahora: string) {
      await db.run(`UPDATE "ProveedorTarifa" SET "neto"=?, "desde"=?, "updatedAt"=? WHERE "id"=?`, neto, desde, ahora, id);
    },
    async crearAviso(a: Omit<Aviso, "numero" | "confirmadoPor" | "confirmadoEn" | "nota">, ahora: string): Promise<Aviso> {
      const n = ((await db.all<{ n: number | null }>(`SELECT MAX("numero") AS n FROM "TarifaAviso"`))[0]?.n ?? 0) + 1;
      await db.run(`INSERT INTO "TarifaAviso" ("id","numero","proveedorId","mensajeId","asunto","texto","tarifaId","netoAntes","netoNuevo","moneda","desde","estado","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        a.id, n, a.proveedorId, a.mensajeId, a.asunto, a.texto.slice(0, 2000), a.tarifaId, a.netoAntes, a.netoNuevo, a.moneda, a.desde, a.estado, ahora, ahora);
      return { ...a, numero: n, nota: "", confirmadoPor: null, confirmadoEn: null };
    },
    async avisos(estados: EstadoAviso[]): Promise<Aviso[]> {
      return db.all<Aviso>(`SELECT * FROM "TarifaAviso" WHERE "estado" IN (${estados.map(() => "?").join(",")}) ORDER BY "numero"`, ...estados);
    },
    async aviso(idONumero: string | number): Promise<Aviso | null> {
      return (await db.all<Aviso>(`SELECT * FROM "TarifaAviso" WHERE "id"=? OR "numero"=?`, String(idONumero), Number(idONumero) || -1))[0] ?? null;
    },
    async guardarAviso(id: string, c: Partial<Pick<Aviso, "estado" | "desde" | "tarifaId" | "nota" | "confirmadoPor" | "confirmadoEn" | "netoAntes">>, ahora: string) {
      const campos = Object.keys(c) as (keyof typeof c)[];
      if (!campos.length) return;
      await db.run(`UPDATE "TarifaAviso" SET ${campos.map((k) => `"${k}"=?`).join(", ")}, "updatedAt"=? WHERE "id"=?`, ...campos.map((k) => c[k] ?? null), ahora, id);
    },
  };
}
export type TarifasRepo = ReturnType<typeof createTarifasRepo>;
export type { MarkupKind };
