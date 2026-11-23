# Ola 15 · Ficha única: peso antes y después (REQ-10861, 22-11-2026)

Regla firmada (REQ-10633, plan ficha única §ola 15): «la ficha nueva no pesa más que la actual».

## Cómo se midió
- Ficha: `/destinos/ar/el-calafate/minitrekking-glaciar-perito-moreno` (Tangol).
- **Antes** (plantilla de hoy): producción, `travelpuzzle.com.mx`, commit `7afa634` con `FICHA_UNICA_TANGOL_ENABLED: "preview"` (producción pinta la ficha de hoy).
- **Después** (plantilla única, `FichaView`): versión sin tráfico `pr-719-travel-puzzle-web.adrianrodvarmxb.workers.dev`, mismo código, donde la bandera en "preview" pinta la plantilla nueva.
- Lighthouse 12.2.1, Chromium headless, desde el contenedor de la constructora: móvil 3 corridas por lado, escritorio 2. Se compara la mediana con `compareWeight` (`src/perf/lib/budget.ts`).
- **Igual a igual:** el dominio de producción manda el CSS por Early Hints (Lighthouse lo cuenta en 0 bytes en 2 de 3 corridas) y suma el beacon de Cloudflare Web Analytics (`beacon.min.js`, `/cdn-cgi/rum`, ~10.5 KB) que `workers.dev` no tiene. La comparación igual a igual quita esas dos cosas de los dos lados; el CSS pesa lo mismo en ambos (31 KB transferidos, 189 KB sin comprimir).

## Resultado (KB transferidos, mediana)

| Dispositivo | Medición | Antes | Después | Diferencia | ¿No pesa más? |
|---|---|---|---|---|---|
| Móvil | crudo | 741.4 | 750.9 | +9.5 | — (no comparable: CSS por Early Hints y beacon) |
| Móvil | igual a igual | 730.1 | 719.8 | **−10.3** | Sí |
| Escritorio | crudo | 1,243.5 | 1,253.6 | +10.0 | — (misma razón) |
| Escritorio | igual a igual | 1,232.9 | 1,222.5 | **−10.4** | Sí |

Sin comprimir: móvil 1,631 → 1,600 KB (−31 KB), escritorio 2,130 → 2,100 KB (−30 KB). Por tipo (sin comprimir): JS 935 → 903 KB, HTML 95 → 109 KB, fuentes 94 → 81 KB (una woff2 menos), imágenes y CSS iguales. Peticiones: 49 → 46.

## Otras métricas (solo referencia; el contenedor es más lento que el Moto G Power de la base del 12-11, no se comparan con esa base)
- Móvil, mediana: TBT 1,384 → 593 ms; LCP 5.04 → 4.26 s; CLS 0.000 en los dos. TTFB del preview ~660 ms (workers.dev sin la caché del borde) contra ~30 ms en producción: el LCP del «después» va castigado por el servidor.
- Escritorio, mediana: TBT 157 → 84 ms; LCP 1.80 → 1.24 s.
- 0 imágenes fuera de pantalla en las 10 corridas (REQ-1564).
- REQ-1560 (LCP < 2.5 s móvil) y REQ-1562 (TBT < 200 ms móvil) siguen NO CUMPLIDO con las dos plantillas. REQ-1563 (< 1.5 MB) cumple en móvil (0.73 MB) y en escritorio para esta ficha (1.22 MB).

## Siguiente
- Al encender `FICHA_UNICA_TANGOL_ENABLED: "true"` (ranura Fable), repetir la medición en el mismo dominio de producción: así la comparación cruda ya es igual a igual.
- REQ-1560/1562: el JS (`1255-*.js` y el documento) es el principal costo de arranque; se ataca en la ola 15 con PRs propios, midiendo antes y después.

## 23-11-2026 · REQ-10865: zod y el diccionario fuera del navegador (#734)
- Qué cambió: la barra, el reporte de errores, la tarjeta del mapa y la etiqueta «Favorito» dejaron de arrastrar zod (~96 KB sin comprimir) y el diccionario de la taxonomía con sus mapeos validados al cargar.
- Primera carga (informe de `next build`, gzip): `/` 200 → 172 KB, `/tours` 255 → 205, `/destinos/[pais]/[ciudad]` 196 → 168, ficha 270 → 219, `/viajes/…` 235 → 183, `/tours/[id]` 231 → 203.
- Lighthouse 12.2.1 móvil contra producción (`www.travelpuzzle.com.mx`), mismo contenedor, 3 corridas por lado, antes (8:54 CDMX, `ef43df7`) y después (10:55 CDMX, `d73e4a0`):

| Página | TBT antes → después (mediana) | JS transferido | LCP (mediana) |
|---|---|---|---|
| Ficha `/destinos/ar/el-calafate/minitrekking-glaciar-perito-moreno` | 1,137 → 783 ms | 305 → 250 KB | 5.68 → 5.41 s |
| `/tours` | 680 → 401 ms | 297 → 244 KB | 6.95 → 6.00 s |

- REQ-1562 (TBT < 200 ms móvil) y REQ-1560 (LCP < 2.5 s) siguen NO CUMPLIDO; REQ-1563 baja de peso en las dos páginas.
- Siguiente: revisar qué scripts carga el arranque de la ficha y de `/tours` (Lighthouse `bootup-time` y `unused-javascript`) y atacarlos uno por PR.
