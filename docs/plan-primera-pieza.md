# Plan «La Primera Pieza» (decisión del PO, 5 nov 2026)

Renombrar la colección de free tours a **La Primera Pieza**, reorganizar el sitio por destinos para SEO, crear el carrito **Arma tu viaje** y preparar el sitio para sitelinks. Debe escalar a todos los países sin código por país, sin romper la sincronización diaria con FREETOUR y cumpliendo todos sus términos. Trabajamos con la Partners API v2.2 en Modo 2.

Estado: **PLAN, sin código**. Cada ola es un PR. No se hace merge ni deploy sin el OK visual del PO.

---

## 1. Cómo funciona hoy la sincronización diaria (auditoría de solo lectura)

| Pieza | Hoy | Archivo |
|---|---|---|
| Dónde corre | Cron del Worker de Cloudflare **cada minuto**, que llama a `/api/cron/sync-tours` con `CRON_SECRET`. | `worker.ts`, `wrangler.jsonc`, `src/app/api/cron/sync-tours/route.ts` |
| Cuándo | La corrida del día arranca **a partir de las 3:00 a. m. de CDMX**. Procesa **una página de 100 tours por minuto** (unas 81 páginas, alrededor de 1 h 20 min). Con el catálogo terminado, los minutos libres traen reseñas (5 por minuto) y salidas (8 tours por minuto, REQ-049). | `src/catalog/lib/sync-plan.ts` (puro), `src/catalog/sync.ts` |
| Qué lee | `GET /tours?page=N`, el catálogo **completo** todos los días. No usa `updatedSince`. Ciudades: `GET /cities/{país}`, solo para las ciudades que aún no existen. Salidas: `GET /tours/{id}/events`, aparte y escalonado. | `sync.ts`, `departures/sync.ts` |
| Qué escribe | Upsert en D1 de `Country`, `City` (solo las nuevas) y `Tour` + `TourTranslation`, con `lastSeenAt = inicio de la corrida`. Guarda el avance en `SyncMetadata` (status, nextPage, totalPages, runStartedAt). | `catalog/repository.ts`, `catalog/lib/sql.ts` |
| Altas | Un tour nuevo entra por el upsert (`externalId` único, `id` interno cuid). | `lib/sql.ts` |
| Cambios | Se reescriben todos los campos en cada corrida, haya cambiado algo o no. | `lib/tour-rows.ts` |
| Bajas | Al cerrar, `deactivateNotSeenSince(runStartedAt)` pone `isActive=false` a todo tour que no apareció **en esa corrida**. Una sola ausencia basta. | `repository.ts` |
| Errores | Si falla una página, guarda `status=failed` y el minuto siguiente reintenta la misma. | `sync.ts` |
| Índice de búsqueda | Al cerrar, rehace el FTS solo si `SEARCH_V2_ENABLED`. | `search/fts-search.ts` |

**Riesgos que encontré** (los ataca la Ola 1):
1. **No hay barrera de cordura.** Si un día la API devuelve menos páginas (`totalPages` bajo) o páginas vacías, el cierre desactiva todo lo que no vino. Un solo mal día puede apagar el catálogo.
2. **Baja inmediata.** Un tour que falta una sola vez se desactiva; no existe el estado intermedio "missing".
3. **Sin respaldo ni publicación atómica.** Se escribe página por página sobre la tabla viva; el sitio ve un catálogo a medias mientras corre.
4. **Escribe todo siempre.** Sin `content_hash`, correr dos veces escribe dos veces, y `updatedAt` no sirve como `lastmod` real.
5. **Ciudad sin coordenadas ni geonameid.** La ciudad usa el id de FREETOUR y no hay slug. El tour sí trae `coordinates` (punto de encuentro).
6. **Sin alerta** si pasan muchas horas sin un sync exitoso.

