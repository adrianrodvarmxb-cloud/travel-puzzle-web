# Identidad geográfica v2 (ensayo): gates para el PO (REQ-131…143)

Base: informe aprobado «Identidad geográfica del catálogo». Este PR cubre los pasos 1–5 y deja propuesto el 7. **No escribe en D1.**

## Qué hace
- `src/geo/lib/`: normalización, centroides no confiables, puntaje y decisión, países no ISO, alias, overrides, Wikidata y atribución (puro, con tests REQ).
- `src/geo/data/`: tablas versionadas que solo cambian por PR (`country-overrides.csv`, `an-cities.csv`, `city-aliases.csv`, `city-overrides.csv`). No van en `data/` porque esa carpeta se borra al hacer el typecheck (`data/countries.json` no se commitea).
- `.github/workflows/geo-dry-run.yml`: ensayo de solo lectura (no tiene paso de escritura). El workflow viejo «Identidad (ensayo)» no se tocó.
- `migrations/0016_identidad_geo.sql`: **propuesta, sin aplicar**.

## Gates (uno por uno, cada uno con OK explícito)
| Gate | Decisión | Propuesta |
|---|---|---|
| G1 | Umbrales del cruce | exacto ≤ 30 km; exacto 30–70 km sin rival a 150 km; fuzzy JW ≥ 0.93 y ≤ 15 km; centroide no confiable → nombre exacto (nombre, asciiname o es/en) único en el país, o desempate por población ≥ 10×. Control: 0 cambios en los geonameid ya guardados. |
| G2 | Tabla AN (`an-cities.csv`) | Hoy el catálogo no tiene ciudades con país 111: la tabla queda con propuestas por nombre (Willemstad CW, Philipsburg SX, Kralendijk/Oranjestad SE/The Bottom BQ, Oranjestad AW) en «revisar», sin id. Se aprueba fila por fila cuando aparezcan. |
| G3 | Migración 0016 (candado) | `City.countryCode`, `regionCode`, `geoSource`, `geoLocked` y tablas `CityAlias`, `CountryOverride`, `SlugRedirect`. Solo agrega. Aplicar con «Publicar en Cloudflare» migraciones = true, en su propio deploy, con respaldo (Time Travel) y prueba de humo. Verificada en local (`wrangler d1 migrations apply --local`). |
| G4 | Escritura del geonameid v2 (candado: datos de producción) | `geo-v2.sql` del artefacto: solo `UPDATE … WHERE "geonameid" IS NULL`, en lotes con `--command`, job aparte con respaldo previo. `geo-v2-0016.sql` solo después de G3. |
| G5 | Atribución | Texto: «Datos geográficos: GeoNames (geonames.org), licencia CC BY 4.0.» con enlace a geonames.org y a la licencia. Dónde: pie de página (línea pequeña junto a los avisos legales) y `/legal`. Tras `GEO_ATTRIBUTION_ENABLED="false"`; se enciende cuando el geonameid o datos de GeoNames se vean en el sitio (JSON-LD, hubs). Wikidata (CC0) solo si se usa en producción. |
| G6 | Corrida semanal | El informe propone «manual + semanal». Este PR deja solo push en la rama y manual; agregar `schedule` después del merge si el PO quiere. |
| G7 | Revisión humana | `geo-v2-revisar.csv` (top-3 con km y población, más opinión de Wikidata) → decisiones en `src/geo/data/city-overrides.csv` por PR. |

## Firmas del PO (5 nov 2026)
| Gate | Firma | Qué se hizo en este PR |
|---|---|---|
| G1 | **Aprobado tal cual** (umbrales propuestos), 5 nov 2026. | Nada que cambiar: la lógica (REQ-133) ya usa esos umbrales. |
| G2 | **Queda como está**, 5 nov 2026: filas AN se aprueban una por una cuando aparezcan ciudades con país 111. | Sin cambios en `an-cities.csv`. |
| G3 | **Aprobado para el 6 nov 2026**, después de que termine la primera corrida del sync blindado. | **No aplicado** en este PR (candado: migración). |
| G4 | **Aprobado para el 6 nov 2026**, después de G3 y de la primera corrida del sync blindado. | **No aplicado** en este PR (candado: datos de producción). Nada se escribió en D1. |
| G5 | **Atribución solo en la sección legal, no en el pie de página**, tras `GEO_ATTRIBUTION_ENABLED="false"`, 5 nov 2026. | REQ-139. El sitio no tiene ruta `/legal`: va al final de `/terminos` (página «TRAVEL PUZZLE · LEGAL»). Si el PO quiere una página `/legal` propia, es página nueva y va en otro PR. |
| G6 | **Corrida semanal aprobada**, 5 nov 2026 (sigue siendo solo lectura). | REQ-140: `schedule` cada lunes 10:17 UTC. GitHub solo lo dispara desde `main`, así que empieza después del merge. |
| G7 | **«Claude propone, el PO firma»**, 5 nov 2026. | REQ-141: de las 73 ciudades de `geo-v2-revisar.csv` (artefacto 13477662786), 68 quedan en `city-overrides.csv` (42 `asignar`, 26 `sin-geonameid` para islas, lagos, montañas, parques y regiones). 5 dudosas quedan fuera y se listan en el PR. La firma del PO es aprobar el PR. |

