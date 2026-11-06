-- PROPUESTA, SIN APLICAR (REQ-350…355, plan S5). Fuera de migrations/ a propósito (ninguna corrida la aplica por
-- accidente). Para aplicarla: PR aparte que la mueva a migrations/ con el siguiente número libre, OK del PO y
-- publicación a mano con la casilla «migraciones». Va DESPUÉS de la 0016 (geonameid en City) y de llenar los geonameid.
--
-- Nombres de cada destino en 14 idiomas, colgados del geonameid (GeoNames CC BY 4.0 + Wikidata CC0). Solo AGREGA
-- una tabla. La llenan, con OK del PO (candado: datos de producción), los INSERT OR IGNORE que genera el ensayo
-- (src/scripts/alias-ingesta.ts). La lee el buscador solo con SEARCH_FUZZY_ENABLED="true".
--
-- Plan de regreso (solo con OK del PO): DROP TABLE IF EXISTS "destino_alias";
CREATE TABLE IF NOT EXISTS "destino_alias" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "geonameid" INTEGER NOT NULL,
    "city_id" INTEGER NOT NULL,
    "country_id" INTEGER NOT NULL,
    "idioma" TEXT NOT NULL,                    -- es, en, pt, fr, it, de, nl, ca, ru, el, cs, zh, ja, ko
    "alias" TEXT NOT NULL,                     -- tal cual (Řím, Рим, 罗马)
    "alias_plegado" TEXT NOT NULL,             -- NFKD sin marcas y minúsculas (rim, рим, 罗马)
    "alias_ascii" TEXT NOT NULL,               -- cirílico/griego a latín (rim); CJK igual al plegado
    "tipo" TEXT NOT NULL,                      -- preferido | nombre | corto | coloquial | historico | wikidata
    "peso" INTEGER NOT NULL,                   -- 100 preferido … 5 histórico (coloquiales e históricos no se muestran)
    "fuente" TEXT NOT NULL                     -- geonames | wikidata
);
CREATE UNIQUE INDEX IF NOT EXISTS "destino_alias_unico" ON "destino_alias"("city_id", "idioma", "alias_plegado");
CREATE INDEX IF NOT EXISTS "destino_alias_plegado_idx" ON "destino_alias"("alias_plegado");
CREATE INDEX IF NOT EXISTS "destino_alias_ascii_idx" ON "destino_alias"("alias_ascii");
CREATE INDEX IF NOT EXISTS "destino_alias_geonameid_idx" ON "destino_alias"("geonameid");