Lo que ya existe y se reutiliza:
- Correo de confirmación de Modo 2 con los 9 datos (`notifications/lib/booking-email.ts`, que ya tiene un test).
- Webhook de rechazo que confirma con la API antes de actuar (`api/freetour/booking-rejected`).
- Recordatorios automáticos (`booking/auto-emails.ts`).
- Interruptor de versión de la API v2.2 (PR #94).

---

## 2. Cumplimiento FREETOUR (skill `cumplimiento-freetour`)

**Paso 1, releer las fuentes: NO VERIFICADO HOY.** Esta sesión no puede abrir freetour.com ni admin.freetour.com porque los dominios no están permitidos. Uso la instantánea de la skill, revisada completa el mismo 5 nov 2026. Antes del primer PR de código hay que releerlas desde un navegador.

Veredictos: **P** = permitido, **X** = prohibido, **A** = ambiguo, pedir por escrito, **O** = obligatorio que falta.

| # | Elemento | Regla | Veredicto | Ajuste |
|---|---|---|---|---|
| 1 | Colección «La Primera Pieza» (menú, hub, insignia) | C4 | **P** como nombre de colección | Nunca reemplaza el título real ni el nombre del proveedor. Confirmar por escrito (pregunta 5). |
| 2 | H1 de la ficha = título real de FREETOUR, más el nombre del proveedor | C4, A2 | **P** (lo exige A2) | Test. |
| 3 | Insignia «🧩 Primera Pieza · Tú decides cuánto vale» | D1, D2, C5 | **P** solo si es free y `fullPricePerGroup = 0` para el grupo elegido | Fuera de la foto. Test REQ. |
| 4 | Aviso por evento (umbral de tarifa fija, EUR con MXN aproximado, cancelación) | D2, D3, D4 | **P** | El umbral se calcula por evento, nunca fijo en «5 adultos». |
| 5 | Tours de pago: cancelación hasta 24 h y pago a la llegada | D3, D5, D7 | **P** | Mostrar el pago a la llegada cuando aplique. |
| 6 | «Operado por un guía local · {proveedor}» | C3, C6 | **P** | Por regla del PO, FREETOUR no se menciona al cliente: ni nombre ni logo. Así no se presenta a Travel Puzzle como operador. |
| 7 | Reseñas de FREETOUR en la ficha | C7 | **P** como reseñas del tour | Nunca como reseñas de Travel Puzzle. AggregateRating solo con reseñas reales. |
| 8 | «★ Favorito de los viajeros» | C7 | **P** con criterio real | Criterio propuesto: calificación ≥ 4.7 y ≥ 50 reseñas (gate). |
| 9 | Hubs y fichas indexables (SEO) con títulos, descripciones y fotos de FREETOUR | C1, C2 | **A** | Mostrar y cachear para vender: P. Hacer indexable una ciudad: solo con texto propio (guía ≥ 300 palabras). Pedir por escrito si se puede indexar el contenido de FREETOUR (pregunta 5). |
| 10 | Reescribir descripciones de FREETOUR para SEO | C2 | **A** | No se hace. Se muestra el texto original y lo editorial va aparte. |
| 11 | Sin texto, logo ni insignia sobre las fotos | C5 | **P** (obligatorio de diseño) | Test visual. |
| 12 | Free tour reservado al momento por API; «Arma tu viaje» se abre después | A1, E2, D6 | **P** | Evento en vivo (`GET /events/{id}`) antes de reservar. |
| 13 | Contacto de la reserva adulto | G3 | **O** (validación) | Casilla «Soy mayor de 16», o el contacto debe ser adulto. |
| 14 | Carrito con piezas de otros proveedores y carrusel con competidores | I | **P** | Cada tarjeta dice quién cobra. |
| 15 | Cobro dividido; FREETOUR con su `paymentUrl` que expira | D5, D6 | **P** | Si expira, se pide otro. Error 63: cron cada 10 min como mínimo. **Candado Stripe/pagos.** |
| 16 | Seguro solo por enlace de afiliado | (ley MX) | **P** | No se cotiza ni se cobra en el carrito. |
| 17 | Correos de confirmación, recordatorio, cancelación y rechazo | A2, A3 | **O**, ya existen | Agregar el test de los 9 campos con ID REQ y la prueba en cada release. |
| 18 | FREETOUR ya no manda correos a nuestros clientes | A4 | **O** (validar) | Reserva de prueba en cada release; se cancela y se registra. |
| 19 | Correo o WhatsApp post-tour con complementos de otros proveedores | B3, G1 | **P** (sujeto a LFPDPPP) | Consentimiento de marketing separado. |
| 20 | Correo o WhatsApp post-tour que promueva tours de FREETOUR | B2, B3 | **X** hasta autorización escrita | Bandera apagada. |
| 21 | Mila u otro chatbot que venda o reserve tours de FREETOUR | B2 («bots») | **X** hasta autorización escrita | Bandera apagada. |
| 22 | Puzzle Rewards por reservas, asistencia o reseñas de FREETOUR | B4 | **X** | Solo premia productos que no son de FREETOUR. Test: ningún premio por FREETOUR. |
| 23 | Mensajes al proveedor (`/booking/messages`) | A5 | **P** sin enlaces y con un máximo de 5000 caracteres | Test. |
| 24 | Rutas nuevas y 301 desde /tours/{id} | C1 | **P** | El id de FREETOUR no va en la URL. |
| 25 | 410 para tours retirados | C1 | **P** | Página útil que enlaza a su ciudad. |
| 26 | Sync incremental con `updatedSince`, barrera de cordura y respaldo | E1, E3 | **P** (lo pide la guía) | Fechas con `utcDate`. |
| 27 | Reintentos 429 y login sin bucle | E4 | **O** | Test. |
| 28 | API key solo en variables de entorno; rotar la llave de 2024 | E7 | **O** | Candado de secretos: lo hace el PO. |
| 29 | Aviso de privacidad (transferencia fuera de la UE) y política de cookies propia | G4, G5 | **O** | Nueva política de cookies y aviso de privacidad actualizado. |
| 30 | robots.txt y llms.txt con La Primera Pieza | C2 | **P** | Sin copiar textos de FREETOUR en llms.txt. |
| 31 | Anuncios, SEO y blog | B3 | **P** (no están en la lista prohibida) | Ninguno. |
| 32 | Aprobación para promover free tours (§7.1) | B1 | **A** | Pregunta 7. |

Lo prohibido y lo ambiguo queda tras una bandera apagada hasta tener la autorización guardada en `docs/freetour/autorizaciones.md`. Las preguntas pendientes 1 a 9 van en un borrador de correo para Ignacio Merino.

---

## 3. Olas (orden por dependencias)

Cada ola es su propio PR con tests primero, suite completa, build, prueba de humo a 390 y 1366 px, y OK del PO. Las migraciones y las escrituras de datos van en su propio PR (candado).

| Ola | Qué | REQ | Candados |
|---|---|---|---|
| **0** | Este PR: plan, requisitos, `autorizaciones.md`, diccionario de datos | REQ-069, 070 | Ninguno |
| **1** | Blindaje del sync: barrera de cordura, respaldo y publicación atómica, `content_hash`, missing → removed, `updatedSince` y `utcDate`, reintentos, log y alerta de 26 h | REQ-071…078 | Migración 0013 (columnas de estado y hash) |
| **2** | Comunicación Modo 2: test de los 9 campos, prueba de no-correos de FREETOUR, post-tour sin FREETOUR, sin premios, mensajes sin enlaces, contacto adulto, LFPDPPP y cookies | REQ-079…084 | Ninguno (copy legal: revisión del PO) |
| **3** | Identidad: ISO-2, geonameid, `tour_uid`, slug puro e inmutable con pinyin y sufijo de estado | REQ-085…087 | Migración 0014 + llenado de slugs (datos de producción) |
| **4** | Rutas por destino y regla de indexación (≥ 3 tours, o ≥ 1 tour + guía de 300 palabras; noindex tras 14 días), 301 y 410 | REQ-088…092 | Ninguno |
| **5** | Ficha y textos: menú nuevo, título real, insignia, aviso por evento, tours de pago, «Operado por…», reseñas, Favorito | REQ-093…098 | Ninguno |
| **6** | SEO técnico: titles y H1, JSON-LD, «Actividades destacadas», canonical, sitemaps por país, robots y llms.txt | REQ-099…103 | DNS/Cloudflare: solo revisar los bots, sin cambiar nada |
| **7** | «Arma tu viaje» y carrusel: CartItem, ProviderAdapter (api/deeplink), interruptor automático, cobro dividido, reglas por destino, eventos de medición | REQ-104…110 | **Pagos/Stripe**: solo stage, cobro real con OK |
| **8** | Métricas en STATUS.md con metas firmadas | REQ-111 | Ninguno |

¿Por qué la Ola 1 va primero? Las rutas, la indexación y los sitemaps se calculan con los datos del sync. Si el sync puede apagar el catálogo en un mal día, todo lo demás hereda ese riesgo.

---

## 4. Estructura de carpetas nueva

```
docs/
  plan-primera-pieza.md          (este plan)
  diccionario-datos.md           NUEVO: provider_id, external_id, tour_uid, slug, city_code, status
  freetour/autorizaciones.md     NUEVO: registro con fecha de lo que FREETOUR autorice por escrito
migrations/
  0013_sync_presencia.sql        Ola 1: Tour.contentHash, Tour.syncStatus (active|missing|removed), Tour.missingRuns, SyncRun (log)
  0014_identidad_slugs.sql       Ola 3: Country.iso2, City.geonameid/slug/stateCode/guide, Tour.slug (único, inmutable), Tour.providerId
src/
  catalog/lib/
    sanity.ts         Ola 1  barrera de cordura (vacío, error, >20 % menos)            puro
    content-hash.ts   Ola 1  hash sin calificación                                    puro
    presence.ts       Ola 1  active → missing → removed (3 corridas)                  puro
    retry.ts          Ola 1  429/Retry-After, login sin bucle, error 63 ≥ 10 min       puro
  destinations/
    lib/slug.ts       Ola 3  slug: minúsculas, sin acentos, [a-z0-9-], ≤60, pinyin     puro
    lib/ids.ts        Ola 3  ISO-2, geonameid, tour_uid                                puro
    lib/indexing.ts   Ola 4  regla de indexación ciudad/país + 14 días                 puro
    lib/routes.ts     Ola 4  URLs canónicas, 301 y 410                                 puro
    load.ts           Ola 4  lee D1 (inyectado)
  tours/lib/
    badge.ts          Ola 5  insignia Primera Pieza (fullPricePerGroup)                puro
    notice.ts         Ola 5  aviso por evento, EUR con MXN aproximado, cancelación     puro
    favorite.ts       Ola 5  criterio real de «Favorito»                               puro
  seo/lib/
    titles.ts  jsonld.ts  sitemaps.ts   Ola 6                                          puros
  cart/
    lib/item.ts       Ola 7  CartItem (tipo, provider_id, external_id, ISO 4217, estado, política)
    lib/adapter.ts    Ola 7  interfaz ProviderAdapter (buscar, disponibilidad, reservar, cancelar, cobrar)
    lib/switch.ts     Ola 7  api → deeplink → WhatsApp → oculto                        puro
    lib/split.ts      Ola 7  cobro dividido por proveedor                              puro
    adapters/freetour.ts  deeplink.ts  whatsapp.ts                                     I/O inyectado
  companions/lib/
    carousel.ts       Ola 7  reglas (<72 h, MX, China, Perú; 3/4 tarjetas)             puro
    events.ts         Ola 7  vista, agregada, reservada, cotización                    puro
  app/
    la-primera-pieza/page.tsx
    destinos/page.tsx  destinos/[pais]/page.tsx  destinos/[pais]/[ciudad]/page.tsx
    destinos/[pais]/[ciudad]/[slug]/page.tsx
    arma-tu-viaje/page.tsx
    sitemap-index.xml/  sitemap-destinos.xml/  sitemap-tours-[pais].xml/   (route handlers)
```

**SOLID:**
- **SRP:** cada regla vive en su propia función pura.
- **OCP:** un proveedor nuevo es un adaptador nuevo, sin tocar el carrito.
- **LSP:** todo adaptador cumple la misma interfaz y cae a WhatsApp si falla.
- **ISP:** el adaptador expone solo las 5 operaciones.
- **DIP:** las páginas reciben repositorios y adaptadores por parámetro; `lib/` no importa I/O.

**Unit tests por pieza:** cada archivo de `lib/` tiene su `*.test.ts` con nombres `REQ-###`, y se corre con `npx vitest run <archivo>`. Los fixtures de la sección 11 del pedido van en la Ola 1 y la Ola 4.

---

## 5. Gates firmados por el PO (5 nov 2026)

| # | Gate | Decisión |
|---|---|---|
| 1 | Orden de las olas | **Ola 1 primero** (blindaje del sync) y después las demás, en el orden del plan |
| 2 | «★ Favorito de los viajeros» | **Calificación ≥ 4.7 y ≥ 50 reseñas** (REQ-098) |
| 3 | geonameid de las ciudades | **Cruce automático + revisión**: un workflow baja GeoNames y cruza por país + nombre + cercanía al centroide de los puntos de encuentro; lo dudoso va a una lista para revisión manual (REQ-085) |
| 4 | Viajes propios (`/viajes/...`) | **Entran a `/destinos` con 301**: aparecen en la sección Tours de su ciudad y su ficha pasa a `/destinos/{pais}/{ciudad}/{slug}` (REQ-088, REQ-092) |
| 5 | Metas de las métricas | **Firmadas**: ≥ 98 % de tours con ciudad válida · 0 slugs duplicados · < 26 h desde el último sync exitoso · ≥ 95 % de corridas exitosas en 30 días · ≤ 5 ciudades que cambian de indexación por semana · la tasa de agregado del carrusel se mide 4 semanas y luego se fija la meta (REQ-111) |
| 6 | Correo de preguntas a FREETOUR | **El PO lo revisa primero** (sigue en borrador en Gmail). Versión final con 7 preguntas más la rotación de la API key; se quitó la pregunta del logo porque FREETOUR no se menciona al cliente. |