## Firmas del PO (6 nov 2026)
- **G7 firmado**: las 68 filas propuestas por Claude en `city-overrides.csv` quedan aprobadas (`revisado_por` = «Claude propuso; PO firmó 6 nov 2026»).
- **Las 5 dudosas** (REQ-143), firmadas por el PO:
  | Ciudad | Decisión | geonameid |
  |---|---|---|
  | Alajuela 936 | La provincia, no la ciudad | 3624953 (Provincia de Alajuela, ADM1) |
  | San Luis Potosí 2960 | El estado, no la capital | 3985605 (Estado de San Luis Potosí, ADM1) |
  | La Palma 3922 | `sin-geonameid`, nota «mal etiquetada en FREETOUR (el tour es en Palma de Mallorca), avisar» | — |
  | Diani 2779 | Diani Beach | 8199180 |
  | Krabi Ao Nang 4243 | Ao Nang | 1120400 |
- **País por ciudad** (REQ-142), firmado por el PO: Hong Kong 5835 → HK y Tórshavn 6298 → FO, con la capa nueva `src/geo/data/city-country-overrides.csv`. Solo aplica si FREETOUR sigue dando CN o DK; si no, la ciudad va a revisión. Se escribe en `City.countryCode` con `geo-v2-0016.sql`, así que depende de G3.

## Plan de regreso
- Código: revertir el PR. Solo toca `/terminos` tras bandera apagada (no se ve nada) y no toca Worker ni base.
- Overrides (G7): quitar o corregir la fila en `src/geo/data/city-overrides.csv` por PR; el ensayo siguiente lo refleja.
- Corrida semanal (G6): quitar el bloque `schedule` del workflow.
- Migración 0016 (si se aplicó): ver el encabezado del archivo (DROP de lo agregado), solo con OK del PO y bookmark de Time Travel.

## G4: mecanismo de escritura (6 nov 2026, REQ-470…472)
- SQL: `docs/datos/2026-11-06-geo-v2-geonameid.sql` = `geo-v2.sql` del ensayo #3 (run 42172320495), 224 filas, solo `UPDATE "City" SET "geonameid" = … WHERE "id" = … AND "geonameid" IS NULL`.
- Workflow manual «Geo: escribir geonameid» (`geo-escribir-geonameid.yml`): bookmark de Time Travel → ensayo (SELECT equivalente) → con `escribir=true`, lotes de 25 con `--command` → verificación (conteo antes/después, repetidos) → humo en producción. Si algo falla después de escribir, restaura al bookmark.
- Repetidos que el SQL crearía (ensayo local contra el export de control): **1819729** Hong Kong 4855 (HK) y 5835 (CN → HK) y **3687238** Cartagena 898 (`cartagena-co`) con 5948 (`cartagena-de-indias`, ya guardado). Ninguno está en `city-aliases.csv`: con `escribir=true` el workflow se detiene salvo que el PO los permita en `permitir_repetidos`. Ya existían antes y no se tocan: Taipei 4200/6172 (alias firmado) y Tenerife 4016/4040.
- Repetidos: decisión del 6 nov 2026, tomada por el coordinador en autopiloto (opción 1, no es firma del PO): se permiten 1819729 y 3687238 con `permitir_repetidos=1819729,3687238`, igual que el alias firmado de Taipei, porque son la misma ciudad con dos fichas. Unificar esas ciudades es otra tarea.
- `geo-v2-0016.sql` → `docs/datos/2026-11-06-geo-v2-0016-pais.sql` (REQ-473): 5 ciudades de GB con su región, Hong Kong 5835 → HK, Tórshavn 6298 → FO y los alias de Taipei. Va en una corrida **aparte** del mismo workflow (`escribir_pais=true`), después de los geonameid, con su propio bookmark y prueba de humo. Solo escribe si FREETOUR sigue dando el país crudo firmado.
