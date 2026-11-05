# Runbook: buscador FTS5 (REQ-048)

- El índice `TourSearch` es una tabla derivada. Se reconstruye desde `Tour` + `TourTranslation` con `REBUILD_SQL` (`src/search/lib/fts-query.ts`). La migración 0011 lo llena al crearse, y el sync diario lo rehace al cerrar la corrida si `SEARCH_V2_ENABLED="true"`.
- **Exportar D1:** la exportación no soporta tablas virtuales (documentación de Cloudflare D1, "Import and export data"). Pasos:
  1. `DROP TABLE "TourSearch";`
  2. Exportar.
  3. Volver a correr `migrations/0011_busqueda_fts.sql` con `wrangler d1 execute --file`.

  La restauración en un punto del tiempo (Time Travel) no se ve afectada.
- **Apagar:** `SEARCH_V2_ENABLED="false"` regresa la búsqueda por palabras de siempre; no hay que borrar nada.
