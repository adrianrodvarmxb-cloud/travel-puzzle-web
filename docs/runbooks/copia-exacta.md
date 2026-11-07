# Runbook — Copia exacta del proveedor (Ola R1)

Pedido del PO del 6 nov 2026 (REQ-740…748). Cada paso es un candado: se hace uno a la vez, con OK explícito del PO,
y no se pasa al siguiente sin prueba de humo verde. Si un paso falla: detenerse, no improvisar.

| # | Paso | Quién | Comando o acción | Regreso |
|---|---|---|---|---|
| 1 | Crear el bucket PRIVADO `travel-puzzle-raw` (sin dominio, sin `r2.dev`, sin acceso público) | PO / coordinador | `npx wrangler r2 bucket create travel-puzzle-raw` y confirmar en el panel que «Public access» está apagado | Borrar el bucket vacío |
| 2 | Agregar el binding en `wrangler.jsonc` (PR propio): `{ "binding": "RAW_ARCHIVE", "bucket_name": "travel-puzzle-raw" }` dentro de `r2_buckets` | Agente, PR | Preview + prueba de humo; el sitio no cambia (bandera apagada) | Revertir el PR |
| 3 | Aplicar la migración 0022 (PR que la mueva de `docs/migraciones-propuestas/` a `migrations/` con el siguiente número libre) | Coordinador, con respaldo | Publicación a mano con la casilla «migraciones» | Tablas nuevas y vacías: con la bandera apagada nadie las lee |
| 4 | Encender `RAW_ARCHIVE_ENABLED="true"` (PR propio) | Agente, PR | Preview con la bandera encendida, humo verde, OK del PO | Volver a `"false"`: el sync sigue igual |

Después del paso 4, el siguiente sync diario de FREETOUR guarda la versión 1 de cada tour (no hay historial anterior:
lo que FREETOUR envió antes nunca se guardó). Los imports guardan su copia en la siguiente corrida con `escribir=true`.

Verificación: `npx wrangler d1 execute travel-puzzle --remote --command 'SELECT "provider", COUNT(*) FROM "ProviderRecord" GROUP BY 1'`
y en los logs del cron, el campo `raw` de cada página (`written`, `same`, `failed`). `failed` > 0 no tumba el sync.
