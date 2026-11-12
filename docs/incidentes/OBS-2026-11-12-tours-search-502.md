# Observación (sin INC formal) — 502 aislado en `/tours?search=trekking` a 390 px, 12 nov 2026

Marco: ISO/IEC/IEEE 29119-3, 12207, IEC 62740. **Estado: NO REPRODUCIDO.** Queda como observación y no como incidente.

## 1. Qué se vio
- Prueba de humo manual contra producción (`npx tsx src/scripts/smoke.ts https://travelpuzzle.com.mx`), **12 nov ~07:30 UTC**, después de publicar los cuatro encendidos (REQ-1629..1632, último deploy `1e1e211` a las 07:17 UTC):
  `502 @390 /tours?search=trekking — reintento: también falla`. Las otras 97 cargas, en verde.
- La página es la que agregó el humo de REQ-1629 (`tests/smoke/pages.json`) para probar los sinónimos del buscador.

## 2. Intento de reproducción (contra producción)
| Prueba | Detalle | Resultado |
|---|---|---|
| curl directo | 3 cargas seguidas de `/tours?search=trekking` | 3/3 con 200 |
| curl por término | `trekking`, `transfer`, `caminata` | 3/3 con 200 |
| curl 390 px | 30 rondas con agente de celular y `?smoke=` único, 1 s entre rondas | **30/30 con 200** |
| Prueba de humo completa | la misma orden, de nuevo | **98/98 cargas sin errores** |

## 3. Piezas
| # | Pieza | Esperado | Obtenido | Evidencia | Estado |
|---|---|---|---|---|---|
| 1 | `/tours?search=…` en producción | 200 | 200 en 131/131 cargas posteriores; 1 × 502 (con su reintento) en la corrida manual | salida del humo y de los curl | NO REPRODUCIDO |
| 2 | Humo de producción del pipeline (`deploy-cloudflare.yml`, paso «Prueba de humo (producción)») | verde en los cuatro deploys | verde en `a850c7b`, `55a044a`, `72c2e4b` y `1e1e211` | corridas «Publicar en Cloudflare» en verde | OK |
| 3 | Bandera `SEARCH_TAXONOMY_SYNONYMS_ENABLED` | `"true"` en producción | `"true"` en `wrangler.jsonc` de main | `wrangler.jsonc:89` | OK |
| 4 | Mensaje exacto del error | — | sin acceso a los logs del Worker desde el entorno del agente | — | NO VERIFICADO |

## 4. Hipótesis (IEC 62740; sin confirmar con logs)
1. ¿Por qué el 502? El Worker no respondió esa carga.
2. ¿Por qué no respondió? La corrida cayó ~13 min después de publicar `1e1e211`: versión nueva, caché de producción recién calentada (paso «Calentar la caché», INC-009) y la búsqueda de texto pega a D1 (FTS) en frío.
3. ¿Por qué el reintento del humo también falló? Los dos intentos del script van seguidos, dentro de la misma ventana de arranque en frío.
4. ¿Por qué no se volvió a ver? Un minuto después, 131 cargas seguidas en verde, con y sin agente de celular.
5. ¿Por qué ningún test lo vio? El humo del PR corre contra la versión de preview, ya tibia; esta ventana (deploy recién publicado + consulta FTS en frío) no se simula en las unitarias.

Descartado como regresión de los encendidos: el humo de producción del pipeline pasó en los cuatro deploys, incluido el último, y la misma URL responde 200 de forma sostenida con las cuatro banderas encendidas.

## 5. Pendiente
- Confirmar el mensaje exacto en los logs del Worker (observability o `wrangler tail`) alrededor de las 07:30 UTC del 12 nov. Necesita acceso a Cloudflare.
- Si vuelve a aparecer, abrir INC y revisar caché/reintento en la ruta de búsqueda de texto (`src/search/ranked.ts`), como se hizo en INC-003 y en la observación del 6 nov.
