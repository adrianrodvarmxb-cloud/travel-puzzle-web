-- REQ-10693 (regla del PO, 15 nov 2026): ningún correo a un proveedor sale directo. Cada correo queda aquí como borrador
-- con envío programado; el PO lo ve, edita o cancela en /admin/borradores y el cron lo manda por Resend cuando llega su hora.
-- Solo crea una tabla nueva: no toca Proveedor ni ProveedorMensaje. Sin PROVEEDORES_BORRADORES_ON nadie la lee ni escribe.
-- Se aplica con OK del PO, sola en su deploy, con punto de regreso de D1. Plan de regreso: apagar la bandera; la tabla puede quedarse.

CREATE TABLE IF NOT EXISTS "ProveedorBorrador" (
  "id"          TEXT PRIMARY KEY,
  "proveedorId" TEXT NOT NULL REFERENCES "Proveedor"("id"),
  "tipo"        TEXT NOT NULL DEFAULT '',            -- recordatorio | reintento | tarifa | po
  "para"        TEXT NOT NULL DEFAULT '[]',          -- JSON: direcciones
  "cc"          TEXT NOT NULL DEFAULT '[]',          -- JSON: copias (PO y Claudia, REQ-10681)
  "asunto"      TEXT NOT NULL DEFAULT '',
  "texto"       TEXT NOT NULL DEFAULT '',
  "inReplyTo"   TEXT,
  "enviarEn"    TEXT NOT NULL,                       -- ISO UTC: hora programada (proximoEnvio)
  "estado"      TEXT NOT NULL DEFAULT 'programado' CHECK ("estado" IN ('programado','enviado','cancelado','vencido','error')),
  "mensajeId"   TEXT,                                -- id de Resend al enviar
  "nota"        TEXT NOT NULL DEFAULT '',            -- motivo de error o de cancelación
  "editadoPor"  TEXT,
  "enviadoEn"   TEXT,
  "createdAt"   TEXT NOT NULL,
  "updatedAt"   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS "ProveedorBorrador_estado" ON "ProveedorBorrador" ("estado", "enviarEn");
