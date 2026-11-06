# Ola 3, identidad y slugs: migración 0015 y plan de regreso (REQ-085, 086, 087)

## Qué agrega `migrations/0015_identidad_slugs.sql`
Solo columnas, índices y un trigger. No borra ni cambia datos.

| Tabla | Columna o índice | Para qué |
|---|---|---|
| Country | `iso2` (único cuando no es nulo) | ISO 3166-1 alfa-2 (REQ-085) |
| City | `geonameid` (índice), `slug`, `stateCode`, `guide`, `guideUpdatedAt` | Identidad y URL de la ciudad (REQ-085, 087) y guía propia (REQ-089) |
| City | `indexableSince`, `failingSince` | Regla de los 14 días (REQ-090, la usa la Ola 4) |
| City | único `(countryId, slug)` | No hay dos ciudades con el mismo slug en un país |
| Tour | `providerId` (default `'freetour'`), único `(providerId, externalId)` | Llave natural (REQ-085). `externalId` sigue siendo Int |
| Tour | `slug` (único cuando no es nulo) + trigger `Tour_slug_inmutable` | Un slug guardado no se puede cambiar ni borrar (REQ-086) |

Verificado en local: las 12 migraciones aplican con `wrangler d1 migrations apply --local`, y `prisma migrate diff` no muestra diferencias en Country, City ni Tour.

## Orden seguro para publicar (candado: migración, OK del PO)
Prisma lee todas las columnas del modelo en `/tours` y en la ficha. Si el código nuevo se publica antes de aplicar la migración, la ficha falla con «no such column».
1. Fusionar el PR.
2. En Actions, **cancelar** la corrida automática «Publicar en Cloudflare» que dispara el merge.
3. Correr «Publicar en Cloudflare» a mano sobre `main` con **migraciones = true**. Esta corrida aplica la 0015 antes de construir y pasa la prueba de humo antes de publicar.
4. Comprobar `/tours` y una ficha `/tours/{id}` a 390 y 1366 px.

La 0015 no depende de la 0013 (Stripe) ni de la 0014 (Ola 1): wrangler aplica las que falten por nombre.

## Plan de regreso
- **Si falla el código:** revertir el PR. Las columnas nuevas se quedan; son opcionales y el código anterior las ignora.
- **Si hay que quitar la migración** (solo con OK del PO): primero se respalda con D1 Time Travel (`wrangler d1 time-travel info travel-puzzle`, y se anota el bookmark). Después se corre este SQL. No está en `migrations/` para que nunca se aplique solo.

```sql
DROP TRIGGER IF EXISTS "Tour_slug_inmutable";
DROP INDEX IF EXISTS "Tour_providerId_externalId_key";
DROP INDEX IF EXISTS "Tour_slug_key";
DROP INDEX IF EXISTS "City_countryId_slug_key";
DROP INDEX IF EXISTS "City_geonameid_idx";
DROP INDEX IF EXISTS "Country_iso2_key";
ALTER TABLE "Tour" DROP COLUMN "slug";
ALTER TABLE "Tour" DROP COLUMN "providerId";
ALTER TABLE "City" DROP COLUMN "failingSince";
ALTER TABLE "City" DROP COLUMN "indexableSince";
ALTER TABLE "City" DROP COLUMN "guideUpdatedAt";
ALTER TABLE "City" DROP COLUMN "guide";
ALTER TABLE "City" DROP COLUMN "stateCode";
ALTER TABLE "City" DROP COLUMN "slug";
ALTER TABLE "City" DROP COLUMN "geonameid";
ALTER TABLE "Country" DROP COLUMN "iso2";
DELETE FROM "d1_migrations" WHERE "name" = '0015_identidad_slugs.sql';
```
- **Restauración total:** `wrangler d1 time-travel restore travel-puzzle --bookmark=<bookmark anotado>`.

## Lo que falta después de la 0015 (no va en este PR)
- Llenar `iso2`, `City.slug` y `Tour.slug` con el SQL que genera el ensayo de slugs (PR-B). Es escritura en producción: candado con OK del PO.
- Llenar `geonameid` con lo que sale del cruce con GeoNames, después de la revisión manual de la lista de dudosos.
- Sync (Ola 1, `src/catalog`): asignar el slug a los tours nuevos con `assignSlugs` y no escribir nunca la columna `slug` en el upsert.
