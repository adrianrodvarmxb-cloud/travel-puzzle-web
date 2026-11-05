# STATUS — travel-puzzle-web

Actualizado: 5 nov 2026, 11:45 (CDMX).

## Resumen del 5 nov 2026

**Publicado hoy (cada uno con deploy y prueba de humo en producción en verde):**
- **China (Fantástica China):** 44 viajes en vivo; 7 en borrador (6 extensiones y Macao, que no tiene precio). Margen firmado: 14 % en el clásico de 8 días, 25 % en nicho (Gran Lujo, Tíbet, Ruta de la Seda) y 20 % en el resto. Fotos curadas sin repetir entre viajes (PR #95).
- **Perú (Inca World):** 6 excursiones de un día más (Humantay, 2 raftings, bungee, slingshot y sandboarding); van 36 publicados de 45 (PR #96).
- **Header animado y menú** en todo el sitio público. El menú del celular se arma desde la lista de secciones del home e incluye «Viajes armados por expertos» (Perú y China). Un test rompe CI si se agrega una sección sin entrada en el menú (REQ-062, REQ-068, PR #93).
- **Opciones y precios** de los viajes en USD con los pesos aproximados al lado (REQ-112, PR #98).
- **Freetour 2.2:** interruptor `FREETOUR_API_VERSION`; sin la variable sigue en 2.0 y no cambia nada (REQ-113, PR #94; plan en `docs/plan-freetour-v22.md`).
- **Plan «La Primera Pieza»:** auditoría del sync, cumplimiento FREETOUR (32 elementos), REQ-069 a REQ-111, 8 olas y gates 1 a 6 firmados (`docs/plan-primera-pieza.md`, PR #97).

**En curso:** Ola 1 (blindaje del sync, REQ-071 a REQ-078). La migración 0013 irá en un PR aparte, con OK del PO.

**Falta el OK del PO:**
1. Migración 0013 y código de la Ola 1.
2. Encender `DEPARTURE_FILTERS_ENABLED` (idioma y fecha) tras probarlo en preview.
3. Encender `SEARCH_V2_ENABLED` (relevancia) tras probarlo en preview.
4. Activar las funciones de Freetour 2.2, una a la vez: mensaje al guía, reseñas, editar reserva y tours de pago (candado Stripe; PR #62 y migración 0009).

**Correos que Claudia debe enviar (borradores en Gmail):**
- Ignacio (FREETOUR): «Travel Puzzle × FREETOUR.com: ya en producción», con 7 preguntas de cumplimiento.
- César (Inca): fotos de 7 tours, 2 precios que no cuadran y un neto más competitivo en Humantay (Civitatis la vende en USD 28; nuestro neto es USD 35).
- Beibei (Fantástica China): precio de Macao.

**Falta definición:**
- Inca: base de precio de los 30 programas, 9 excursiones en borrador y el aviso mínimo de 60 días contra los 90 que necesita Machu Picchu.
- China: visa, temporadas y fuente de excursiones de un día (Klook o tours de pago de Freetour).
- Turismo Asiático y Extime: faltan los PDF, saber si son netos o comisionables y las fotos.
- Rotar la API key de Freetour (pendiente, fuera del correo).

**Sin iniciar (en cola):** Olas 2 a 8 de La Primera Pieza; revisar la cobertura de salidas; cerrar INC-004 e INC-005 y REQ-039 en docs; proveedores nuevos (Big Bus, Bedsonline, Oku Japan, Travelpayouts).

**Métricas firmadas (Ola 8):** ≥ 98 % de tours con ciudad válida · 0 slugs duplicados · < 26 h desde el último sync exitoso · ≥ 95 % de corridas exitosas en 30 días · ≤ 5 ciudades que cambian de indexación por semana · tasa de agregado del carrusel: se fija tras 4 semanas de medición.

## En producción (travelpuzzle.com.mx, Cloudflare Workers + D1)
- Catálogo de Freetour sincronizado a diario (~8,000 tours) y reseñas reales en caché (7 días, top 300 tours).
- Home con secciones rescatadas del sitio anterior, datos reales y prueba social (ver `docs/gates-home-2026-11.md`).
- /tours y página de cada tour con reseñas, etiqueta "Favorito de los viajeros" y frase destacada.
- Diseño tecnológico en home y página del tour (header y footer sin cambios); mapa del mundo (OpenFreeMap + MapLibre) y mapa del punto de encuentro.
- /tours con el diseño tecnológico: buscador arriba, "Ordenar por" (más reseñas, mejor calificados, precio), filtros plegables en celular.
- Línea de comunicación (docs/linea-comunicacion.md): sin adjetivos inflados, lema registrado "Te armamos tu viaje".
- Vista previa al compartir (Open Graph) del sitio y de cada tour; ícono de Travel Puzzle (antes el de Vercel).
- Regla 60/40 (pago/gratis) en todas las recomendaciones; activa al encender `PAID_TOURS_ENABLED`.
- Correos de acompañamiento (confirmación, recordatorios, cancelación, rechazo, post-tour) listos; **apagados** por bandera.
- Página privada de la reserva (/reserva/[token]).
- Sección legal: /terminos y /privacidad (textos revisados por el abogado + ajustes firmados en `docs/gates-legal-2026-11.md`), enlaces en el footer y aviso simplificado en el formulario de reserva.

## Banderas (wrangler.jsonc, 5 nov 2026)
- Encendidas: `BOOKINGS_ENABLED`, `EDIT_ENABLED`, `EMAILS_ENABLED`, `OWN_TOURS_ENABLED`, `TRANSFERS_ENABLED`, `AFFILIATES_ENABLED`, `DEPARTURES_SYNC_ENABLED`.
- Apagadas: `PAID_TOURS_ENABLED`, `REVIEW_EMAILS_ENABLED`, `TRANSPORT_ENABLED`, `STRIPE_HOLD_ENABLED`, `DEPARTURE_FILTERS_ENABLED`, `SEARCH_V2_ENABLED`.
- `SYNC_GUARD_ENABLED=false`: sync blindado de FREETOUR (Ola 1). Se enciende solo después de aplicar la migración 0014, con preview, prueba de humo y OK del PO.
- `FREETOUR_API_VERSION` sin definir (Freetour API 2.0).

## Pasarela — robustez (punto 16, nov 2026)
- Token por intento (24 h) + bloqueo de traslapes; IP de salida obligatoria; espera tras login fallido;
  timeout de 35 s; rechazo no confirmado → 503. Gates en `docs/gates-pasarela-2026-11.md`.
- **La pasarela no se publica con el merge:** hay que subir `gateway/` a cPanel y reiniciar la app
  (confirmar antes `FREETOUR_LOCAL_ADDRESS`).

## Viajes propios y de agencias (punto 17, nov 2026)
- Ola 1: gestor en `/admin/viajes` (entrada `/admin/entrar`, solo rol ADMIN), migración 0006 (Agency, Trip), fotos en R2 `travel-puzzle-trips`.
  Gates en `docs/gates-viajes-propios-2026-11.md`. Aún no se ve nada en el sitio público.
- Ola 1b (gates G–J): migración 0007, código automático, opciones/precios, disponibilidad, cancelación, checklist GYG. Traducción automática (gate I): Workers AI (binding AI, llama-3.3-70b), se traduce al guardar idioma por idioma; pestaña Traducciones con candado manual. En local la IA no corre (remoteBindings: false).
- Ola 2 (gates K–N): ficha /viajes/{destino}/{slug}, mezcla en /tours, carrusel, formularios de solicitud, thank you page, correos (cliente + info@) y panel /admin/solicitudes (migración 0008). Todo tras OWN_TOURS_ENABLED=false. Token Banxico en GitHub → Worker.
- Transporte (3 nov 2026): interruptor propio TRANSPORT_ENABLED=false. Big Bus cargado: 30 ciudades, 19 publicadas (5+ fotos), 11 en borrador por fotos; traducidas. Fotos tomadas de su sitio: confirmar con Rosie el permiso para la web. Siguiente: olas X2/X3 de venta cruzada.
- (antes) Ola 2: ficha, /tours, carrusel, 3 formularios, thank you page, correos, precio en pesos. Ola 3: pago y pasaportes.

## Pendientes
- Freetour (Elias): habilitar cancelación; dejar de mandar sus correos en modo 2; cancelar 2 reservas de prueba; nuevo webhook `https://travelpuzzle.com.mx/api/freetour/booking-rejected` (borrador listo).
- Reseñas de clientes listas (`/reserva/[token]/resena`, aviso a info@, `/resenas/moderar`, `/admin/resenas`); requiere la migración 0005 — docs/gates-resenas-2026-11.md. Falta encender `REVIEW_EMAILS_ENABLED`.
- Paso de reserva con el estilo de los correos y `/reserva/[token]/modificar` listos (`EDIT_ENABLED=false` hasta el permiso de Freetour) — docs/gates-reserva-estilo-2026-11.md.
- Respaldo del sitio viejo de Vercel: hecho (docs/respaldo-vercel-2026-11.md); archivos entregados al PO.
- Centro de ayuda `/ayuda` listo tras `BOOKINGS_ENABLED` (docs/gates-ayuda-2026-11.md).
- Viajes en grupo: no se publica nada hasta tener autorizaciones de clientes (decisión 3 nov 2026). Garantías Travel Puzzle: las define Claudia.
- /tours: lista y mapa (pines por tour) y duración (orden "Más cortos primero" y filtro ?duracion=). Requiere la migración 0004 (`durationMinutes`) aplicada en producción — docs/gates-tours-mapa-2026-11.md.
- Al subir la versión de `maplibre-gl`, copiar su worker a `public/maplibre/` (lo vigila `src/components/map/maplibre.test.ts`).
- Fuera de alcance por ahora: Puzzle Rewards, ofertas, boletín, administrador de tours propios.
- Tours con costo: aviso de pago (depósito/resto en el punto de encuentro), cancelación y no presentarse como en Freetour, en ficha y paso de reserva tras `PAID_TOURS_ENABLED`. Antes de encender: confirmar con Elias que el depósito de reservas por API tampoco es reembolsable.
- Legal: cuando se encienda `PAID_TOURS_ENABLED` con pago al llegar y tarjeta de garantía, revisar con el abogado la cláusula de cargo por no presentarse. Validar con el abogado el aviso contra la nueva ley de datos (mar 2025) y el plazo ARCO de 15 días.
- Operación: no mandar correos masivos promocionando tours de Freetour (sus términos, 7.2); la publicidad por correo solo de tours propios.
- Seguridad: rotar la contraseña de la API de Freetour. Repo público con candados (escaneo y bloqueo de secretos, Dependabot, `main` protegida, PR externos con aprobación) — 3 nov 2026.

## INC-001 (3 nov 2026) — matriz de trazabilidad
| ID | Requisito | Archivo(s) | Test | Estado |
|---|---|---|---|---|
| REQ-001 | Ninguna página pública lanza excepciones en el cliente | `src/components/trips/OwnTripCard.tsx`, `src/ops/lib/smoke.ts` | `OwnTripCard.test.ts`, `smoke.test.ts` | CUMPLIDO |
| REQ-002 | Si una sección falla, el resto sigue | `src/components/common/SectionBoundary.tsx`, `src/app/page.tsx`, `ToursPageClient.tsx` | `SectionBoundary.test.ts` | CUMPLIDO |
| REQ-003 | Ningún deploy llega a producción si el smoke falla | `.github/workflows/deploy-cloudflare.yml`, `.github/workflows/prueba-humo.yml`, `src/scripts/smoke.ts`, `src/ops/lib/smoke.ts` | `smoke.test.ts` | CUMPLIDO (deploy #60) |
| REQ-004 | País de tarjetas calculado en el servidor | `src/trips/lib/geo.ts`, `src/trips/public-load.ts`, `OwnTripCard.tsx` | `OwnTripCard.test.ts`, `geo.test.ts` | CUMPLIDO |
Detalle: `docs/incidentes/INC-001.md`.

## Ola X2a — venta cruzada en fichas (3 nov 2026)
| ID | Requisito | Archivo(s) | Test | Estado |
|---|---|---|---|---|
| REQ-005 | Franja de transporte en la ficha del tour | `src/trips/lib/match.ts`, `src/trips/cross-sell.ts`, `CrossSellStrip.tsx`, `tours/[id]/page.tsx`, `TourSidebar.tsx` | `match.test.ts`, `cross-sell.test.ts` | EN CURSO |
| REQ-006 | Ventana "Completa tu viaje" al apartar | `src/trips/lib/cross-sell-copy.ts`, `CompleteTripSheet.tsx`, `TourDetailClient.tsx`, `TourMobileBar.tsx` | `cross-sell-copy.test.ts`, `match.test.ts` | EN CURSO |
| REQ-007 | Tours de la ciudad en la ficha del transporte | `src/trips/cross-sell.ts`, `cross-sell-deps.ts`, `viajes/[destino]/[slug]/page.tsx` | `match.test.ts`, `cross-sell.test.ts` | EN CURSO |
| REQ-008 | Bandera, aislamiento y textos del servidor | `cross-sell-copy.ts`, `SectionBoundary` | `cross-sell-copy.test.ts` | EN CURSO |
| REQ-009 | Franja también con reservas en línea | `src/tours/lib/booking-cta.ts`, `TourSidebar.tsx` | `booking-cta.test.ts`, `TourSidebar.test.ts` | EN CURSO |

## Reservas en modo 2 (4 nov 2026)
| ID | Requisito | Archivo(s) | Test | Estado |
|---|---|---|---|---|
| REQ-015 | Teléfono obligatorio sin "(opcional)" | `src/booking/lib/phone-field.ts`, `EventBookingForm.tsx` | `phone-field.test.ts` | CUMPLIDO |
| REQ-016 | Calendario sin horarios pasados | `src/tours/lib/upcoming.ts`, `TourAvailabilityCalendar.tsx` | `upcoming.test.ts` | CUMPLIDO |
| REQ-017 | Cancelación siempre posible (respaldo manual si Freetour da 403) | `src/booking/lib/cancel-fallback.ts`, `manage.ts`, `cancelar/route.ts`, `CancelBooking.tsx`, `BookingPageView.tsx` | `cancel-fallback.test.ts`, `manage.test.ts` | CUMPLIDO |
| REQ-018 | WhatsApp opcional de verdad | `src/lib/api/schemas/FTBooking.Schema.ts` | `FTBooking.Schema.test.ts` | CUMPLIDO |
Hallazgo: la pasarela ya manda refNumber, eventId, adults y children a /booking/cancel (como pide la especificación v2.0–v2.2); el 403 "Bookings are not allowed" es un permiso pendiente en Freetour. Prueba real 4 nov: reserva 6782-20261104134017-915 (Mpika).
| REQ-027 | Travelpayouts Drive tras bandera y solo en rutas elegidas | `src/affiliates/lib/drive.ts`, `AffiliateDrive.tsx`, `app/layout.tsx` | `drive.test.ts` | EN CURSO (apagado) |
| REQ-028 | Página /traslados con buscador Kiwitaxi tras bandera | `src/transfers/lib/widget.ts`, `TransfersWidget.tsx`, `app/traslados/page.tsx` | `widget.test.ts` | EN CURSO (apagado) |
| REQ-037 | Enlace Traslados en el menú tras bandera | `src/transfers/lib/nav.ts`, `Navbar.tsx`, `FeatureFlags.tsx` | `nav.test.ts` | CUMPLIDO |
| REQ-040 | Política de cancelación por ficha (precio + aceptación) | `src/trips/lib/cancel-policy.ts`, `TripPriceBox.tsx`, `TripRequestForm.tsx`, ficha de viaje | `cancel-policy.test.ts` | CUMPLIDO |
| REQ-041 | T&C remiten a la política de cada ficha y al operador local | `src/legal/lib/terminos.ts` | `legal.test.ts` | CUMPLIDO (validar con abogado) |
| REQ-038 | Precio de venta desde tarifa neta (márgenes por parámetro) | `src/trips/lib/markup.ts` | `markup.test.ts` | CUMPLIDO |
| REQ-039 | Carga masiva de viajes de operador (ensayo por defecto) | `src/trips/lib/bulk-import.ts`, `src/scripts/import-trips.ts`, `.github/workflows/importar-viajes.yml` | `bulk-import.test.ts` | EN CURSO |
| REQ-042 | Galería en mosaico que se acomoda al número de fotos | `src/trips/lib/gallery-layout.ts`, `src/components/trips/TripGallery.tsx` | `gallery-layout.test.ts` | CUMPLIDO |
| REQ-043 | Mínimo de 1 foto para publicar (antes 5) | `src/trips/lib/publish.ts` | `publish.test.ts`, `manage.test.ts` | CUMPLIDO |
| REQ-044 | Mapa del punto de encuentro no tapa el texto | `src/components/trips/TripMeetingPoints.tsx` | revisión visual 390/1366 | CUMPLIDO |
| REQ-045 | Burbuja de WhatsApp aparece tras la galería en celular (fichas) | `src/home/lib/bubble.ts`, `WhatsAppBubble.tsx` | `bubble.test.ts` | CUMPLIDO |
| REQ-046 | Viajes propios respetan buscador, ciudad y precio en /tours (INC-004) | `src/trips/lib/public.ts`, `OwnTripsInTours.tsx`, `ToursPageClient.tsx` | `public.test.ts` | CUMPLIDO |
| REQ-047 | Tarjetas de viajes en caché compartida (INC-004) | `src/trips/public-load.ts` | prueba de carga (carga.mjs) | CUMPLIDO |
| REQ-048 | Buscador con relevancia FTS5 (ola 1) | `src/search/*`, `migrations/0011_busqueda_fts.sql`, `src/catalog/lib/query.ts`, `src/tours/lib/sort.ts`, cron sync | `fts-query.test.ts`, `fts-search.test.ts`, `query.test.ts`, `sort.test.ts`, `sync.test.ts` | EN CURSO |
| REQ-057 | Búsqueda por destino y palabra completa (INC-005) | `src/catalog/lib/query.ts`, `src/trips/lib/public.ts` | `query.test.ts`, `public.test.ts` | CUMPLIDO |
| REQ-058 | Llave de caché del catálogo con firma de forma | `src/catalog/lib/query.ts`, `src/catalog/snapshot.ts` | `query.test.ts` | CUMPLIDO |
| REQ-059 | "Cómo funciona tu reserva" según lo que existe (Stripe tras bandera) | `src/trips/lib/booking-steps.ts`, ficha `/viajes` | `booking-steps.test.ts` | CUMPLIDO |
| REQ-060 | Política de cancelación solo desde la casilla de aceptación | ficha `/viajes`, `PolicyLink.tsx`, `TripRequestForm.tsx` | revisión visual 390/1366 | CUMPLIDO (validar con abogado) |
| REQ-049 | Salidas comunes a todos los proveedores + filtros idioma/fecha | `src/departures/*`, `migrations/0012_salidas.sql`, `src/catalog/lib/query.ts` | `src/departures/*.test.ts`, `query.test.ts` | EN CURSO |
| REQ-051..055 | Tipo, cancelación gratuita, privado, recogida, novedad | `src/tours/lib/extra-filters.ts`, `query.ts`, `src/trips/lib/public.ts` | `extra-filters.test.ts`, `query.test.ts`, `public.test.ts` | CUMPLIDO |
| REQ-056 | Pantalla de filtros estilo Civitatis | `src/components/tours/filters/*`, `ToursPageClient.tsx` | `extra-filters.test.ts`, `filters-copy.test.ts` + revisión visual | EN CURSO |
| REQ-061 | Idioma y fecha ocultos hasta cubrir el catálogo | `MoreFilters.tsx`, `/tours`, `wrangler.jsonc` | revisión visual | CUMPLIDO |
| REQ-113 | Interruptor FREETOUR_API_VERSION (2.0 por defecto) | `src/freetour/lib/hosts.ts`, `gateway/lib/api-version.js`, `gateway/server.js` | `hosts.test.ts`, `api-version.test.js` | CUMPLIDO (apagado) |
| REQ-063..067 | Migración a Freetour API v2.2 | `docs/plan-freetour-v22.md` | ver plan | PENDIENTE (gates del PO) |
| REQ-062 | Header del home con logo animado en todo el sitio público | `email-ui.tsx` (EmailFrame), `error.tsx`, `tours/error.tsx`, `global-error.tsx`, `src/layout/site-header.test.ts` | unitarias + revisión visual 390/1366 | EN CURSO |
| REQ-068 | Menú derivado de las secciones del home (incluye viajes propios) y enlace activo en páginas internas | `src/home/lib/sections.ts`, `Navbar.tsx`, `FeatureFlags.tsx`, `app/layout.tsx`, `sections.test.ts` | unitarias + revisión visual 390/1366 | EN CURSO |
| REQ-029 | D1 saturada: reintento | `src/tours/lib/d1-load.ts`, `src/actions/tours.ts` | `d1-load.test.ts` | CUMPLIDO |
| REQ-030 | D1 saturada: caché 10 min | idem | `d1-load.test.ts` | REEMPLAZADO por REQ-032 |
| REQ-032 | Caché compartida L1+L2, single-flight, stale-if-error | `src/cache/lib/shared-cache.ts`, `src/cache/edge.ts`, home, /tours, ficha, mapa, /api/tours | `shared-cache.test.ts` | CUMPLIDO |
| REQ-033 | Índices compuestos (migración 0010) | `migrations/0010_indices_rendimiento.sql`, `schema.prisma` | prueba de carga en preview + insights | CUMPLIDO al publicar |
| REQ-035 | Lista/búsqueda en memoria sobre índice del catálogo | `src/catalog/lib/query.ts`, `src/catalog/snapshot.ts`, `tour-repository.ts` | `query.test.ts` | CUMPLIDO |
| REQ-036 | Espera con tope entre peticiones (Workers) | `src/cache/lib/shared-cache.ts` | `shared-cache.test.ts` | CUMPLIDO |
| REQ-034 | Cron en grupos de 90 ids | `src/reviews/repository.ts`, `src/reviews/lib/chunk.ts` | `chunk.test.ts` | CUMPLIDO |
| REQ-031 | Países por GROUP BY | `tour-repository.ts`, `d1-load.ts` | `d1-load.test.ts` | CUMPLIDO |

## INC-002 (4 nov 2026) — 403 al cancelar en Freetour
| ID | Requisito | Archivo(s) | Test | Estado |
|---|---|---|---|---|
| REQ-019 | Conformidad con el Swagger | `gateway/lib/operations.js`, `gateway/lib/freetour-spec-required.json` | `spec-conformance.test.js` | CUMPLIDO |
| REQ-020 | Diagnóstico en cPanel | `gateway/lib/diagnostic.js`, `gateway/scripts/prueba-reservas.js` | `diagnostic.test.js` | CUMPLIDO |
Detalle: `docs/incidentes/INC-002.md`.

## La Primera Pieza — Ola 7 «Arma tu viaje» y carrusel (5 nov 2026)
Todo tras `ARMA_TU_VIAJE_ENABLED="false"` (apagada: `/arma-tu-viaje` y `/api/arma-tu-viaje/eventos` responden 404). Cobros tras `CART_PAYMENTS_ENABLED="false"` (candado Stripe). Visa y ETIAS tras `VISA_ENABLED` / `ETIAS_ENABLED` en `"false"`.
| ID | Requisito | Archivo(s) | Test | Estado |
|---|---|---|---|---|
| REQ-104 | CartItem genérico y ProviderAdapter (api/deeplink); FREETOUR primer adaptador api | `src/cart/lib/item.ts`, `adapter.ts`, `flags.ts`, `src/cart/adapters/freetour.ts`, `deeplink.ts` | `item.test.ts`, `adapter.test.ts`, `flags.test.ts`, `freetour.test.ts`, `deeplink.test.ts` | CUMPLIDO (apagado) |
| REQ-105 | Interruptor automático api → deeplink → WhatsApp → oculto | `src/cart/lib/switch.ts`, `page-model.ts`, `src/cart/adapters/whatsapp.ts`, `CompanionCarousel.tsx` | `switch.test.ts`, `page-model.test.ts`, `deeplink.test.ts`, `CompanionCarousel.test.ts` | CUMPLIDO (apagado) |
| REQ-106 | Primera Pieza confirmada (costo 0) que sobrevive al abandono; sugerencias solo con un toque | `src/cart/lib/cart.ts`, `src/cart/load.ts`, `page-model.ts`, `app/arma-tu-viaje/page.tsx` | `cart.test.ts`, `load.test.ts`, `page-model.test.ts`, `CompanionCarousel.test.ts` | CUMPLIDO (apagado) |
| REQ-107 | Cobro dividido por proveedor, paymentUrl renovable, cancelación aislada, seguro solo deeplink | `src/cart/lib/split.ts`, `switch.ts`, `src/cart/adapters/freetour.ts` | `split.test.ts`, `switch.test.ts`, `freetour.test.ts` | EN CURSO (falta stage de FREETOUR y OK del PO) |
| REQ-108 | Carrusel 3/4 tarjetas, primera un tour, quién cobra, orden base | `src/companions/lib/carousel.ts`, `CompanionCarousel.tsx` | `carousel.test.ts`, `CompanionCarousel.test.ts`, `page-model.test.ts` | CUMPLIDO (apagado) |
| REQ-109 | Reglas por destino como datos; visa y ETIAS tras bandera | `src/companions/rules.json`, `carousel.ts` | `carousel.test.ts` | CUMPLIDO (apagado) |
| REQ-110 | Eventos vista/agregada/reservada/WhatsApp por tipo y ciudad | `src/companions/lib/events.ts`, `app/api/arma-tu-viaje/eventos/route.ts`, `CompanionCarousel.tsx` | `events.test.ts` | EN CURSO («reservada» se emite cuando exista la reserva desde el carrito) |
| REQ-111 | Métricas con metas firmadas | `src/ops/lib/metrics.ts`, este archivo | `metrics.test.ts` | EN CURSO (faltan valores de producción) |
| REQ-120 | Traslados Kiwitaxi como complemento del carrito (deeplink tp.media, panel, /traslados tras bandera) | `src/cart/adapters/kiwitaxi.ts`, `src/transfers/lib/page-mode.ts`, `TransferPanel.tsx`, `CompanionCarousel.tsx`, `app/traslados/page.tsx`, `app/arma-tu-viaje/page.tsx` | `kiwitaxi.test.ts`, `page-mode.test.ts`, `page-model.test.ts`, `ComplementsHub.test.ts` | CUMPLIDO (apagado; p=647 y subID por confirmar) |
| REQ-121 | Registro de complementos, hub «Transporte» y Big Bus en modo solicitud | `src/companions/registry.json`, `src/companions/lib/registry.ts`, `src/companions/load.ts`, `src/cart/adapters/request.ts`, `src/cart/adapters/index.ts`, `ComplementsHub.tsx` | `registry.test.ts`, `request.test.ts`, `load.test.ts`, `ComplementsHub.test.ts` | CUMPLIDO (apagado) |

## Métricas La Primera Pieza (REQ-111, metas firmadas en el gate 5 del plan)
Funciones en `src/ops/lib/metrics.ts` (`evaluateMetrics` compara contra `METRIC_TARGETS`). Sin dato = no cumple; nada se simula.
| Métrica | Meta firmada | Valor actual | Fuente |
|---|---|---|---|
| % de tours con ciudad válida | ≥ 98 % | sin medir | D1 `Tour.cityId` contra `City` (`pctToursWithValidCity`) |
| Slugs duplicados | 0 | sin medir (los slugs llegan en la Ola 3) | `Tour.slug` (`duplicateSlugs`) |
| Horas desde el último sync exitoso | < 26 h | sin medir (el log de corridas llega en la Ola 1) | `SyncRun` (`hoursSinceLastSuccess`) |
| Tasa de éxito del sync (30 días) | ≥ 95 % | sin medir (Ola 1) | `SyncRun` (`syncSuccessRate`) |
| Ciudades que cambian de indexación por semana | ≤ 5 | sin medir (Ola 4) | foto semanal de indexación (`indexingChanges`) |
| Tasa de agregado del carrusel por categoría | se mide 4 semanas y luego se fija | sin medir (carrusel apagado) | logs `[carrusel-evento]` (`addRateByCategory`) |
## Ola 1 «La Primera Pieza» — blindaje del sync (5 nov 2026)
Código tras `SYNC_GUARD_ENABLED="false"`; con la bandera apagada el sync de hoy queda idéntico. Migración 0014 en PR aparte (sin aplicar).
| REQ-071 | Barrera de cordura (vacío, error, > 20 % menos) sin tocar Tour | `src/catalog/lib/sanity.ts`, `src/catalog/guarded-sync.ts`, `migrations/0014_sync_presencia.sql` | `sanity.test.ts`, `guarded-sync.test.ts` | CUMPLIDO (tras bandera) |
| REQ-072 | Respaldo, publicación al cierre (pasos de 100) y checkpoint solo si termina bien | `src/catalog/lib/sql.ts` (`publishBatch`), `src/catalog/lib/guard-plan.ts`, `src/catalog/guarded-repository.ts` | `sql.test.ts`, `guard-plan.test.ts`, `guarded-sync.test.ts` | CUMPLIDO (tras bandera) |
| REQ-073 | content_hash sin calificación; doble corrida = 0 escrituras | `src/catalog/lib/content-hash.ts`, `src/catalog/lib/sql.ts` | `content-hash.test.ts`, `sql.test.ts`, `guarded-sync.test.ts` | CUMPLIDO (tras bandera) |
| REQ-074 | active → missing → removed tras 3 corridas; reaparece = active | `src/catalog/lib/presence.ts`, `src/catalog/lib/sql.ts` | `presence.test.ts`, `guarded-sync.test.ts` | CUMPLIDO (tras bandera) |
| REQ-075 | updatedSince en /events y utcDate | — | — | PENDIENTE (ver nota) |
| REQ-076 | Precio y lugares en vivo antes de reservar | — | — | PENDIENTE (fuera de la Ola 1 de código) |
| REQ-077 | 429/Retry-After, login sin bucle, error 63 ≥ 10 min | `src/catalog/lib/retry.ts`, `src/freetour/api.ts` | `retry.test.ts`, `api.test.ts`, `guarded-sync.test.ts` | EN CURSO (falta conectar el error 63 a un cron de estado de pago) |
| REQ-078 | Log por corrida y alerta de 26 h | `src/catalog/lib/guard-plan.ts` (`syncHealth`), `SyncRun`, `api/cron/sync-tours/route.ts` | `guard-plan.test.ts`, `guarded-sync.test.ts` | EN CURSO (falta canal de aviso al PO y el registro de reservas de prueba) |
Notas:
- REQ-075: `updatedSince` existe solo en `/events`; `/tours` se sigue recorriendo completo (así se detectan ausentes y se aplica la barrera del 20 %). Usar `/events?updatedSince` para las salidas no cabe sin cambiar el sync de salidas (REQ-049) y su ritmo; queda pendiente para una ola propia. `utcDate` tampoco se tocó.
- REQ-076: hoy la ficha y la reserva ya consultan `/tours/{id}/events` en vivo (no caché). `GET /events/{id}` es de la API v2.2 (bandera `FREETOUR_API_VERSION`, apagada).
- REQ-077: `canCheckPaymentStatus` existe y tiene test, pero hoy ningún cron consulta el estado de pago (tours de pago apagados). Se conecta cuando exista ese cron.
- REQ-078: la alerta queda en la respuesta del cron (`health`) y en los logs del Worker (`[alerta-sync]`). Falta decidir el canal (correo o WhatsApp al PO). Reservas de prueba canceladas y registradas: no es parte de este PR.
- REQ-072: con 100 cambios o menos, la publicación, la presencia y el checkpoint van en un solo batch de D1 (atómico). Con más de 100, el contenido se publica en pasos de 100 por minuto (cada paso es atómico y el sitio puede ver tours ya actualizados antes del cierre); las bajas (missing/removed) y el checkpoint solo se aplican en el último paso. El respaldo de cada fila sobrescrita queda en `TourStage.previous` (se conservan las últimas 7 corridas).
- Primera corrida con la bandera encendida: arranca en el siguiente minuto (sin esperar las 3:00) y, como ningún tour tiene `contentHash` todavía, publica todo el catálogo una vez (unos 81 pasos de 100).
