# Runbook — Copia exacta del proveedor y reclasificación con linaje (Olas R1 a R4)

Pedido del PO del 6 nov 2026 (REQ-740…769). **Cada paso es un candado**: se hace uno a la vez, con OK explícito del
PO, en su propio PR o publicación, y no se pasa al siguiente sin prueba de humo verde. Si un paso falla: detenerse,
revertir ese paso y avisar; nunca improvisar. Nada de esto se ejecutó al preparar las olas.

## Orden

| # | Paso | Quién | Comando o acción | Verificación | Regreso |
|---|---|---|---|---|---|
| 1 | **Bucket** PRIVADO `travel-puzzle-raw` (sin dominio propio, sin `r2.dev`, sin acceso público) | PO / coordinador | `npx wrangler r2 bucket create travel-puzzle-raw`; en el panel, «Public access» apagado | `npx wrangler r2 bucket list` lo muestra; una URL pública no responde | Borrar el bucket vacío |
| 2 | **Binding** en `wrangler.jsonc` → `r2_buckets`: `{ "binding": "RAW_ARCHIVE", "bucket_name": "travel-puzzle-raw" }` | Agente, PR propio | Preview + prueba de humo (el sitio no cambia: bandera apagada). Ajustar el test REQ-747 que hoy exige que el binding no exista | Humo verde | Revertir el PR |
| 3 | **Migración 0022** (`ProviderRecord`, `ProviderDocument`) | Coordinador, con respaldo | PR que la mueva de `docs/migraciones-propuestas/` a `migrations/` con el siguiente número libre; publicación a mano con la casilla «migraciones» | `SELECT name FROM sqlite_master WHERE name LIKE 'Provider%'` | Tablas nuevas y vacías: con la bandera apagada nadie las usa |
| 4 | **Bandera `RAW_ARCHIVE_ENABLED="true"`** | Agente, PR propio | Preview con la bandera encendida, humo verde, OK del PO | Logs del cron: campo `raw` por página (`written`, `same`, `failed`) | Volver a `"false"`: el sync sigue igual |
| 5 | **Respaldo retroactivo de FREETOUR** | Automático | No hay script aparte: el siguiente sync diario (3:00 CDMX) recorre `/tours` completo y guarda la versión 1 de cada tour. Sin otro login ni más carga a la API (FREETOUR E4) | `SELECT COUNT(*) FROM "ProviderRecord" WHERE "provider"='freetour'` ≈ tours activos (~8,000) | Apagar la bandera; los objetos quedan privados |
| 6 | **Respaldo retroactivo de los imports** (items) | Coordinador | Workflow «Respaldo de la copia exacta (retroactivo)», un archivo por corrida: primero `escribir=false` (ensayo) y luego `escribir=true`. **No correr a la par de un deploy (REQ-307)** | Reporte del ensayo; conteo por proveedor en `ProviderRecord` | Los objetos son inmutables; borrar filas solo con OK del PO |
| 7 | **Documentos originales** (PDF) | PO o coordinador, desde la máquina que tiene los PDF | `npx tsx src/scripts/raw-backfill.ts --docs <carpeta de PDF> --salida <carpeta fuera del repo> --reporte <archivo>`; revisar el reporte; luego `bash <carpeta>/subir.sh` | `SELECT COUNT(*) FROM "ProviderDocument"`; cada viaje con `sourceDocKey` | Igual que 6 |
| 8 | **Firma de los mapeos por agencia** (`src/taxonomy/data/mapping/<agencia>.json`, hoy «pendiente de firma del PO») | PO | Revisar formato de cada denominación; capturar `original.categoria` (y `original.pagina`) en los imports de Extime, Exotic Escapes y Turismo Asiático, y quitar esos refs de `src/ingest/data/contrato-huecos.json` | Suite verde (la línea base solo se achica) | Revertir el PR |
| 9 | **Migración 0023** (columnas de procedencia en `ExperienceTaxonomy`) | Coordinador, con respaldo | Igual que el paso 3; va después de la 0017 y la 0022. Se aplica UNA vez (ALTER TABLE) | `PRAGMA table_info("ExperienceTaxonomy")` | Columnas en NULL; apagar la bandera |
| 10 | **Banderas de la taxonomía**: `TAXONOMY_SYNC_ENABLED` (si sigue apagada) y luego `TAXONOMY_LINEAGE_ENABLED="true"` | Agente, un PR por bandera | Preview con la bandera encendida, humo verde, OK del PO. Encender el linaje dispara una corrida nueva (cambia la versión del mapeo): es la **reclasificación retroactiva** de todo el catálogo | `SELECT "origin", COUNT(*) FROM "ExperienceTaxonomy" WHERE "runId"=(última publicada) GROUP BY 1` | Volver a `"false"`: el sitio sigue leyendo la última corrida publicada |

## Límite honesto del «retroactivo»
- El historial empieza el día del paso 4: lo que los proveedores enviaron antes nunca se guardó y no se puede recuperar.
- Los imports del repo ya vienen **reescritos por Travel Puzzle**; su copia exacta es el item tal cual está en el archivo, y el
  original verdadero es el documento del proveedor (paso 7). Faltan: Extime (179 viajes, sin documento) y la página web de
  cada ciudad de Big Bus (29, hay que guardar su HTML). La lista completa sale en el reporte del ensayo.
- La reclasificación sí es retroactiva completa: el paso 10 recalcula todo desde el catálogo y las denominaciones guardadas.
