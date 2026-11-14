-- REQ-10649 (plan REQ-3457, PO 14 nov 2026): preguntas abiertas por proveedor para los recordatorios de Mila.
-- Solo agrega una columna a "Proveedor" (la 0027 ya está aplicada, por eso no se toca). Sin la bandera
-- PROVEEDORES_MILA_ON nadie la lee. Formato JSON: [{ id, tema, es, en, req, desde, cerrada }] (src/proveedores/lib/preguntas.ts).
-- Se aplica con OK del PO, sola en su deploy, con punto de regreso de D1. Plan de regreso: la columna puede quedarse vacía ('[]').

ALTER TABLE "Proveedor" ADD COLUMN "preguntas" TEXT NOT NULL DEFAULT '[]';
