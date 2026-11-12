-- REQ-1291, REQ-1295, REQ-1296 (gates docs/gates-proveedores-mila-2026-11.md). Mila administra la relación con proveedores.
-- Solo crea tablas nuevas: no toca Agency, Trip ni Tour. Con PROVEEDORES_MILA_ON="false" nadie las lee ni las escribe.
-- Se aplica con OK del PO, sola en su deploy. Plan de regreso: apagar la bandera; las tablas pueden quedarse vacías.

CREATE TABLE IF NOT EXISTS "Proveedor" (
  "id"                TEXT PRIMARY KEY,            -- slug (destino-colombia)
  "nombre"            TEXT NOT NULL,
  "tipo"              TEXT NOT NULL DEFAULT 'dmc', -- dmc | plataforma | api
  "publicado"         INTEGER NOT NULL DEFAULT 0 CHECK ("publicado" IN (0,1)),
  "bloqueado"         INTEGER NOT NULL DEFAULT 0 CHECK ("bloqueado" IN (0,1)),  -- FREETOUR siempre 1
  "agencyId"          TEXT,                         -- ficha Agency cuando ya está dado de alta (REQ-1295)
  "etapa"             TEXT NOT NULL DEFAULT 'por_contactar'
                      CHECK ("etapa" IN ('por_contactar','contactado','respondio','en_alta','activo','sin_respuesta')),
  "canal"             TEXT NOT NULL DEFAULT 'correo' CHECK ("canal" IN ('api','portal','correo','whatsapp')),
  -- REQ-1298 (P9): lo que sabemos de su integración; orden de preferencia api > plugin > portal > manual
  "integracion"       TEXT NOT NULL DEFAULT 'desconocida' CHECK ("integracion" IN ('api','plugin','portal','manual','desconocida')),
  "tiempoRespuesta"   TEXT NOT NULL DEFAULT '',     -- lo que el proveedor dice (p. ej. «24 h hábiles»)
  -- REQ-1299 (P10): quién cobra al viajero
  "cobro"             TEXT NOT NULL DEFAULT 'desconocido' CHECK ("cobro" IN ('proveedor','travelpuzzle','desconocido')),
  "idioma"            TEXT NOT NULL DEFAULT 'es' CHECK ("idioma" IN ('es','en')),
  "contacto"          TEXT NOT NULL DEFAULT '',
  "correos"           TEXT NOT NULL DEFAULT '[]',   -- JSON: direcciones exactas
  "dominios"          TEXT NOT NULL DEFAULT '[]',   -- JSON: dominios propios (nunca gmail, hotmail…)
  "correosInvalidos"  TEXT NOT NULL DEFAULT '[]',   -- JSON: direcciones que rebotaron (REQ-1565); Mila ya no les escribe
  "telefono"          TEXT NOT NULL DEFAULT '',
  "destinos"          TEXT NOT NULL DEFAULT '',
  "zonaHoraria"       TEXT NOT NULL DEFAULT 'America/Mexico_City', -- REQ-1566: IANA (Asia/Kuala_Lumpur, Europe/Paris…)
  "ultimoSuyo"        TEXT,
  "ultimoNuestro"     TEXT,
  "ultimoAsunto"      TEXT,
  "hiloId"            TEXT,                         -- Message-ID del último correo, para responder en el mismo hilo
  "recordatorios"     INTEGER NOT NULL DEFAULT 0,
  "sinRespuestaDesde" TEXT,
  "proximaAccion"     TEXT NOT NULL DEFAULT '',
  "notas"             TEXT NOT NULL DEFAULT '',
  "checklist"         TEXT NOT NULL DEFAULT '[]',   -- REQ-1572: JSON con los puntos de alta recibidos (tarifas, cancelacion, legal…)
  "bloqueos"          TEXT NOT NULL DEFAULT '{}',   -- REQ-1576: JSON {borradorSinEnviar, acuerdoEnNegociacion, folioAbierto}
  "createdAt"         TEXT NOT NULL,
  "updatedAt"         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS "Proveedor_etapa" ON "Proveedor" ("etapa");

CREATE TABLE IF NOT EXISTS "ProveedorMensaje" (
  "id"          TEXT PRIMARY KEY,                   -- Message-ID
  "proveedorId" TEXT NOT NULL REFERENCES "Proveedor"("id"),
  "direccion"   TEXT NOT NULL CHECK ("direccion" IN ('entrada','salida')),
  "asunto"      TEXT NOT NULL DEFAULT '',
  "resumen"     TEXT NOT NULL DEFAULT '',           -- primeros 500 caracteres del texto
  "fecha"       TEXT NOT NULL,
  "tipo"        TEXT NOT NULL DEFAULT ''            -- presentacion | recordatorio | reintento | alta | respuesta
);
CREATE INDEX IF NOT EXISTS "ProveedorMensaje_proveedor" ON "ProveedorMensaje" ("proveedorId", "fecha");

CREATE TABLE IF NOT EXISTS "ProveedorDocumento" (
  "id"          TEXT PRIMARY KEY,                   -- ruta en cPanel
  "proveedorId" TEXT NOT NULL REFERENCES "Proveedor"("id"),
  "mensajeId"   TEXT NOT NULL,
  "nombre"      TEXT NOT NULL,
  "bytes"       INTEGER NOT NULL,
  "fecha"       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS "ProveedorDocumento_proveedor" ON "ProveedorDocumento" ("proveedorId", "fecha");
