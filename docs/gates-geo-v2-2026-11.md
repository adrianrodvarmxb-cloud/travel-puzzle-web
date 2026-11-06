# Identidad geográfica v2 (ensayo): gates para el PO (REQ-122…129)

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

## Plan de regreso
- Código: revertir el PR. No toca páginas, Worker ni base.
- Migración 0016 (si se aplicó): ver el encabezado del archivo (DROP de lo agregado), solo con OK del PO y bookmark de Time Travel.
