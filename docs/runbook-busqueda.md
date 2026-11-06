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
