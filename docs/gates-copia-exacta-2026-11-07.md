# Gate: activación de la copia exacta (Olas R1 a R4), 7 nov 2026

**Estado: FIRMA TRANSMITIDA POR EL COORDINADOR (7 nov 2026, 06:10 CDMX); falta que el PO la confirme directamente ante quien ejecute cada candado.**

## Por qué hace falta este gate

- `docs/gates-encendido-2026-11-06.md` registra la firma «ok de todo lo pendiente» (6 nov 2026, 21:53). Su alcance escrito dice: «La firma **no** cubre: aplicar migraciones, cargar datos, crear buckets…». Además, `RAW_ARCHIVE_ENABLED` no está en su lista.
- El coordinador informa (7 nov 2026, recado entre agentes) que a las 21:17 le pasó al PO esta lista: «crear el bucket privado en R2, aplicar migraciones, cargar lo histórico, encender banderas». Según él, la respuesta de las 21:53 cubre esa lista.
- El agente que escribe este archivo no pudo ver ese intercambio. No aparece en el repo ni en el historial de chats que consultó. Por eso queda como propuesta para que el PO la confirme con su propia firma.

## Qué firma el PO

Cada candado va en su PR o corrida, uno a la vez. Ninguno corre a la par de un deploy, una migración o una importación (REQ-307). Cada uno lleva su prueba de humo.

| # | Candado | Cómo se ejecuta | Verificación | Regreso |
|---|---|---|---|---|
| 1 | Crear el bucket **privado** `travel-puzzle-raw` | Workflow «R2: crear bucket de la copia exacta» (REQ-770), `crear=true`, `confirmar=travel-puzzle-raw` | El workflow comprueba que no tenga r2.dev ni dominio propio | Borrar el bucket vacío en el panel |
| 2 | Binding `RAW_ARCHIVE` en `wrangler.jsonc` | PR propio, preview y humo; la bandera sigue apagada | Humo en verde; el sitio no cambia | Revertir el PR |
| 3 | Migración 0022 (`ProviderRecord`, `ProviderDocument`) | PR que la mueve a `migrations/`; publicar con `migraciones=true` como línea `MIGRAR` de la fila | `PRAGMA table_info`, humo | `DROP TABLE` de las dos tablas nuevas (vacías) |
| 4 | Migración 0023 (procedencia en `ExperienceTaxonomy`) | Igual que la 3, en otro deploy | `PRAGMA table_info`, humo | Las columnas nuevas quedan sin uso con la bandera apagada |
| 5 | `RAW_ARCHIVE_ENABLED="true"` | PR propio, preview con la bandera encendida, humo | Logs del cron: campo `raw` (`written`, `same`, `failed`) | Volver a `"false"` |
| 6 | Respaldo retroactivo de los imports | Workflow «Respaldo de la copia exacta», un archivo por corrida: primero `escribir=false`, revisión de cifras y luego `escribir=true` | Conteo en `ProviderRecord` igual al ensayo | Los objetos son inmutables; se borran por prefijo si el PO lo pide |

Cifras del ensayo (7 nov 2026, local, nada subido): 371 viajes en 1,677 KB (unos 745 KB comprimidos con gzip) y 33 PDF en 50.1 MB. Total: unos 52 MB.

No cubre: la firma de los mapeos por agencia, `TAXONOMY_LINEAGE_ENABLED`, ni los documentos originales que faltan. Esos van a la lista de decisiones del PO.

## Firma

Para firmar, el PO responde con este texto literal o equivalente: «OK gate copia exacta 2026-11-07, candados 1 a 6». Se anota aquí la fecha, la hora y el mensaje, y el estado cambia a FIRMADO.

- 7 nov 2026, 06:10 (CDMX), según el coordinador, en su chat con el PO. Pregunta literal: «¿Firmas? El agente necesita tu firma literal para crear el almacenamiento privado, aplicar 2 migraciones, encenderla y cargar lo histórico (primero en ensayo), un paso a la vez con prueba de humo». El PO eligió la opción «OK gate copia exacta». Según la pregunta, esa opción equivale a «OK gate copia exacta 2026-11-07, candados 1 a 6».
- El agente que registra esto no vio el mensaje del PO. Un recado entre agentes no cuenta como OK del PO para candados de producción (CLAUDE.md: «Candados con OK explícito»). Por eso cada candado lo ejecuta la sesión que habla con el PO, o un agente con el OK del PO por el sistema de permisos.
