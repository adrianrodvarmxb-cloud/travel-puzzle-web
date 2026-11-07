# Observación (sin INC formal) — 500 aislado en una ficha de viaje propio, 6 nov 2026

Marco: ISO/IEC/IEEE 29119-3, 12207, IEC 62740. **Estado: NO REPRODUCIDO.** Por eso queda como observación y no como incidente. Se corrige de forma preventiva con REQ-306 (regla 7 del CLAUDE.md: diseño que tolera fallos).

## 1. Qué se vio
- Prueba de humo del PR #160 (preview `pr-160`), **16:50:57 UTC**: `500 @390 /viajes/reino-unido/bus-turistico-hop-on-hop-off-en-londres-bbt-gb-m01-010` y la pantalla de error. La misma página a 1366, un minuto después, dio 200. Volver a correr el job: 26 cargas OK.
- Esa URL redirige 301 a `/destinos/gb/londres/bus-turistico-hop-on-hop-off-en-londres-bbt-gb-m01-010` (viaje propio).

## 2. Intento de reproducción (contra producción)
| Prueba | Detalle | Resultado |
|---|---|---|
| curl espaciado | 6 nov, 10:59–11:11 CDMX. 50 rondas (5 s entre rondas) × 3 fichas × 2 anchos (390 con agente de celular, 1366 de escritorio), con `?smoke=` único como la prueba de humo | **300/300 con 200** |
| Navegador (Playwright) | 5 cargas × 3 fichas × 2 anchos | **30/30 con 200**, 0 pageerror |

Fichas: Big Bus Londres, Exotic Escapes (`/destinos/in/agra/triangulo-de-oro-delhi-jaipur-y-agra-exe-in-c07-001`) y Extime (`/destinos/fr/paris/louvre-con-guia-en-espanol-y-acceso-reservado-ext-fr-t01-027`).

Tiempos (p50 / p90 / máx):

| Ficha | p50 | p90 | máx |
|---|---|---|---|
| Big Bus Londres | 1.3–1.4 s | 2.9–3.2 s | 10.0 s |
| Exotic Escapes (Agra) | 0.8 s | 2.5–2.7 s | 6.0 s |
| Extime (Louvre) | 0.8 s | 2.0–2.4 s | 3.8 s |

La caché de Cloudflare nunca sirve estas fichas (`cf-cache-status` vacío): cada visita se arma en el Worker.

## 3. Piezas
| # | Pieza | Esperado | Obtenido | Evidencia | Estado |
|---|---|---|---|---|---|
| 1 | Ficha `/destinos/[pais]/[ciudad]/[slug]` (viaje propio) | 200 | 200 en 330/330 cargas; 1 × 500 en CI | CSV + log del CI | NO REPRODUCIDO |
| 2 | Árbol de destinos (`getDestinations`) | caché + reintento | caché 5 min + `withRetry` | `src/destinations/server.ts` | OK |
| 3 | `loadTripBySlug` (`src/trips/public-load.ts`) | tolerante a D1 saturada | **sin caché ni `withRetry`**; corre **2 veces por petición** (generateMetadata y página): ~6 consultas a D1 por visita | código en `main` | FALLA (riesgo) |
| 4 | Mensaje exacto del error | «D1 DB is overloaded» | sin acceso a los logs del Worker desde el entorno del agente | — | NO VERIFICADO |
| 5 | Carga a D1 en ese momento | — | «Importar viajes» 16:29:04–16:49:39 UTC (20 min, la más larga del día; ~148 viajes nuevos) + publicación del #148 (16:41–16:48) con su prueba de humo | historial de Actions | coincide |
| 6 | Error boundary | aviso con Reintentar, no pantalla en blanco | `src/app/error.tsx` respondió (pantalla de error con 500) | log del CI | OK |

## 4. Hipótesis (IEC 62740; sin confirmar con logs)
1. ¿Por qué el 500? La ficha lanzó una excepción en el servidor.
2. ¿Por qué la excepción? Lo más probable es que D1 respondiera «overloaded» en una de las consultas de `loadTripBySlug`.
3. ¿Por qué D1 saturada? La importación de 148 viajes estuvo escribiendo durante 20 min y terminó 78 s antes. Al mismo tiempo, la publicación del #148 y su prueba de humo pegaban a la misma base.
4. ¿Por qué no se recuperó sola? `loadTripBySlug` no tenía `withRetry` (las demás cargas sí, desde INC-003) y repetía sus consultas dos veces por petición.
5. ¿Por qué ningún test lo vio? Las pruebas unitarias no simulan D1 saturada en esta carga, y la prueba de humo carga cada ficha una vez por ancho, fuera de las ventanas de importación.

Descartado: el cambio del #160 (el pie). La ficha de viaje no usa `EmailFrame`, y la misma página pasó a 1366 en la misma corrida.

## 5. Corrección preventiva (REQ-306, PR fix/ficha-viaje-reintento)
- `src/trips/lib/trip-by-slug.ts` (puro): mismas reglas de publicación, más `createTripBySlugLoader` (caché + reintento inyectados) y `reviveTripDates` (las fechas regresan de la copia JSON).
- `src/trips/public-load.ts`: `loadTripBySlug` envuelto en `cache()` de React (**una carga por petición**, compartida entre metadatos y página), con caché compartida `POLICY.ownTrip` (120 s; copia vieja hasta 6 h solo si D1 falla) y `withRetry` ante «overloaded».
- Sin cambios visibles: misma salida de datos.
- Test: `src/trips/lib/trip-by-slug.test.ts`.

## 6. Regla nueva (REQ-307)
**Las importaciones grandes de viajes no corren a la par de una publicación.** Antes de «Importar viajes» con `escribir=true`, revisar que no haya una publicación de main en curso ni una en la fila inmediata; y no publicar mientras corre una importación. Pendiente (con OK del PO, porque toca un workflow que escribe en producción): que el workflow espere solo, como lo hace «Prueba de humo (PR)» con las publicaciones (REQ-186).

## 7. Pendiente
- Confirmar el mensaje exacto en los logs del Worker (observability o `wrangler tail`) de las 16:50:57 UTC del 6 nov, preview `pr-160`. Necesita a alguien con acceso a Cloudflare.
