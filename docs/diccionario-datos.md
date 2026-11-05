# Diccionario de datos: identidad de destinos y tours (REQ-069)

Las columnas marcadas como *Ola 3* todavía no existen: entran con la migración 0014.

| Campo | Definición | Formato | ¿Cambia? | Dueño |
|---|---|---|---|---|
| `provider_id` | Proveedor del que viene el tour | Texto corto: `freetour`, `incaworld`, `fantasticachina`, … | Nunca | Código (registro de adaptadores) |
| `external_id` | Id del tour en el sistema del proveedor. Hoy es `Tour.externalId` (Int, el id de FREETOUR) | El que dé el proveedor, guardado como texto | Nunca para el mismo tour | Proveedor |
| `tour_uid` | Id interno de Travel Puzzle. Hoy es `Tour.id` (cuid) | cuid | Nunca. Si el tour reaparece, conserva el mismo | Travel Puzzle |
| llave natural | `(provider_id, external_id)`, única | — | Nunca | — |
| `slug` (tour) | Parte final de la URL de la ficha | `[a-z0-9-]`, ≤ 60 caracteres, sin acentos, chino a pinyin sin tonos | **Nunca**: se genera una vez y se guarda. El sync no lo regenera aunque cambie el título. Si choca, se agrega un sufijo corto | Travel Puzzle (función `destinations/lib/slug.ts`) |
| `country.iso2` | País | ISO 3166-1 alfa-2 en mayúsculas (`MX`, `PE`, `CN`); en la URL va en minúsculas | Nunca | ISO |
| `city_code` | Identidad de la ciudad | geonameid de GeoNames (entero). Si no se encuentra, `ft:{id de FREETOUR}` hasta la revisión manual | Solo se corrige; no cambia con el sync | Travel Puzzle |
| `city.slug` | Parte de la URL de la ciudad | `[a-z0-9-]`; si hay homónimas en el mismo país, se agrega el código de estado (`san-jose-bcs`) | Nunca después de publicado | Travel Puzzle |
| `status` (tour) | Estado de presencia según el sync | `active` · `missing` (no vino en una corrida exitosa) · `removed` (3 corridas exitosas seguidas sin él) | Lo cambia solo el sync | Sync (Ola 1) |
| `content_hash` | Huella del contenido mostrado, sin la calificación | sha-256 hex | En cada cambio real; sirve de `lastmod` | Sync (Ola 1) |
| `city.guide` | Guía propia de la ciudad | Texto de ≥ 300 palabras escrito por Travel Puzzle (no de FREETOUR) | Editorial | Travel Puzzle |
