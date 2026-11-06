-- REQ-340…343 (plan S4). SIN APLICAR: la aplica el PO DESPUÉS de la 0017 (taxonomía, #162), en su propia
-- publicación con la casilla «migraciones» (un cambio a la vez, blindaje 9). La 0018 está reservada para la T6.
--
-- Analítica anónima del buscador: un renglón por día, idioma y consulta normalizada. Sin IP, usuario, cookie,
-- agente ni hora exacta. Solo AGREGA una tabla; no toca datos existentes. Se escribe solo con SEARCH_LOG_ENABLED="true".
--
-- Plan de regreso (solo con OK del PO): DROP TABLE IF EXISTS "search_log_daily";
CREATE TABLE IF NOT EXISTS "search_log_daily" (
    "day" TEXT NOT NULL,                       -- YYYY-MM-DD en hora de Ciudad de México (UTC−6)
    "lang" TEXT NOT NULL,                      -- es | en | pt | de | fr | it
    "query" TEXT NOT NULL,                     -- consulta plegada (sin acentos ni mayúsculas), máx. 80 caracteres
    "searches" INTEGER NOT NULL DEFAULT 0,     -- búsquedas
    "zero" INTEGER NOT NULL DEFAULT 0,         -- búsquedas sin resultados
    "results" INTEGER NOT NULL DEFAULT 0,      -- suma de resultados (promedio = results / searches)
    "corrected" INTEGER NOT NULL DEFAULT 0,    -- búsquedas con alias o errata corregida (S2)
    "clicks" INTEGER NOT NULL DEFAULT 0,       -- clics en resultados
    "positionSum" INTEGER NOT NULL DEFAULT 0,  -- suma de posiciones clicadas (promedio = positionSum / clicks)
    PRIMARY KEY ("day", "lang", "query")
);
CREATE INDEX IF NOT EXISTS "search_log_daily_day_idx" ON "search_log_daily"("day");
