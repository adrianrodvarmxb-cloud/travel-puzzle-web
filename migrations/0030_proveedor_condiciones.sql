-- REQ-3355, REQ-3520 (PO, 13 nov 2026, «ok A»): condiciones de cada proveedor para que Mila las vea (REQ-3358: solo
-- condiciones, nunca netos ni márgenes). Solo agrega columnas con valor por omisión: no cambia ni borra datos.
-- Se aplica con OK del PO, sola en su deploy (REQ-3522). Plan de regreso: las columnas quedan vacías y nadie las lee
-- mientras AGENTE_API_ENABLED siga apagada; SQLite/D1 no necesita quitarlas.
ALTER TABLE "Proveedor" ADD COLUMN "cancelacion" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Proveedor" ADD COLUMN "cambios" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Proveedor" ADD COLUMN "pagos" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Proveedor" ADD COLUMN "operacion" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Proveedor" ADD COLUMN "condicionesFuente" TEXT NOT NULL DEFAULT '';  -- de qué acuerdo o página salen
ALTER TABLE "Proveedor" ADD COLUMN "condicionesFecha" TEXT;                      -- AAAA-MM-DD de la última carga
