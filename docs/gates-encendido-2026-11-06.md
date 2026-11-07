# Gate — Encendido de banderas pendientes · 6 nov 2026

**Firma del PO:** 6 nov 2026, 21:53 (CDMX), mensaje literal: «ok de todo lo pendiente».

Alcance de la firma: encender, **una bandera por PR y un deploy a la vez** (Blindaje 9 y 10), las banderas de la lista de abajo cuyos prerrequisitos estén completos. Cada PR cambia solo esa bandera a `"true"` en `wrangler.jsonc` (y su fila en `docs/requisitos.md`), corre la prueba de humo contra un preview **con la bandera encendida** y entra a la fila de publicación solo con el humo en verde. El siguiente PR se crea desde `origin/main` cuando el anterior ya está fusionado.

La firma **no** cubre: aplicar migraciones, cargar datos, crear buckets, cambiar secretos, ni hacer reservas o cobros reales. Esos siguen siendo candados aparte.

## Migraciones aplicadas en producción (verificado en los runs de «Publicar en Cloudflare» con `migraciones=true`)

0012 (run 41995719021), 0014 (42106408170), 0015 (42133584731), 0013 y 0016 (42224640292), 0017 (42267732132), 0019 (42305329843), 0018 (42324330920). No existen 0020 ni 0021 en `migrations/` (solo en `docs/migraciones-propuestas/`).

## Lista y orden

| # | Bandera | REQ | Prerrequisitos (código y comentarios de `wrangler.jsonc`) | Decisión |
|---|---|---|---|---|
| 1 | `STRIPE_ENABLED` | REQ-610 (REQ-118) | 0013 aplicada; `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` y `STRIPE_WEBHOOK_SECRET` en la versión desplegada; webhook creado (`docs/gates-stripe-2026-11.md`) | Encender |
| 2 | `SEARCH_FUZZY_ENABLED` | REQ-611 | `SEARCH_V2_ENABLED="true"` (ya) | Encender |
| 3 | `SEARCH_SUGGEST_ENABLED` | REQ-612 | Ninguno además de humo | Encender |
| — | `SEARCH_LOG_ENABLED` | REQ-613 | 0019 aplicada, **pero** el aviso de privacidad (`docs/legal/propuesta-aviso-busquedas-2026-11.md`) no está en `src/legal/lib/privacidad.ts` y pide revisión legal | **Bloqueada** |
| — | `SEARCH_STEM_ENABLED` (y alias de `destino_alias`) | REQ-614 | Migraciones propuestas 0020 y 0021 sin aplicar (candado) | **Bloqueada** |
| 4 | `TAXONOMY_SYNC_ENABLED` | REQ-615 | 0017 aplicada | Encender |
| 5 | `TAXONOMY_PUBLISH_ENABLED` | REQ-616 | `PRIMERA_PIEZA_ENABLED="true"` (ya); el clasificador corre en código, no lee las tablas de la 0017 | Encender |
| 6 | `TAXONOMY_FILTERS_ENABLED` | REQ-617 | Después de `TAXONOMY_PUBLISH_ENABLED` | Encender |
| 7 | `TAXONOMY_LABELS_ENABLED` | REQ-618 | Requiere `TAXONOMY_PUBLISH_ENABLED` | Encender |
| 8 | `TAXONOMY_CIRCUITS_ENABLED` | REQ-619 | 0018 aplicada; `TAXONOMY_CIRCUIT_EXTRA_ENABLED` sigue en "false" (sin dato) | Encender |
| 9 | `NOSOTROS_ENABLED` | REQ-621 | Solo bloques «aprobado» (Cómo trabajamos, cifras en vivo del catálogo, datos de la agencia); historia, equipo y frase siguen en borrador y no salen | Encender |
| 10 | `CONTACTO_ENABLED` | REQ-622 | Buzón destino: `EMAIL_REPLY_TO` = info@travelpuzzle.com.mx (variable no secreta) y `RESEND_API_KEY` en la versión | Encender |
| 11 | `EXPERTOS_ENABLED` | REQ-623 | Mismo buzón que /contacto; «Quiénes te atienden» no sale sin personas con permiso | Encender |
| — | `BLOG_ENABLED` | REQ-624 | ≥ 3 artículos aprobados: hoy hay 0 publicados (un borrador) | **Bloqueada** |
| 12 | `ARMA_TU_VIAJE_ENABLED` | REQ-625 (PR #135) | Arreglos REQ-180…184 en main; falta la reserva de prueba real con el carrito con datos (solo el PO) | PR al día y listo; **no entra a la fila** hasta la reserva de prueba |
| — | `TAXONOMY_CART_ENABLED` | REQ-620 | Sin efecto mientras «Arma tu viaje» esté apagada: va **después** de `ARMA_TU_VIAJE_ENABLED` | Pendiente de #12 |

Siguen apagadas, fuera de esta firma: `STRIPE_HOLD_ENABLED` (no existe el cobro diferido) y `CART_PAYMENTS_ENABLED` (candado de pagos del carrito; requiere el carrito encendido).

## Plan de regreso (cada bandera)

Volver la bandera a `"false"` en `wrangler.jsonc` en un PR propio (o revertir el commit del PR de encendido) y publicar. Ninguna de estas banderas tiene migración ni datos que deshacer; `TAXONOMY_SYNC_ENABLED` deja filas en sus tablas propias, que nadie lee con la bandera apagada.
