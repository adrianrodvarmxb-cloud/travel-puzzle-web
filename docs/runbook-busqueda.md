# Runbook: buscador FTS5 (REQ-048)

- El índice `TourSearch` es una tabla derivada. Se reconstruye desde `Tour` + `TourTranslation` con `REBUILD_SQL` (`src/search/lib/fts-query.ts`). La migración 0011 lo llena al crearse, y el sync diario lo rehace al cerrar la corrida si `SEARCH_V2_ENABLED="true"`.
- **Exportar D1:** la exportación no soporta tablas virtuales (documentación de Cloudflare D1, "Import and export data"). Pasos:
  1. `DROP TABLE "TourSearch";`
  2. Exportar.
  3. Volver a correr `migrations/0011_busqueda_fts.sql` con `wrangler d1 execute --file`.

  La restauración en un punto del tiempo (Time Travel) no se ve afectada.
- **Apagar:** `SEARCH_V2_ENABLED="false"` regresa la búsqueda por palabras de siempre; no hay que borrar nada.

## Buscador tolerante (S2, REQ-280…285)

- **Encender:** `SEARCH_FUZZY_ENABLED="true"` en su propio PR, con `SEARCH_V2_ENABLED` ya encendida en producción, preview con las dos encendidas, prueba de humo verde y OK del PO. Sin migraciones.
- **Alias y nombres que chocan:** se editan en `data/search-aliases.json` por PR. Después de editar: `npm run search:index` (el build lo vuelve a correr; un test falla si el archivo generado no coincide).
- **Apagar:** `SEARCH_FUZZY_ENABLED="false"`: el texto se busca tal cual (REQ-122). No hay que borrar nada.

## Autocompletado y cero resultados (S3, REQ-290…294)

- **Encender:** `SEARCH_SUGGEST_ENABLED="true"` en su propio PR, con preview con la bandera encendida, prueba de humo verde y OK del PO. Funciona sin S2, pero sin S2 no hay «¿Quisiste decir…?» ni corrección. Sin migraciones.
- **Rutas:** `GET /api/search/suggest?q=&language=` y `GET /api/search/recover?q=&language=`. Las dos usan caché compartida de 5 min por idioma y consulta, y responden 404 con la bandera apagada.
- **Apagar:** `SEARCH_SUGGEST_ENABLED="false"` regresa el buscador y el mensaje de cero resultados de siempre.

## Analítica anónima (S4, REQ-340…344)

- **Antes de encender (en este orden, cada paso en su PR y con OK del PO):**
  1. Aviso de privacidad: el texto de `docs/legal/propuesta-aviso-busquedas-2026-11.md` pasa a `src/legal/lib/privacidad.ts`, con humo de `/privacidad`.
  2. Migración: `migrations/0019_search_log_daily.sql`, aplicada por el PO después de la 0017 (taxonomía), en su propia publicación con la casilla «migraciones».
  3. `SEARCH_LOG_ENABLED="true"`, con preview con la bandera encendida y humo verde. Ojo: la preview usa la D1 de producción, así que si la tabla ya existe la preview escribe ahí.
- **Top semanal de cero resultados (solo lectura):** `WEEKLY_ZERO_SQL` con `lastWeek(Date.now())` y un límite, por ejemplo `wrangler d1 execute travel-puzzle --remote --command "<WEEKLY_ZERO_SQL con las fechas>"`.
- **Retención:** `PURGE_SQL` con `purgeBefore(Date.now())` borra lo de más de 400 días. Es una escritura en producción, así que lleva el OK del PO.
- **Apagar:** `SEARCH_LOG_ENABLED="false"`. El navegador deja de mandar eventos y la ruta responde 404. La tabla se queda.

## Alias multilingües (S5, REQ-350…355)

- **Orden (cada paso con OK del PO):** 1) 0016 aplicada y `City.geonameid` lleno (frente geo, G3/G4); 2) mover `docs/migraciones-propuestas/0020_destino_alias.sql` a `migrations/` y aplicarla; 3) correr «Alias de destino (ensayo)» y revisar `destino-alias.csv` y `cobertura.json`; 4) aplicar `destino-alias.sql` en lotes (escritura en producción); 5) `GEO_ATTRIBUTION_ENABLED="true"` (y «wikidata» en `GEO_SOURCES_IN_PRODUCTION` si hubo alias de Wikidata).
- **Sin geonameid en producción:** el script acepta `--map geo-v2-auto.csv` (los propuestos del ensayo geo v2) para medir la cobertura antes de tiempo. Ese SQL **no** se aplica: los `geonameid` tienen que estar guardados primero.
- **Local:** `unzip -p alternateNamesV2.zip alternateNamesV2.txt | npx tsx src/scripts/alias-ingesta.ts - <export> <salida> [--map …] [--wikidata …]`.
- **Lectura en el Worker:** `SELECT city_id, alias_plegado, alias_ascii FROM destino_alias`, con caché de 1 h. Si la tabla no existe se usan solo los alias curados.
- **Regreso:** `SEARCH_FUZZY_ENABLED="false"` o vaciar la tabla (con OK). El buscador vuelve a los alias curados.
