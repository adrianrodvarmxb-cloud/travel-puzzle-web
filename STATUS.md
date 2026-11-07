# STATUS — travel-puzzle-web

Actualizado: 5 nov 2026, 11:45 (CDMX).

## URL por idioma (Gate 3, 6 nov 2026) — Ola 0 (plan) en PR

- Plan en `docs/plan-urls-idioma.md`: auditoría, carpetas (`src/i18n/`), decisiones (español sin prefijo; `/en`, `/pt`, `/fr`, `/it`, `/de`; mismo slug; la cookie solo sugiere; `x-default` = español; moneda sin cambio) y pruebas por pieza. REQ-650 a REQ-676 PENDIENTES.
- Olas 1–3 parten de `main` cuando #204 y #208 estén fusionados. Todo tras `LOCALE_URLS_ENABLED="false"`; lo enciende el PO con su protocolo.
- **Ola 1 (rutas y middleware)** en PR apilado sobre la Ola 0: `src/i18n/` (lib pura + middleware + server), `LocalizedLink`, selector y aviso. El contenido de hubs (title/H1 de país y ciudad) sigue en español hasta la Ola 2.

| ID | Requisito | Archivo(s) | Test | Estado |
|---|---|---|---|---|
| REQ-650 | Bandera apagada = como hoy | `src/i18n/lib/flags.ts`, `src/i18n/middleware.ts`, `src/i18n/server.ts` | `src/i18n/lib/path.test.ts`, `src/i18n/middleware.test.ts`, `src/i18n/server.test.ts` | CUMPLIDO (apagado) |
| REQ-651 | /{lang}/{ruta en alcance} | `src/i18n/lib/path.ts`, `src/middleware.ts` | `path.test.ts`, `middleware.test.ts` | CUMPLIDO (apagado) |
| REQ-652 | /es → 301; fuera de alcance → 302 | `src/i18n/lib/path.ts` | `path.test.ts`, `middleware.test.ts` | CUMPLIDO (apagado) |
| REQ-653 | Idioma de la URL en servidor | `src/i18n/server.ts`, `src/i18n/middleware.ts` | `server.test.ts`, `middleware.test.ts` | CUMPLIDO (apagado) |
| REQ-654 | Idioma de la URL en cliente | `src/lib/language-context.tsx`, `src/app/layout.tsx`, `AppProviders.tsx` | `src/components/i18n/i18n-client.test.ts` | CUMPLIDO (apagado) |
| REQ-655 | Enlaces conservan el idioma | `src/i18n/lib/path.ts`, `src/components/i18n/LocalizedLink.tsx`, `useLocalizedHref.ts` | `path.test.ts`, `i18n-client.test.ts` | CUMPLIDO (apagado) |
| REQ-656 | Selector navega a la URL del idioma | `src/i18n/lib/path.ts`, `LanguageSwitcher.tsx` | `path.test.ts` | CUMPLIDO (apagado) |
| REQ-657 | Aviso no intrusivo, sin redirigir | `src/i18n/lib/suggest.ts`, `src/components/i18n/LanguageSuggestion.tsx` | `src/i18n/lib/suggest.test.ts`, `i18n-client.test.ts` | CUMPLIDO (apagado) |
| REQ-658 | 301 con prefijo | `src/i18n/middleware.ts`, `src/destinations/middleware.ts` | `middleware.test.ts` | CUMPLIDO (apagado) |
| REQ-659 | Fuera de alcance sin cambio | `src/i18n/lib/path.ts`, `src/i18n/server.ts` | `path.test.ts`, `server.test.ts` | CUMPLIDO (apagado) |

## Cumplimiento FREETOUR (PO, 6 nov 2026, 21:33 y 22:00) — matriz de trazabilidad
Auditoría completa en `docs/freetour/auditoria-2026-11-06.md` (67 elementos: 42 PERMITIDO, 11 PROHIBIDO, 8 AMBIGUO, 6 OBLIGATORIO FALTANTE). Fuentes 3 a 9 NO releídas (dominios bloqueados en la sesión). Borrador del correo a FREETOUR en `docs/freetour/correo-permisos-borrador.md` (lo envían Claudia o Adri).

| ID | Requisito | Archivo(s) | Test | Estado |
|---|---|---|---|---|
| REQ-800 | Confirmación y recordatorios con los 9 campos de A2 aunque falte el dato | `src/notifications/lib/booking-email.ts` | `booking-email.test.ts` | CUMPLIDO |
| REQ-801 | El correo no nombra a FREETOUR como proveedor | `booking-email.ts` | `booking-email.test.ts` | CUMPLIDO |
| REQ-802 | A FREETOUR solo email, nombre, apellido y teléfono si `isPhoneRequired` (G2) | `src/booking/service.ts` | `src/booking/service.test.ts` | CUMPLIDO |
| REQ-803 | Reseñas del inicio ligadas a su tour; promedio «de las experiencias» (C7) | `src/home/load.ts`, `src/home/lib/copy.ts` | `src/home/load.test.ts`, `src/home/lib/copy.test.ts` | CUMPLIDO |
| REQ-804 | Insignia de propina solo por `primeraPiezaBadge` | `src/components/destinations/DestinationTourCard.tsx` | `src/freetour/lib/cumplimiento.test.ts` | CUMPLIDO |
| REQ-805 | Sin AggregateRating ni review de terceros en el JSON-LD (Gate 2) | `src/seo/lib/jsonld.ts` | `src/seo/lib/jsonld.test.ts`, `cumplimiento.test.ts` | CUMPLIDO |
| REQ-806 | Sin «FREETOUR» en el copy visible; un solo detector | `src/tours/lib/favorite.ts`, `src/tours/lib/experience-card.ts` | `cumplimiento.test.ts` | CUMPLIDO |
| REQ-807 | `/booking/messages` solo con el filtro de enlaces | — (escaneo) | `cumplimiento.test.ts` | CUMPLIDO |
| REQ-808 | Recompensas y venta cruzada sin FREETOUR; tests existentes protegidos | — (escaneo) | `cumplimiento.test.ts` | CUMPLIDO |
| REQ-809 | Tabla de auditoría legible y completa | `docs/freetour/auditoria-2026-11-06.md` | `cumplimiento.test.ts` | CUMPLIDO |
| REQ-810 | Tours de pago: precio del grupo con la lectura más cara (D2, provisional) | `src/booking/lib/event-check.ts` | `src/booking/lib/event-check.test.ts` | CUMPLIDO |
| REQ-811 | Tours de pago: reembolso en rechazo y cancelación (D3, A3) | `src/notifications/lib/status-emails.ts`, `src/booking/notify.ts` | `status-emails.test.ts`, `src/booking/notify.test.ts` | CUMPLIDO |
| REQ-812 | Tours de pago: confirmación sin propina y con 24 h | `booking-email.ts`, `notify.ts` | `booking-email.test.ts`, `notify.test.ts` | CUMPLIDO |

**Pendiente del PO:** pedir por escrito (correo borrador; filas 12, 13, 16, 17, 18, 41, 48, y la clave de precios de la fila 55 a api@freetour.com); encender `ADULT_CONTACT_CHECK_ENABLED`; rotar la API key; aviso de privacidad y política de cookies (REQ-084); PR #62: sesión de pago vencida y regla de 24 h en la pantalla de cancelar.


## Páginas institucionales y blog (6 nov 2026) — en PR, apagadas, sin publicar

- 4 PR apilados (fusionar en orden): /nosotros → /contacto → /asesores («Habla con un asesor de viaje») → /blog. Todo tras `NOSOTROS_ENABLED`, `CONTACTO_ENABLED`, `EXPERTOS_ENABLED`, `BLOG_ENABLED` (+ `BLOG_SHOW_DRAFTS`, solo preview) en "false". REQ-240 a REQ-276.
- Formularios con Zod y anti-spam; envían con Resend a info@ (sin base ni migración). Blog con datos en el repo, cero publicados y un borrador de ejemplo.
- Falta: firma de las decisiones en `docs/gates-paginas-2026-11.md`, material del cliente para los bloques en borrador, preview en Cloudflare con banderas encendidas y OK del PO para encender (una bandera por PR).

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
- Turismo Asiático: faltan los PDF, saber si son netos o comisionables y las fotos.
- Extime (comisionable, precio público EUR): catálogo completo de invierno 2026-27 y verano 2027 (179 productos) en `imports/extime-2026-27.json`, en borrador y sin fotos. Faltan las fotos oficiales (pedidas a Extime) y confirmar la cancelación de verano (el programa dice 48–72 h y la política del 16 oct, 24 h).
- Rotar la API key de Freetour (pendiente, fuera del correo).

**Sin iniciar (en cola):** Olas 2 a 8 de La Primera Pieza; revisar la cobertura de salidas; cerrar INC-004 e INC-005 y REQ-039 en docs; proveedores nuevos (Big Bus, Bedsonline, Oku Japan, Travelpayouts).

**Métricas firmadas (Ola 8):** ≥ 98 % de tours con ciudad válida · 0 slugs duplicados · < 26 h desde el último sync exitoso · ≥ 95 % de corridas exitosas en 30 días · ≤ 5 ciudades que cambian de indexación por semana · tasa de agregado del carrusel: se fija tras 4 semanas de medición.

## 6 nov 2026 — Copia exacta del proveedor, Ola R1 (REQ-740…748)
- Cada item crudo de FREETOUR `/tours` se guarda ANTES de transformarlo en R2 PRIVADO (`raw/<proveedor>/<externalId>/<huella>.json`), solo si cambió la huella; `updatedAt` va como `providerUpdatedAt`. Si falla, el sync sigue (REQ-744).
- Los imports guardan el item completo (con `source`, `hold`, `taxonomia`) y el documento original si el workflow lo recibe (`source/<agencia>/…`).
- Índice `ProviderRecord` + `ProviderDocument`: migración PROPUESTA `docs/migraciones-propuestas/0022_provider_record.sql` (sin aplicar).
- Todo tras `RAW_ARCHIVE_ENABLED="false"`. Pasos con candado en `docs/runbooks/copia-exacta.md`: bucket, binding, migración, bandera.

| ID | Requisito | Archivo(s) | Test | Estado |
|---|---|---|---|---|
| REQ-740 | Huella sin volátiles por proveedor | src/ingest/lib/raw-hash.ts | raw-hash.test.ts | CUMPLIDO |
| REQ-741 | Claves raw/ y source/ | src/ingest/lib/raw-keys.ts | raw-keys.test.ts | CUMPLIDO |
| REQ-742 | Puerto RawArchive, versión solo si cambia | src/ingest/raw-archive.ts, lib/archive-plan.ts | raw-archive.test.ts | CUMPLIDO |
| REQ-743 | FREETOUR crudo antes de transformar | src/catalog/guarded-sync.ts, src/ingest/lib/freetour-raw.ts, deps.ts, lib/flags.ts, cron sync-tours | guarded-sync.test.ts, flags.test.ts | CUMPLIDO (apagado) |
| REQ-744 | El archivo crudo no tumba el sync | src/ingest/raw-archive.ts, guarded-sync.ts | raw-archive.test.ts, guarded-sync.test.ts | CUMPLIDO |
| REQ-745 | Imports: item completo + documento original | src/ingest/lib/import-archive.ts, src/scripts/import-trips.ts, importar-viajes.yml | import-archive.test.ts | CUMPLIDO (apagado) |
| REQ-746 | Índice D1 (migración propuesta 0022) | docs/migraciones-propuestas/0022_provider_record.sql | migration-0022.test.ts | CUMPLIDO (sin aplicar) |
| REQ-747 | Ninguna ruta pública sirve raw/ | src/ingest/* | privacy.test.ts | CUMPLIDO |
| REQ-748 | Netos y copias fuera del repo | imports/*.json | privacy.test.ts | CUMPLIDO |

## 6 nov 2026 — «Arma tu viaje»: experiencias cercanas en la tarjeta de tour (REQ-320…324)
- La tarjeta de tour/excursión recomienda hasta 3 viajes ya cargados (propios, agencias y Big Bus) por cercanía: ciudad → país → 300 km → 800 km. Nunca FREETOUR (B3). Asesor solo si no hay nada; sin asesor, no hay tarjeta.
- eSIM: sin proveedor integrado se oculta salvo en China (`ESIM_ADVISOR_COUNTRIES`). Seguro: oculto hasta tener deeplink de afiliado (`INSURANCE_ADVISOR_COUNTRIES = []`, REQ-326).
- Solo circuitos cerca → «Circuitos cerca de {ciudad}»; nunca «expertos» (REQ-325).
- Todo tras `ARMA_TU_VIAJE_ENABLED` (apagada). Decisiones 1 a 5 (radios 300/800 km, orden, eSIM, no repetir Big Bus, «Lo reservas con Travel Puzzle») firmadas por recomendación, PO autopiloto (6 nov 2026).

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
- Apagadas: `PAID_TOURS_ENABLED`, `REVIEW_EMAILS_ENABLED`, `TRANSPORT_ENABLED`, `STRIPE_HOLD_ENABLED`, `DEPARTURE_FILTERS_ENABLED`, `SEARCH_V2_ENABLED`, `SEARCH_FUZZY_ENABLED`, `SEARCH_SUGGEST_ENABLED`, `SEARCH_LOG_ENABLED`, `SEARCH_STEM_ENABLED`.
- Apagadas: `PAID_TOURS_ENABLED`, `REVIEW_EMAILS_ENABLED`, `TRANSPORT_ENABLED`, `STRIPE_HOLD_ENABLED`, `DEPARTURE_FILTERS_ENABLED`, `SEARCH_V2_ENABLED`, `SEARCH_FUZZY_ENABLED`, `SEARCH_SUGGEST_ENABLED`, `SEARCH_LOG_ENABLED`.
- Apagadas: `PAID_TOURS_ENABLED`, `REVIEW_EMAILS_ENABLED`, `TRANSPORT_ENABLED`, `STRIPE_HOLD_ENABLED`, `DEPARTURE_FILTERS_ENABLED`, `SEARCH_V2_ENABLED`, `SEARCH_FUZZY_ENABLED`, `SEARCH_SUGGEST_ENABLED`.
- Apagadas: `PAID_TOURS_ENABLED`, `REVIEW_EMAILS_ENABLED`, `TRANSPORT_ENABLED`, `STRIPE_HOLD_ENABLED`, `DEPARTURE_FILTERS_ENABLED`, `SEARCH_V2_ENABLED`, `SEARCH_FUZZY_ENABLED`.
- `PRIMERA_PIEZA_ENABLED=false` — menú con La Primera Pieza y Destinos, y /llms.txt. No encender antes de que existan /la-primera-pieza y /destinos (Olas 3 y 4).
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
| REQ-221 | Errores del navegador a los logs del Worker (`client-error`, zod) | `src/ops/lib/clientError.ts`, `src/app/api/client-error/route.ts`, `src/ops/reportClientError.ts`, `ClientErrorListener.tsx`, `SectionBoundary.tsx`, `error.tsx`, `global-error.tsx`, `tours/error.tsx` | `clientError.test.ts` | CUMPLIDO (logs en producción: PENDIENTE tras merge) |
| REQ-222 | Regreso a mano (Cloudflare o revert en GitHub) | `docs/runbooks/rollback.md` | (documento) | CUMPLIDO |
| REQ-223 | Humo abre /ayuda y /admin/entrar (404 válido tras bandera) y detecta las pantallas de error | `tests/smoke/pages.json`, `src/scripts/smoke.ts`, `src/ops/lib/smoke.ts` | `smoke.test.ts` | CUMPLIDO |
| REQ-224 | `tsc --noEmit` como gate en PR y deploy | `.github/workflows/prueba-humo.yml`, `.github/workflows/deploy-cloudflare.yml` | `tsc-gate-workflow.test.ts` | CUMPLIDO |
Detalle: `docs/incidentes/INC-001.md`. Regreso a mano: `docs/runbooks/rollback.md`.

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
| REQ-122 | Búsqueda por destino dentro del texto y palabra exacta primero (gates 5 nov 2026) | `src/catalog/lib/query.ts`, `src/search/lib/fts-query.ts`, `src/search/lib/words.ts`, `src/search/fts-search.ts`, `src/search/ranked.ts`, `tour-repository.ts` | `query.test.ts`, `fts-query.test.ts`, `fts-search.test.ts`, `busqueda-destino.test.ts` | CUMPLIDO (apagado) |
| REQ-280…285 | Buscador tolerante S2: normalize, damerau, umbrales, SymSpell (índice curado en el build), esMetaphone con seseo, alias curados y nombres que chocan (gates 6 nov 2026) | `src/search/lib/{normalize,damerau,threshold,symspell,es-metaphone,aliases,fuzzy}.ts`, `src/search/fuzzy.ts`, `data/search-aliases.json`, `src/scripts/search-index.ts`, `tour-repository.ts` | `fuzzy-parts.test.ts`, `fuzzy.test.ts`, `src/search/fuzzy.test.ts` | CUMPLIDO (apagado: `SEARCH_FUZZY_ENABLED="false"`) |
| REQ-290…294 | Buscador S3: autocompletado agrupado con «¿Quisiste decir…?», teclado y cero resultados con salida y WhatsApp | `src/search/lib/suggest.ts`, `src/search/lib/suggest-copy.ts`, `src/search/suggest.ts`, `src/app/api/search/{suggest,recover}`, `src/components/search/*`, `ToursHeader.tsx`, `ToursPageClient.tsx` | `suggest.test.ts` (lib y raíz) | CUMPLIDO (apagado: `SEARCH_SUGGEST_ENABLED="false"`) |
| REQ-340…344 | Buscador S4: analítica anónima agregada por día (búsquedas, cero resultados, clics y posición), sin datos personales | `src/search/lib/search-log.ts`, `src/search/log.ts`, `src/app/api/search/event/route.ts`, `src/components/search/useSearchLog.ts`, `migrations/0019_search_log_daily.sql`, `docs/legal/propuesta-aviso-busquedas-2026-11.md` | `search-log.test.ts` (con la migración en node:sqlite) | CUMPLIDO (apagado: `SEARCH_LOG_ENABLED="false"`; migración y aviso sin aplicar) |
| REQ-350…355 | Buscador S5: alias multilingües GeoNames + Wikidata → `destino_alias` (ensayo que solo genera CSV/SQL) y su uso en el buscador | `src/search/lib/alias-ingest.ts`, `src/search/lib/db-aliases.ts`, `src/search/db-aliases.ts`, `src/scripts/alias-ingesta.ts`, `.github/workflows/alias-ensayo.yml`, `docs/migraciones-propuestas/0020_destino_alias.sql` | `alias-ingest.test.ts` (con la migración en node:sqlite) | CUMPLIDO (apagado; migración, geonameid y escritura en D1 pendientes de OK) |
| REQ-360…366 | Buscador S6: raíz Snowball (columna `stem`) y sinónimos en TourSearch, con pesos bm25 | `src/search/lib/{stem,synonyms,fts-stem}.ts`, `src/search/{fts-search,ranked,rebuild,synonyms}.ts`, `data/search-synonyms.json`, cron sync, `docs/migraciones-propuestas/0021_tour_search_stem.sql` | `stem-search.test.ts` (FTS5 real en node:sqlite) | CUMPLIDO (apagado: `SEARCH_STEM_ENABLED="false"`; migración sin aplicar) |
| REQ-058 | Llave de caché del catálogo con firma de forma | `src/catalog/lib/query.ts`, `src/catalog/snapshot.ts` | `query.test.ts` | CUMPLIDO |
| REQ-059 | "Cómo funciona tu reserva" según lo que existe (Stripe tras bandera) | `src/trips/lib/booking-steps.ts`, ficha `/viajes` | `booking-steps.test.ts` | CUMPLIDO |
| REQ-060 | Política de cancelación solo desde la casilla de aceptación | ficha `/viajes`, `PolicyLink.tsx`, `TripRequestForm.tsx` | revisión visual 390/1366 | CUMPLIDO (validar con abogado) |
| REQ-049 | Salidas comunes a todos los proveedores + filtros idioma/fecha | `src/departures/*`, `migrations/0012_salidas.sql`, `src/catalog/lib/query.ts` | `src/departures/*.test.ts`, `query.test.ts` | EN CURSO |
| REQ-051..055 | Tipo, cancelación gratuita, privado, recogida, novedad | `src/tours/lib/extra-filters.ts`, `query.ts`, `src/trips/lib/public.ts` | `extra-filters.test.ts`, `query.test.ts`, `public.test.ts` | CUMPLIDO |
| REQ-056 | Pantalla de filtros estilo Civitatis | `src/components/tours/filters/*`, `ToursPageClient.tsx` | `extra-filters.test.ts`, `filters-copy.test.ts` + revisión visual | EN CURSO |
| REQ-061 | Idioma y fecha ocultos hasta cubrir el catálogo | `MoreFilters.tsx`, `/tours`, `wrangler.jsonc` | revisión visual | CUMPLIDO |
| REQ-113 | Interruptor FREETOUR_API_VERSION (2.0 por defecto) | `src/freetour/lib/hosts.ts`, `gateway/lib/api-version.js`, `gateway/server.js` | `hosts.test.ts`, `api-version.test.js` | CUMPLIDO (apagado) |
| REQ-159 | Enlace de pago de Stripe desde /admin/solicitudes (gate A) | `src/payments/service.ts`, `src/payments/lib/checkout.ts`, `src/app/api/admin/solicitudes/[id]/pago/route.ts`, `src/components/admin/PaymentLinkControl.tsx` | `service.test.ts`, `checkout.test.ts` | EN CURSO (apagado; falta preview con bandera) |
| REQ-115 | Cobro en MXN, USD/EUR con FIX + colchón 3% (gate B1) | `src/payments/lib/checkout.ts` | `checkout.test.ts`, `service.test.ts` | EN CURSO (apagado) |
| REQ-116 | Enlace de 24 h y reenviar vence el anterior (gate C1) | `src/payments/lib/checkout.ts`, `src/payments/service.ts`, `src/payments/stripe-client.ts` | `checkout.test.ts`, `service.test.ts` | EN CURSO (apagado) |
| REQ-117 | Webhook firmado e idempotente; solicitud "Pagada" y correos | `src/payments/lib/webhook.ts`, `src/payments/service.ts`, `src/payments/deps.ts`, `src/app/api/stripe/webhook/route.ts`, `src/trips/lib/request.ts` | `webhook.test.ts`, `service.test.ts`, `request.test.ts` | EN CURSO (apagado; falta webhook en Stripe) |
| REQ-118 | Bandera STRIPE_ENABLED (404 y sin control) | `src/payments/lib/checkout.ts`, rutas de pago y webhook, `src/app/admin/solicitudes/page.tsx` | `checkout.test.ts`, `service.test.ts` | EN CURSO (apagado) |
| REQ-119 | Tabla Payment (migración 0013) | `migrations/0013_pagos.sql`, `prisma/schema.prisma` | `service.test.ts` (fila guardada) | EN CURSO (migración sin aplicar) |
| REQ-063..067 | Migración a Freetour API v2.2 | `docs/plan-freetour-v22.md` | ver plan | PENDIENTE (gates del PO) |
| REQ-062 | Header del home con logo animado en todo el sitio público | `email-ui.tsx` (EmailFrame), `error.tsx`, `tours/error.tsx`, `global-error.tsx`, `src/layout/site-header.test.ts` | unitarias + revisión visual 390/1366 | EN CURSO |
| REQ-068 | Menú derivado de las secciones del home (incluye viajes propios) y enlace activo en páginas internas | `src/home/lib/sections.ts`, `Navbar.tsx`, `FeatureFlags.tsx`, `app/layout.tsx`, `sections.test.ts` | unitarias + revisión visual 390/1366 | EN CURSO |
| REQ-306 | Ficha de viaje propio con reintento ante D1 saturada, una carga por petición y caché corta | `src/trips/lib/trip-by-slug.ts`, `src/trips/public-load.ts`, `src/cache/edge.ts` | `trip-by-slug.test.ts` | CUMPLIDO |
| REQ-307 | Importaciones grandes nunca a la par de una publicación | `docs/incidentes/OBS-2026-11-06-ficha-viaje-500.md` | regla de operación | EN CURSO |
| REQ-302 | Correos con el encabezado y logo de Travel Puzzle, incluidos los avisos internos | `src/payments/lib/email.ts`, `src/notifications/lib/manual-cancel-email.ts`, `api/reserva/[token]/cancelar/route.ts` | `email.test.ts`, `manual-cancel-email.test.ts` | CUMPLIDO |
| REQ-304 | Página 404 con el pie del home | `src/app/not-found.tsx` | `src/app/not-found.test.ts` + capturas 390/1366 | CUMPLIDO |
| REQ-305 | Prueba de humo con La Primera Pieza: destinos, ficha real de la ciudad, sitemap y URL vieja /tours/{id} (301/410); descubrimiento obligatorio con reintentos | `tests/smoke/pages.json`, `src/ops/lib/smoke.ts`, `src/scripts/smoke.ts` | `smoke-config.test.ts`, `smoke.test.ts` + humo del PR | CUMPLIDO |
| REQ-500 | Prueba de humo con evidencia (INC-007): al fallar una página guarda HTML crudo, DOM tras hidratar y al error, errores con stack/componentStack, primera diferencia y captura; la recarga una vez y anota si es intermitente, sin dejar de fallar; artefacto en deploy y PR | `src/ops/lib/smoke-evidence.ts`, `src/ops/lib/smoke.ts`, `src/scripts/smoke.ts`, `deploy-cloudflare.yml`, `prueba-humo.yml` | `smoke-evidence.test.ts`, `smoke-evidence-workflow.test.ts` + humo del PR | CUMPLIDO (test); INC-007 ABIERTO |
| REQ-300 | Reservas, cancelación, modificar y eventos sin segundo encabezado: solo el del home; ayuda por burbuja de WhatsApp | `src/components/booking/email-ui.tsx` (EmailFrame, `cardHeader`), `email-ui.test.ts`, `site-header.test.ts` | unitarias + revisión visual 390/1366 | EN CURSO |
| REQ-301 | Rutas exentas del header común solo con motivo (admin, moderación interna, auth apagado, api) | `src/layout/site-header.test.ts` | unitarias | CUMPLIDO |
| REQ-302 | Correos con el encabezado y logo de Travel Puzzle, incluidos los avisos internos | `src/payments/lib/email.ts`, `src/notifications/lib/manual-cancel-email.ts`, `api/reserva/[token]/cancelar/route.ts` | `email.test.ts`, `manual-cancel-email.test.ts` | CUMPLIDO |
| REQ-303 | Pie del home en reservas, modificar y eventos; pie de la tarjeta oculto (`cardFooter`) | `src/components/booking/email-ui.tsx`, `src/layout/lib/site-footer.ts` | `email-ui-footer.test.ts`, `site-footer.test.ts` + capturas 390/1366 | CUMPLIDO |
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

## INC-006 (6 nov 2026) — deploy en rojo por `wrangler secret put` tras versiones de PR
| ID | Requisito | Archivo(s) | Test | Estado |
|---|---|---|---|---|
| REQ-155 | Secretos dentro de la versión que se prueba y despliega; reintento de subida; humo de producción siempre tras publicar; modo ensayo | `.github/workflows/deploy-cloudflare.yml`, `src/ops/lib/worker-secrets.ts`, `src/scripts/worker-secrets.ts` | `deploy-workflow.test.ts`, `worker-secrets.test.ts` | EN CURSO (falta el primer deploy con el workflow nuevo) |
| REQ-226 | Los PR esperan a que main termine de publicar antes de subir su versión (antes REQ-153/186) | `.github/workflows/prueba-humo.yml` | `subidas-workflow.test.ts` | CUMPLIDO |
| REQ-225 | Llave del catálogo del agente creada y cargada sin mostrarse (antes REQ-154/185) | `.github/workflows/llave-agente.yml` | `llave-agente-workflow.test.ts` | CUMPLIDO (corrida manual del workflow PENDIENTE, con OK del PO: es un secreto) |
| REQ-227 | Ningún REQ en dos filas de `docs/requisitos.md` | `docs/requisitos.md` | `requisitos-unicos.test.ts` | CUMPLIDO |
Detalle: `docs/incidentes/INC-006.md`.

## La Primera Pieza — Ola 7 «Arma tu viaje» y carrusel (5 nov 2026)
Todo tras `ARMA_TU_VIAJE_ENABLED="false"` (apagada: `/arma-tu-viaje` y `/api/arma-tu-viaje/eventos` responden 404). Cobros tras `CART_PAYMENTS_ENABLED="false"` (candado Stripe). Visa y ETIAS tras `VISA_ENABLED` / `ETIAS_ENABLED` en `"false"`.
| ID | Requisito | Archivo(s) | Test | Estado |
|---|---|---|---|---|
| REQ-104 | CartItem genérico y ProviderAdapter (api/deeplink); FREETOUR primer adaptador api | `src/cart/lib/item.ts`, `adapter.ts`, `flags.ts`, `src/cart/adapters/freetour.ts`, `deeplink.ts` | `item.test.ts`, `adapter.test.ts`, `flags.test.ts`, `freetour.test.ts`, `deeplink.test.ts` | CUMPLIDO (apagado) |
| REQ-105 | Interruptor automático api → deeplink → WhatsApp → oculto | `src/cart/lib/switch.ts`, `page-model.ts`, `src/cart/adapters/whatsapp.ts`, `CompanionCarousel.tsx` | `switch.test.ts`, `page-model.test.ts`, `deeplink.test.ts`, `CompanionCarousel.test.ts` | CUMPLIDO (apagado) |
| REQ-106 | Primera Pieza confirmada (costo 0) que sobrevive al abandono; sugerencias solo con un toque | `src/cart/lib/cart.ts`, `src/cart/load.ts`, `page-model.ts`, `app/arma-tu-viaje/page.tsx` | `cart.test.ts`, `load.test.ts`, `page-model.test.ts`, `CompanionCarousel.test.ts` | CUMPLIDO (apagado) |
| REQ-107 | Cobro dividido por proveedor, paymentUrl renovable, cancelación aislada, seguro solo deeplink | `src/cart/lib/split.ts`, `switch.ts`, `src/cart/adapters/freetour.ts` | `split.test.ts`, `switch.test.ts`, `freetour.test.ts` | EN CURSO (falta stage de FREETOUR y OK del PO) |
| REQ-108 | Carrusel 3/4 tarjetas, primera un tour, quién cobra, orden base | `src/companions/lib/carousel.ts`, `CompanionCarousel.tsx` | `carousel.test.ts`, `CompanionCarousel.test.ts`, `page-model.test.ts` | CUMPLIDO (apagado) → **REEMPLAZADO** por REQ-429 (6-11-2026, plan de taxonomía; el código actual sigue vigente hasta que el nuevo esté CUMPLIDO) |
| REQ-109 | Reglas por destino como datos; visa y ETIAS tras bandera | `src/companions/rules.json`, `carousel.ts` | `carousel.test.ts` | CUMPLIDO (apagado) |
| REQ-110 | Eventos vista/agregada/reservada/WhatsApp por tipo y ciudad | `src/companions/lib/events.ts`, `app/api/arma-tu-viaje/eventos/route.ts`, `CompanionCarousel.tsx` | `events.test.ts` | EN CURSO («reservada» se emite cuando exista la reserva desde el carrito) |
| REQ-111 | Métricas con metas firmadas | `src/ops/lib/metrics.ts`, este archivo | `metrics.test.ts` | EN CURSO (faltan valores de producción) |
| REQ-120 | Traslados Kiwitaxi como complemento del carrito (deeplink tp.media, panel, /traslados tras bandera) | `src/cart/adapters/kiwitaxi.ts`, `src/transfers/lib/page-mode.ts`, `TransferPanel.tsx`, `CompanionCarousel.tsx`, `app/traslados/page.tsx`, `app/arma-tu-viaje/page.tsx` | `kiwitaxi.test.ts`, `page-mode.test.ts`, `page-model.test.ts`, `ComplementsHub.test.ts` | CUMPLIDO (apagado; p=647 y subID por confirmar) |
| REQ-121 | Registro de complementos, hub «Transporte» y Big Bus en modo solicitud | `src/companions/registry.json`, `src/companions/lib/registry.ts`, `src/companions/load.ts`, `src/cart/adapters/request.ts`, `src/cart/adapters/index.ts`, `ComplementsHub.tsx` | `registry.test.ts`, `request.test.ts`, `load.test.ts`, `ComplementsHub.test.ts` | CUMPLIDO (apagado) |
| REQ-130 | Nombre de ciudad corregido a mano (Moscatel → Mascate) que el sync no reescribe | `src/catalog/sync.ts`, `.github/workflows/corregir-ciudad-mascate.yml`, `docs/datos/2026-11-05-mascate.sql` | `src/catalog/sync.test.ts` | EN CURSO (falta la escritura con OK del PO) |
| REQ-144 | Texto corto de Big Bus sin vigencias repetidas | `imports/bigbus-2026.json` | `trip-facts.test.ts` | CUMPLIDO |
| REQ-145 | Rango de vigencia en el encabezado de la ficha (transporte) | `src/trips/lib/trip-facts.ts`, `src/components/trips/TripDetailView.tsx` | `trip-facts.test.ts` | CUMPLIDO |
| REQ-146 | «Audioguía en …» en hop-on hop-off | `src/trips/lib/trip-facts.ts`, `src/trips/lib/copy.ts`, `src/components/trips/TripDetailView.tsx` | `trip-facts.test.ts` | CUMPLIDO |
| REQ-147 | «Disponible en» solo con viajes publicados | `src/companions/load.ts` | `load.test.ts` | CUMPLIDO |
| REQ-153 | Sin transporte en el carrusel de viajes del home (carrusel borrado) | — | — | SUSTITUIDO por REQ-452 |
| REQ-154 | «Guía en español» solo con guía en vivo en español | `src/trips/lib/guarantees.ts`, `TripGuarantees.tsx`, `TripDetailView.tsx` | `guarantees.test.ts` | EN CURSO |
| REQ-156 | «Opciones de pago» solo con pagos en línea | `src/trips/lib/guarantees.ts` | `guarantees.test.ts` | EN CURSO |
| REQ-157 | «Asesores» siempre; «Itinerarios a tu medida» solo en personalizado | `src/trips/lib/guarantees.ts` | `guarantees.test.ts` | EN CURSO |
| REQ-158 | Encender TRANSPORT_ENABLED (protocolo de bandera) | `wrangler.jsonc` | prueba de humo del preview | EN CURSO (PR #127) |
| REQ-172 | Transporte fuera de /tours; sección «Transporte turístico» en /traslados; Traslados en /destinos | `src/trips/lib/public.ts`, `src/transfers/lib/page-mode.ts`, `src/destinations/lib/catalog.ts`, `src/middleware.ts`, `src/app/tours/page.tsx`, `src/app/traslados/page.tsx`, `src/app/destinos/[pais]/[ciudad]/page.tsx` | `public.test.ts`, `page-mode.test.ts`, `catalog.test.ts`, prueba de humo | EN CURSO (tests verdes; falta OK del PO) |

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
## La Primera Pieza — Olas 4, 5 y 6: lógica pura (5 nov 2026)
| REQ-088 | Rutas /la-primera-pieza, /destinos, país, ciudad (free tours, tours + viajes propios, traslados) y ficha, desde los datos | `src/destinations/lib/catalog.ts`, `page-model.ts`, `repository.ts`, `load.ts`, `server.ts`, `src/app/la-primera-pieza`, `src/app/destinos/**` | `catalog.test.ts`, `page-model.test.ts` | CUMPLIDO (tras PRIMERA_PIEZA_ENABLED="false"; sin slugs en producción no aparece nada) |
| REQ-089 | Regla de indexación de ciudad (noindex, fuera del sitemap) | `src/destinations/lib/indexing.ts`, `catalog.ts`, `page-model.ts` | `indexing.test.ts`, `catalog.test.ts`, `page-model.test.ts` | CUMPLIDO → **REEMPLAZADO** por REQ-407 (6-11-2026, plan de taxonomía; el código actual sigue vigente hasta que el nuevo esté CUMPLIDO) |
| REQ-090 | noindex tras 14 días seguidos; el sync blindado guarda City.indexableSince/failingSince al cerrar cada corrida exitosa | `src/destinations/lib/indexing.ts` (`planCityIndexing`), `src/catalog/guarded-sync.ts`, `guarded-repository.ts` (`createCityIndexRepo`), `lib/sql.ts` (`cityIndexStatements`), `src/destinations/lib/catalog.ts` | `indexing.test.ts`, `guarded-sync.test.ts`, `sql.test.ts`, `catalog.test.ts` | CUMPLIDO (lo escribe el sync con SYNC_GUARD_ENABLED; lo lee /destinos con PRIMERA_PIEZA_ENABLED) |
| REQ-091 | País indexable; ciudad sin tours = 404 | `src/destinations/lib/indexing.ts`, `catalog.ts`, `app/destinos/[pais]/[ciudad]/page.tsx` | `indexing.test.ts`, `catalog.test.ts`, `page-model.test.ts` | CUMPLIDO |
| REQ-092 | 301 desde /tours/{id}, /tours?countryId= y /viajes/... (solo con slug); 410 removidos | `src/destinations/lib/routes.ts`, `request-plan.ts`, `edge.ts`, `middleware.ts`, `src/middleware.ts` | `routes.test.ts`, `request-plan.test.ts`, `edge.test.ts`, `catalog.test.ts`, `page-model.test.ts` | CUMPLIDO (301 y 410 reales desde el middleware, tras la bandera) |
| REQ-093 | Menú La Primera Pieza tras bandera | `src/tours/lib/menu.ts`, `Navbar.tsx`, `FeatureFlags.tsx`, `app/layout.tsx`, `wrangler.jsonc` | `menu.test.ts` | EN CURSO (bandera apagada) → **REEMPLAZADO** por REQ-400 (menú con «Experiencias»; la etiqueta la implementa REQ-174, PR #141) (6-11-2026, plan de taxonomía; el código actual sigue vigente hasta que el nuevo esté CUMPLIDO) |
| REQ-094 | H1 = título real | `src/tours/lib/title.ts`, `page-model.ts`, ficha `app/destinos/[pais]/[ciudad]/[slug]` | `title.test.ts`, `page-model.test.ts` | CUMPLIDO |
| REQ-095 | Insignia solo con fullPricePerGroup = 0 (evento en vivo) | `src/tours/lib/badge.ts`, `live-notice.ts`, `PrimeraPiezaInfo.tsx` | `badge.test.ts`, `live-notice.test.ts`, `page-model.test.ts` | CUMPLIDO |
| REQ-096 | Aviso con umbral calculado, EUR y MXN aprox. | `src/tours/lib/notice.ts`, `live-notice.ts`, `PrimeraPiezaInfo.tsx` | `notice.test.ts`, `live-notice.test.ts` | CUMPLIDO |
| REQ-097 | Tours de pago: sin insignia, 24 h y pago a la llegada; gate REQ-097: reembolso hasta 24 h, después o sin presentarse no hay (también sobre depósito o pago a la llegada) | `src/tours/lib/notice.ts`, `src/tours/lib/paid-policy.ts`, `src/tours/lib/live-notice.ts`, ficha `app/destinos/[pais]/[ciudad]/[slug]` | `notice.test.ts`, `paid-policy.test.ts`, `live-notice.test.ts`, `page-model.test.ts` | CUMPLIDO (la política del sidebar se ve con PAID_TOURS_ENABLED) |
| REQ-098 | Favorito ≥4.9 y ≥180 (≈140 tours; regla única en favorite.ts) (también la etiqueta de /tours y el home); «Operado por un guía local · {proveedor}» | `src/tours/lib/favorite.ts`, `src/reviews/lib/highlights.ts`, `DestinationTourCard.tsx`, `PrimeraPiezaInfo.tsx` | `favorite.test.ts`, `highlights.test.ts`, `page-model.test.ts` | CUMPLIDO |
| REQ-099 | Titles por tipo de página | `src/seo/lib/titles.ts`, `page-model.ts` | `titles.test.ts`, `page-model.test.ts` | CUMPLIDO |
| REQ-100 | JSON-LD y migas visibles | `src/seo/lib/jsonld.ts`, `page-model.ts`, `components/destinations/*` | `jsonld.test.ts`, `page-model.test.ts` | CUMPLIDO |
| REQ-101 | Actividades destacadas y canonical | `src/seo/lib/hub.ts`, `page-model.ts`, `DestinationsLayout.tsx` | `hub.test.ts`, `page-model.test.ts` | CUMPLIDO |
| REQ-102 | Sitemaps por país con lastmod real | `src/seo/lib/sitemaps.ts`, `page-model.ts` (`sitemapInput`), `src/destinations/sitemaps.ts`, `app/sitemap-index.xml`, `app/sitemap-destinos.xml`, `app/sitemaps/tours/[pais]` | `sitemaps.test.ts`, `page-model.test.ts`, `edge.test.ts` | EN CURSO (route handlers tras la bandera; lastmod = Tour.updatedAt, que solo es el cambio real con SYNC_GUARD_ENABLED encendido) |
| REQ-103 | robots.txt con buscadores de IA y llms.txt | `src/seo/lib/robots.ts`, `app/robots.txt/route.ts`, `app/llms.txt/route.ts` | `robots.test.ts` | EN CURSO |
## Ola 3 «La Primera Pieza» — identidad y slugs (5 nov 2026)
Migración 0015 en su propio PR (candado). Lógica pura en `src/destinations/lib/`; ensayo en el workflow «Identidad (ensayo)» (solo lectura de D1; SQL y CSV como artefacto).
| REQ-085 | ISO-2, geonameid (cruce + revisión), llave (provider_id, external_id), tour_uid; sin external_id en la URL | `src/destinations/lib/ids.ts`, `geonames.ts`, `dry-run.ts`, `src/scripts/geonames-cruce.ts`, `migrations/0015_identidad_slugs.sql` | `ids.test.ts`, `geonames.test.ts`, `dry-run.test.ts`, `slug.test.ts` | EN CURSO (falta: aplicar 0015, revisar la lista de dudosos, llenar datos con OK; la URL es de la Ola 4) |
| REQ-086 | Slug puro, inmutable, ≤60, pinyin, sufijo si choca; el sync blindado asigna el slug a cada tour nuevo una sola vez | `src/destinations/lib/slug.ts`, `assign-slugs.ts`, `dry-run.ts`, `src/scripts/slugs-ensayo.ts`, `src/catalog/guarded-sync.ts` (`newTourSlugs`), `guarded-repository.ts` (`slugIndex`), `lib/sql.ts` (`slugStatements`), trigger `Tour_slug_inmutable` | `slug.test.ts`, `assign-slugs.test.ts`, `dry-run.test.ts`, `guarded-sync.test.ts`, `sql.test.ts` | EN CURSO (sync conectado tras SYNC_GUARD_ENABLED; falta: llenar los slugs de los tours que ya existen, con OK del PO) |
| REQ-087 | Homónimas en un país llevan el código de estado | `src/destinations/lib/assign-slugs.ts` | `assign-slugs.test.ts` | CUMPLIDO (lógica; las homónimas sin `stateCode` salen en `ciudades-pendientes.csv`) |
Siguiente paso en el sync (Ola 1, `src/catalog`; no se tocó aquí):
1. En el upsert de `Tour`, no escribir nunca `slug` ni `providerId`. El trigger aborta si alguien intenta cambiar un slug.
2. Al cerrar una corrida exitosa, para los tours con `slug IS NULL`, llamar a `assignTourSlugs(existentes, nuevos)` y escribir solo `UPDATE … SET slug = ? WHERE id = ? AND slug IS NULL`.
3. En ciudades nuevas, `assignCitySlugs`; si quedan pendientes (homónimas sin estado), van a revisión y no se publican.
4. `pinyin-pro` pesa unos 300 KB; si el Worker se acerca a su límite, el slug de tours chinos se calcula en el workflow y no en el cron.
## Ola 2 (La Primera Pieza): comunicación en Modo 2 con FREETOUR (5 nov 2026)
| REQ-079 | Correos de Modo 2: confirmación con 9 datos, recordatorio, cancelación y rechazo | `src/notifications/lib/booking-email.ts`, `status-emails.ts`, `src/booking/rejection.ts` | `booking-email.test.ts`, `status-emails.test.ts`, `rejection.test.ts` | CUMPLIDO |
| REQ-080 | Release: FREETOUR no manda correos propios | `src/freetour/lib/release-email-check.ts`, `src/scripts/release-check-freetour.ts`, `docs/runbook/release-freetour-sin-correos.md` | `release-email-check.test.ts` | EN CURSO: la herramienta y la checklist están listas; falta la primera corrida con reserva de prueba (requiere OK del PO) |
| REQ-081 | Post-tour y chatbot sin FREETOUR (`FREETOUR_POSTTOUR_PROMO_ENABLED` y `FREETOUR_CHATBOT_ENABLED` en `false`) | `src/freetour/lib/promo-policy.ts`, `src/booking/notify.ts` («Más planes» de todos los correos, gate en `docs/gates-comunicacion-freetour-2026-11.md`), rutas de reserva, rechazo, cancelar, modificar y cron | `promo-policy.test.ts`, `notify.test.ts` | CUMPLIDO |
| REQ-082 | Sin premios por FREETOUR | `src/freetour/lib/rewards-guard.ts` (guarda lista; hoy no hay código de Rewards) | `rewards-guard.test.ts` | CUMPLIDO |
| REQ-083 | Mensajes al proveedor sin enlaces y ≤ 5000; contacto adulto | `src/booking/lib/provider-message.ts`, `src/booking/lib/adult-contact.ts`, `service.ts`, formulario de reserva | `provider-message.test.ts`, `adult-contact.test.ts`, `service.test.ts` | EN CURSO: falta encender `ADULT_CONTACT_CHECK_ENABLED` con OK del PO; hoy no se envían mensajes al proveedor |
| REQ-084 | Casilla de marketing LFPDPPP; política de cookies; aviso de privacidad | `src/legal/lib/marketing-consent.ts`, `MarketingConsentCheckbox.tsx`, `src/legal/lib/cookies.ts`, `/cookies`, `docs/legal/borrador-aviso-privacidad-2026-11.md` | `marketing-consent.test.ts`, `cookies.test.ts` | EN CURSO: textos pendientes de revisión del PO y de un abogado; para guardar el consentimiento hace falta una migración |
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

## Identidad geográfica v2 — ensayo (5 nov 2026)
Informe aprobado «Identidad geográfica del catálogo», pasos 1–5 (7 propuesto). Lógica en `src/geo/lib/`, tablas en `src/geo/data/`, ensayo en «Identidad geográfica v2 (ensayo)» (solo lectura). Gates: `docs/gates-geo-v2-2026-11.md`. Migración 0016 **sin aplicar**.
Los REQ de este frente se renumeraron a REQ-131…138 (antes REQ-122…129) porque REQ-122 ya es del PR #122 (buscador) y REQ-130 del PR #124 (Mascate). REQ-139…141 son los gates G5–G7 y REQ-142…143 son las firmas del PO del 6 nov 2026 (país por ciudad y las 5 dudosas). Gates firmados el 5 nov 2026: G1, G2, G5, G6 y G7 en este PR; **G3 (migración 0016) y G4 (escritura del geonameid) aprobados para el 6 nov**, después de la primera corrida del sync blindado, y siguen sin aplicar.
| ID | Requisito | Archivo(s) | Test | Estado |
|---|---|---|---|---|
| REQ-131 | Normalización de nombres | `src/geo/lib/normalize.ts` | `normalize.test.ts` | CUMPLIDO |
| REQ-132 | Centroides no confiables | `src/geo/lib/centroid.ts`, `geonames-v2.ts` | `centroid.test.ts`, `geonames-v2.test.ts` | CUMPLIDO |
| REQ-133 | Puntaje, umbrales, nombre exacto único, prioridad override > id > aproximado | `src/geo/lib/score.ts`, `resolve.ts` | `score.test.ts`, `resolve.test.ts`, `dry-run-v2.test.ts` | CUMPLIDO (umbrales: gate G1) |
| REQ-134 | SCT/WLS/NIR → GB + región; AN por ciudad; XX sin página | `src/geo/lib/country.ts`, `src/geo/data/country-overrides.csv`, `an-cities.csv`, `migrations/0016_identidad_geo.sql` | `country.test.ts`, `dry-run-v2.test.ts` | CUMPLIDO (lógica; 0016 sin aplicar) |
| REQ-135 | Taipei 4200/6172 → canónica «taipei» | `src/geo/lib/alias.ts`, `src/geo/data/city-aliases.csv` | `alias.test.ts`, `dry-run-v2.test.ts` | CUMPLIDO (lógica; 0016 sin aplicar) |
| REQ-136 | Overrides humanos por PR | `src/geo/lib/resolve.ts`, `src/geo/data/city-overrides.csv` | `resolve.test.ts` | CUMPLIDO |
| REQ-137 | Workflow de ensayo v2 | `.github/workflows/geo-dry-run.yml`, `src/scripts/geo-cruce-v2.ts`, `src/geo/lib/dry-run-v2.ts`, `wikidata.ts`, `geonames-v2.ts` | `dry-run-v2.test.ts`, `wikidata.test.ts`, `geonames-v2.test.ts` | CUMPLIDO (ensayo: corrida #1, id 42163176603) |
| REQ-138 | Atribución GeoNames CC BY 4.0 | `src/geo/lib/attribution.ts` | `attribution.test.ts` | CUMPLIDO |
| REQ-139 | Atribución solo en /terminos, no en el pie, tras GEO_ATTRIBUTION_ENABLED="false" (G5) | `src/geo/lib/attribution.ts`, `src/components/legal/GeoAttribution.tsx`, `src/app/terminos/page.tsx`, `wrangler.jsonc` | `attribution.test.ts` | CUMPLIDO (bandera apagada) |
| REQ-140 | Ensayo semanal cada lunes, solo lectura (G6) | `.github/workflows/geo-dry-run.yml` | `dry-run-workflow.test.ts` | CUMPLIDO (corre desde main tras el merge) |
| REQ-141 | Overrides propuestos por Claude (G7): 68 de 73 | `src/geo/data/city-overrides.csv` | `resolve.test.ts` | CUMPLIDO (firmado por el PO el 6 nov 2026) |
| REQ-142 | País propio por ciudad: Hong Kong → HK, Tórshavn → FO | `src/geo/lib/country.ts`, `dry-run-v2.ts`, `src/scripts/geo-cruce-v2.ts`, `src/geo/data/city-country-overrides.csv` | `country.test.ts`, `dry-run-v2.test.ts` | CUMPLIDO (se escribe con la 0016: G3/G4) |
| REQ-143 | Las 5 dudosas decididas por el PO (Alajuela ADM1, SLP ADM1, La Palma sin geonameid, Diani Beach, Ao Nang) | `src/geo/data/city-overrides.csv` | `resolve.test.ts` | CUMPLIDO |
| REQ-470 | SQL de G4 solo con UPDATE … WHERE id = … AND geonameid IS NULL (224 filas) | `docs/datos/2026-11-06-geo-v2-geonameid.sql`, `src/geo/lib/escritura.ts` | `escritura.test.ts` | EN CURSO (workflow sin correr) |
| REQ-471 | Workflow manual: Time Travel, ensayo, lotes con --command | `.github/workflows/geo-escribir-geonameid.yml`, `src/scripts/geo-escribir.ts` | `geo-escribir-workflow.test.ts`, `escritura.test.ts` | EN CURSO |
| REQ-472 | Verificación (conteo, repetidos), humo y restauración automática | `.github/workflows/geo-escribir-geonameid.yml`, `src/geo/lib/escritura.ts` | `escritura.test.ts`, `geo-escribir-workflow.test.ts` | EN CURSO |
| REQ-473 | País/región propios y alias de Taipei (geo-v2-0016), corrida aparte con escribir_pais | `docs/datos/2026-11-06-geo-v2-0016-pais.sql`, `.github/workflows/geo-escribir-geonameid.yml`, `src/geo/lib/escritura.ts`, `src/scripts/geo-escribir.ts` | `escritura.test.ts`, `geo-escribir-workflow.test.ts` | EN CURSO |
| REQ-170 | Ficha de tour de pago, tarjetas de ciudad, de /tours y destacadas del inicio: EUR con MXN aproximado (FREETOUR D4), tras PRIMERA_PIEZA_ENABLED | `src/tours/lib/price-label.ts`, `DestinationTourCard.tsx`, `app/destinos/[pais]/[ciudad]/page.tsx`, `TourSidebar.tsx`, `TourMobileBar.tsx`, `TourDetailClient.tsx`, `app/destinos/[pais]/[ciudad]/[slug]/page.tsx`, `app/tours/[id]/page.tsx` | `price-label.test.ts`, `card-price.test.ts` | CUMPLIDO |
| REQ-171 | Reseñas que nombran la plataforma se ocultan al pintar en ficha, frases destacadas e inicio (en producción, sin bandera) | `src/reviews/lib/platform-mention.ts`, `reviews.ts`, `highlights.ts`, `src/tours/detail-props.ts` | `platform-mention.test.ts`, `platform-everywhere.test.ts` | CUMPLIDO |
| REQ-180 | Fecha y hora local de la Primera Pieza y del WhatsApp | `src/cart/lib/piece.ts`, `src/cart/lib/page-model.ts`, `src/cart/load.ts`, `app/arma-tu-viaje/page.tsx` | `piece.test.ts`, `page-model.test.ts`, `load.test.ts` | CUMPLIDO (apagado) |
| REQ-181 | País y viajero de la reserva, no de la URL | `src/cart/lib/piece.ts`, `src/cart/load.ts`, `src/cart/lib/page-model.ts`, `app/arma-tu-viaje/page.tsx` | `piece.test.ts`, `page-model.test.ts`, `load.test.ts` | CUMPLIDO (apagado) |
| REQ-182 | Enlace a «Arma tu viaje» en confirmación, /reserva/{token} y correo (tras bandera) | `src/cart/lib/links.ts`, `components/booking/TripLinkCard.tsx`, `EventBookingConfirm.tsx`, `BookingFormContext.tsx`, `app/reserva/[token]/*`, `api/freetour/booking/route.ts`, `booking/notify.ts`, `notifications/lib/booking-email.ts` | `links.test.ts`, `TripLinkCard.test.ts`, `BookingConfirmed.test.ts`, `notify.test.ts`, `booking-email.test.ts` | CUMPLIDO (apagado) |
| REQ-183 | «Costo 0» solo sin tarifa fija | `src/cart/lib/piece.ts`, `src/cart/lib/page-model.ts` | `piece.test.ts`, `page-model.test.ts` | CUMPLIDO (apagado) |
| REQ-184 | Carrusel en celular: proveedor real antes que cotización | `src/companions/lib/carousel.ts`, `components/companions/CompanionCarousel.tsx` | `carousel.test.ts`, `CompanionCarousel.test.ts` | CUMPLIDO (apagado) |
| REQ-219 | Inicio sin títulos con «FreeTour» / «Free Tour» (favoritos, reseñas destacadas, carrusel de viajes) | `src/home/lib/brand.ts`, `src/home/load.ts`, `src/app/page.tsx` | `brand.test.ts`, `load.test.ts` | CUMPLIDO |
| REQ-173 | Copy genérico del catálogo: «experiencias» en lugar de «tours» (buscador, contadores, tarjeta del hero, conteos de /destinos y del mapa, /tours, 6 idiomas); el menú y el H1/title de /tours no cambian (REQ-174) | `src/tours/lib/catalog-name.ts`, `src/home/lib/copy.ts`, `src/home/lib/format.ts`, `src/lib/translations/*.ts`, `ProofStrip.tsx`, `ToursHeader.tsx`, `app/page.tsx`, `app/destinos/page.tsx`, `app/la-primera-pieza/page.tsx`, `app/not-found.tsx`, `seo/lib/robots.ts` | `catalog-name.test.ts` | CUMPLIDO |
| REQ-450 | «Los más elegidos» por medidor de reseñas (bayesiano m = 50, C del catálogo), cualquier proveedor, diversidad 2 ciudad / 3 formato, tras CARRUSELES_HOME_ENABLED="false" | `src/home/lib/review-score.ts`, `src/home/lib/carousels.ts`, `src/home/lib/rank-row.ts`, `src/home/load.ts` | `review-score.test.ts`, `carousels.test.ts`, `rank-row.test.ts`, `load.test.ts` | EN CURSO |
| REQ-451 | Regla mínima de formato y excursión de un día (TEMPORAL hasta el clasificador de taxonomía) | `src/home/lib/experience-format.ts` | `experience-format.test.ts` | CUMPLIDO |
| REQ-452 | Carrusel «viajes» borrado del home y del menú (OK del PO) | `src/app/page.tsx`, `src/home/lib/sections.ts`, `src/trips/lib/copy.ts` | `sections.test.ts`, `no-expert-claim.test.ts` | CUMPLIDO |
| REQ-453 | Carrusel y sección «Excursiones de un día», tras CARRUSELES_HOME_ENABLED="false" | `src/components/home/v2/DayTripsCarousel.tsx`, `src/home/lib/carousels.ts`, `src/home/lib/sections.ts`, `src/home/lib/copy.ts` | `carousels.test.ts`, `sections.test.ts`, `copy.test.ts`, `load.test.ts` | EN CURSO |
| REQ-454 | Fundido en REQ-219 (#147): los carruseles nuevos usan `mentionsProviderBrand`/`titlesMentionBrand` de `src/home/lib/brand.ts` | `src/home/load.ts`, `src/home/lib/rank-row.ts` | `load.test.ts`, `rank-row.test.ts`, `brand.test.ts` | CUMPLIDO |
| REQ-174 | Menú, footer, H1 y title de /tours: «Experiencias» (6 idiomas); /tours no cambia de URL; «Tours» sigue como formato en filtros y chips (G1 firmado, 6 nov 2026) | `src/tours/lib/catalog-name.ts`, `src/lib/translations/*.ts`, `src/home/lib/copy.ts`, `ToursHeader.tsx`, `app/tours/page.tsx`, `seo/lib/robots.ts`, `src/tours/lib/menu.ts` | `catalog-menu.test.ts`, `menu.test.ts` | CUMPLIDO (falta OK del PO para publicar) |

Ensayo #1 (6 nov 2026, id 42163176603): 1025 ciudades. Antes (v1, cities15000): 774 auto / 164 revisar / 87 sin candidato. Regla v2: 949 auto (92.6 %) / 70 / 6. Final con control: 952 auto, 67 revisar, 6 sin candidato; 178 geonameid nuevos por llenar (G4). Control: 774 de 774 coinciden (0 cambios). Wikidata: 73 consultadas, 0 lotes fallidos.

## Agente de WhatsApp — catálogo de solo lectura (PR #125, 6 nov 2026)
Todo tras `AGENTE_API_ENABLED="false"` (apagada: `/api/agente/*` responde 404) y la llave `AGENTE_TOKEN` (secreto, candado del PO). FREETOUR queda bloqueado (regla B3: un bot no vende sus tours sin autorización escrita). Los REQ de este frente se renumeraron a REQ-148…152 (antes REQ-122…126) porque REQ-122 ya es del PR #122 (buscador); se tomó el bloque libre al fusionar. Este PR limpia los restos de la numeración vieja (REQ-148..126, REQ-148/123, REQ-150/125) en comentarios, tests y wrangler.jsonc.
| ID | Requisito | Archivo(s) | Test | Estado |
|---|---|---|---|---|
| REQ-148 | Proveedores con interruptor; FREETOUR bloqueado (B3) | `src/agente/lib/catalogo.ts`, `src/app/api/agente/proveedores/route.ts`, `src/trips/public-load.ts` | `src/agente/lib/catalogo.test.ts`, `src/agente/rutas.test.ts` | CUMPLIDO (apagado) |
| REQ-149 | Búsqueda del agente (máx. 5, solo proveedores encendidos) | `src/agente/lib/catalogo.ts`, `src/app/api/agente/buscar/route.ts` | `catalogo.test.ts`, `rutas.test.ts` | CUMPLIDO (apagado) |
| REQ-150 | Liga prellenada (?fecha=&adultos=&ninos=) | `src/agente/lib/catalogo.ts`, `TripRequestForm.tsx`, `TripDetailView.tsx`, fichas `/viajes` y `/destinos` | `catalogo.test.ts`, `rutas.test.ts` | CUMPLIDO |
| REQ-151 | Revisión en vivo de la fecha antes de la liga | `src/agente/lib/catalogo.ts`, `src/app/api/agente/viaje/route.ts` | `catalogo.test.ts`, `rutas.test.ts` | CUMPLIDO (apagado) |
| REQ-152 | Bandera y llave (404 / 401) | `src/agente/catalogo.ts`, `src/app/api/agente/respuesta.ts` | `catalogo.test.ts`, `rutas.test.ts` | CUMPLIDO |

## Taxonomía del catálogo (plan del 6 nov 2026, `docs/plan-taxonomia.md`)
Fase «Antes de código»: solo documentos. Ningún REQ tiene código ni test todavía; todos quedan PENDIENTE. Gates pendientes del PO: G-T1…G-T5 y G-T7…G-T11 (plan §7.2); G-T6 firmado («Momentos de autor», 06:22). G1 (menú «Experiencias» como paraguas) firmado por el PO el 6-11 (opción A, ~06:12).
| ID | Requisito | Archivo(s) | Test | Estado |
|---|---|---|---|---|
| REQ-400 | El concepto base es Experiencias; luego hay Tours, Circuitos, Caminatas… | `src/taxonomy/data/dictionary.ts`; etiqueta: REQ-174 (propuesto) | — | PENDIENTE (gate firmado; la etiqueta está escrita en la rama de REQ-174, en espera sobre #141) |
| REQ-401 | Pasa taxonomia-diccionario.csv a un archivo versionado en lib/taxonomy/ (JSON o TS tipado) con: slug, eje, termino_es, termino_en… | `src/taxonomy/data/dictionary.ts`, `schemas/dictionary.ts` (propuesto) | — | PENDIENTE |
| REQ-402 | Formato: 13 valores, un solo valor por producto, con orden de precedencia (gana la primera regla que se cumple). | `src/taxonomy/lib/format.ts` (propuesto) | — | PENDIENTE |
| REQ-403 | Tema: 13 valores, de 1 a 3 por producto. Los 26 términos de 2024 quedan como sinónimos de búsqueda, no como categorías. | `src/taxonomy/lib/themes.ts`, `dictionary.ts` (propuesto) | — | PENDIENTE |
| REQ-404 | Agregar un proveedor = agregar su mapeo en el diccionario, sin tocar el clasificador. | `src/taxonomy/data/mapping/*.ts` (propuesto) | — | PENDIENTE |
| REQ-405 | Clasificador (una sola función pura en lib/, con test): Entrada: categoría del proveedor, precio, duración, título y kind del viaje.… | `src/taxonomy/lib/classify.ts` (propuesto) | — | PENDIENTE |
| REQ-406 | Corrige la regla de La Primera Pieza: precio 0 → pieza-libre, salvo 8, 17, 20, 24, 26, 28, 29, 30, 31 y 35 (hoy faltan la 26 y la 31). | `src/taxonomy/lib/primera-pieza.ts`, `destinations/lib/catalog.ts` (propuesto) | — | PENDIENTE |
| REQ-407 | Las categorías 8 (online) y 31 (servicios de viaje) → formato «fuera»: no salen en Destinos ni en el sitemap y no cuentan para la regla de… | `destinations/lib/catalog.ts`, `indexing.ts` (propuesto) | — | PENDIENTE |
| REQ-408 | Los ids 1, 2, 6 y 9, o cualquier id nuevo, → «por-revisar»: no se publican y se registran en el log del sync. | `src/taxonomy/lib/format.ts`, `recompute.ts` (propuesto) | — | PENDIENTE |
| REQ-409 | La clasificación se guarda en campos o en una tabla propia de Travel Puzzle, nunca sobre los campos del proveedor. Se recalcula en cada… | `src/taxonomy/recompute.ts`, `migrations/0017_taxonomia.sql` (propuesto) | — | PENDIENTE (migración 0017: candado) |
| REQ-410 | Formato: activo desde el primer día. Tema: se publica solo si una muestra revisada a mano de 200 tours da ≥ 90 % de precisión… el estado de… | `src/taxonomy/lib/publish.ts` (propuesto) | — | PENDIENTE (muestra entregada para revisión) |
| REQ-411 | «Ciudad y barrios» queda como base, no como filtro (marca el 70 % del catálogo). Revisar falsos positivos conocidos: «game» en… | `src/taxonomy/lib/themes.ts` (propuesto) | — | PENDIENTE |
| REQ-412 | Regla dura: un formato, tema o atributo sin productos activos para esa ciudad o filtro no se muestra. Nunca un chip, conteo o sección en… | `src/taxonomy/lib/publish.ts` (propuesto) | — | PENDIENTE |
| REQ-413 | /tours: filtros ?formato=, ?tema=, ?destino=, ?duracion= y atributos activos. Canonical a /tours y noindex en combinaciones de filtros. | `src/taxonomy/lib/filters.ts`, `tours/lib/extra-filters.ts` (propuesto) | — | PENDIENTE |
| REQ-414 | /destinos/{pais}/{ciudad}: las 3 secciones firmadas (Free tours · Tours · Traslados). Dentro de «Tours», chips de formato y tema que… | `app/destinos/[pais]/[ciudad]/page.tsx` (propuesto) | — | PENDIENTE |
| REQ-415 | Ficha: formato y temas como etiquetas debajo o al lado de la foto, nunca encima (C5). El H1 sigue siendo el título real (C4). | ficha de /destinos (propuesto) | — | PENDIENTE |
| REQ-416 | Copy en es y en desde el diccionario; pt, de, fr e it con el flujo de traducción que ya existe. Términos mexicanos: «boletos y entradas»… | `src/taxonomy/lib/copy.ts` (propuesto) | — | PENDIENTE |
| REQ-417 | Atributos activos con dato: privado, nocturno, cómo te mueves (a pie, bici, vehículo, barco), idioma español (solo si el evento o el viaje… | `src/taxonomy/lib/attributes.ts` (propuesto) | — | PENDIENTE |
| REQ-418 | Tras bandera apagada (sin dato hoy): grupo pequeño, familias, solo adultos, parejas, accesible (nunca se infiere), sin filas, apto lluvia… | `src/taxonomy/lib/publish.ts` (propuesto) | — | PENDIENTE |
| REQ-419 | Pares que se excluyen, validados por test: guiado/autoguiado, privado/grupo, familias/solo adultos. | `src/taxonomy/lib/attributes.ts` (propuesto) | — | PENDIENTE |
| REQ-420 | Favorito de los viajeros: propón un criterio (calificación ≥ 4.7 y un mínimo de N reseñas) para que yo lo firme. | `src/tours/lib/favorite.ts` (propuesto) | — | PENDIENTE (gate G-T1) |
| REQ-421 | Tipo de grupo: en grupo · privado · a la medida. Activo (sale de trip.ts). | `src/taxonomy/lib/circuits.ts` (propuesto) | — | PENDIENTE |
| REQ-422 | Dificultad física: escala del 1 al 5 (Relajado, Ligero, Moderado, Exigente, Muy exigente), con una línea de descripción por nivel. Activa… | `src/taxonomy/lib/circuits.ts` (propuesto) | — | PENDIENTE (mapeo de los 3 valores de hoy: gate G-T8) |
| REQ-423 | Duración en días: 1–5 · 6–9 · 10–14 · 15+ (reemplaza 1–5 / 6–14 / 15+). Límites con test. | `src/taxonomy/lib/circuits.ts` (propuesto) | — | PENDIENTE |
| REQ-424 | Tras bandera: confort (Básico · Esencial · Confort · Premium…; absorbe la faceta de presupuesto; Genki queda como línea de Japón), tipo de… | `src/taxonomy/lib/publish.ts` (propuesto) | — | PENDIENTE |
| REQ-425 | Migración de los campos nuevos de Trip (dificultad, confort, tipo de guía, perfil, accesibilidad sí/no): es candado; muéstrame el script y… | `migrations/0018_trip_facetas.sql` (propuesto) | — | PENDIENTE (candado) |
| REQ-426 | Se mantienen los 6 continentes de continents.ts para agrupar /destinos, sin continente en la URL. Tras bandera, sin dato: región, atracción… | `destinations/lib/hub-groups.ts` (propuesto) | — | PENDIENTE |
| REQ-427 | Gate pendiente: ¿México va como bloque propio en Destinos? Propón cómo quedaría y yo decido. | `destinations/lib/hub-groups.ts` (propuesto) | — | PENDIENTE (gate G-T2) |
| REQ-428 | Mapeo formato → CartItem.tipo en lib/… Los circuitos y los viajes a la medida no entran al carrito (se cotizan). | `src/taxonomy/lib/cart-type.ts` (propuesto) | — | PENDIENTE |
| REQ-429 | La regla «la primera tarjeta es un tour de pago o de día» usa tp_formato ∈ {caminata, tour, excursion-dia, experiencia-unica}. | `companions/lib/carousel.ts` (propuesto) | — | PENDIENTE |
| REQ-430 | Los sinónimos del diccionario alimentan el buscador: «trekking» → montana-senderismo, «free walking tour» → pieza-libre. | `src/search/lib/synonyms.ts` (propuesto) | — | PENDIENTE |
| REQ-431 | Buscar un continente o un tipo («Europa», «aventura») devuelve todo lo de ese continente o tipo, no solo coincidencias de texto. Revisa si… | `src/search/lib/scope.ts` (propuesto) | — | PENDIENTE |
| REQ-432 | Métricas en STATUS.md, con la meta que propongas: % de tours con formato (100 %) y % sin tema; categoryIds por revisar (0); precisión por… | `src/taxonomy/lib/metrics.ts` (propuesto) | — | PENDIENTE (metas: gate G-T3) |
| REQ-433 | FREETOUR: las etiquetas nunca van sobre la foto; el H1 es el título real; ningún texto de taxonomía promete pagos, MSI ni «guía en español»… | `src/taxonomy/lib/copy.ts` (propuesto) | — | PENDIENTE |
| REQ-230 | Formato `experiencia-unica` = «Momentos de autor» (G-T6 firmado, 06:22); en «Signature moments» por firmar; slug sin cambio | `src/taxonomy/data/dictionary.ts`, `lib/copy.ts` (propuesto) | — | PENDIENTE |
| REQ-480 | «Pieza libre»: chip de filtros de /tours e insignia azul de tarjetas y ficha; el precio «Free tour» se queda; EN «Free tour» pendiente de firma | `src/tours/lib/pieza-libre.ts`, `src/trips/lib/copy.ts`, `src/home/lib/copy.ts`, `src/lib/translations/*.ts`, `TourCard.tsx`, `FeaturedTours.tsx`, `TourHeroSection.tsx` | `pieza-libre.test.ts` | CUMPLIDO |

**Métricas de taxonomía (REQ-432; metas propuestas, gate G-T3):**
| Métrica | Meta propuesta | Valor (ensayo del 5-11, sin producción) |
|---|---|---|
| % de tours con formato | 100 % | 100 % (8,018) |
| % de tours presenciales sin tema | ≤ 5 % | 1.9 % (151 de 7,894) |
| categoryIds por revisar | 0 | 0 |
| Precisión por tema (última muestra) | ≥ 90 % para publicar | por medir (muestra de 200 entregada al PO) |
| Chips, conteos o secciones en cero | 0 | no existen todavía |
| Uso de filtros por formato y tema | medir 4 semanas y fijar meta | — |


## Fichas legibles para buscadores e IA — PR 2: listados y sitemaps (PO, 6 nov 2026) — matriz de trazabilidad

| ID | Requisito | Archivo(s) | Test | Estado |
|---|---|---|---|---|
| REQ-582 | ItemList en /tours, /destinos, país, ciudad, /la-primera-pieza y carruseles del inicio, con URL canónica final | `src/seo/lib/itemlist.ts`, `src/seo/lib/listing-ld.ts`, `destinations/lib/page-model.ts`, `app/page.tsx`, `app/tours/page.tsx` | `itemlist.test.ts`, `listing-ld.test.ts`, `page-model.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-583 | Tarjetas = `<a href>` reales con título, ciudad · duración, precio y operador en el HTML del servidor (ya se cumplía; queda un test que lo protege) | `components/tours/ExperienceCard.tsx` | `ExperienceCard.seo.test.ts` | CUMPLIDO |
| REQ-584 | sitemap-viajes.xml con las fichas /viajes canónicas y lastmod = updatedAt | `src/seo/lib/sitemaps-viajes.ts`, `seo/lib/sitemaps.ts`, `destinations/sitemaps.ts`, `destinations/server.ts`, `app/sitemap-viajes.xml/route.ts` | `sitemaps-viajes.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-585 | robots.txt no bloquea a OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot, Claude-User, Bingbot ni Googlebot | `src/seo/lib/robots.ts` (sin cambios de salida) | `robots-bots.test.ts` | CUMPLIDO |

Notas: las tarjetas de /tours y del inicio siguen enlazando a /tours/{id} (301 a /destinos); el ItemList ya declara la URL final. Cambiar el enlace de la tarjeta queda como mejora aparte (evita un salto 301 a los bots). llms.txt sin cambios (evidencia nula, decisión del PO).

## Tarjeta única de experiencia (PO, 6 nov 2026, 14:24) — matriz de trazabilidad
| ID | Requisito | Archivo(s) | Test | Estado |
|---|---|---|---|---|
| REQ-520 | Una sola tarjeta para todos los proveedores en /tours, inicio, /destinos, /la-primera-pieza y /traslados | `src/components/tours/ExperienceCard.tsx`, `src/tours/lib/experience-card.ts`, `src/tours/lib/card-sources.ts` | `experience-card.test.ts`, `card-sources.test.ts`, `ExperienceCard.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-521 | «★ Favorito» arriba a la izquierda, 6 idiomas, regla de favorite.ts | `experience-card.ts` | `experience-card.test.ts`, `ExperienceCard.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-522 | Categoría = formato de la taxonomía con la etiqueta de T4/T5 (`FORMATO_LABEL`); EN pieza libre «Free tour»; respaldo «Experiencia» | `src/tours/lib/card-format.ts`, `experience-card.ts`, `src/taxonomy/lib/filters.ts`, `src/actions/tours.ts`, `src/home/load.ts`, `src/destinations/lib/catalog.ts`, `src/trips/public-load.ts` | `card-format.test.ts`, `experience-card.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-523 | Ciudad · duración, título, descripción breve | `experience-card.ts`, `card-sources.ts` | `experience-card.test.ts`, `card-sources.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-524 | ★ calificación · reseñas \| proveedor real; FREETOUR nunca | `experience-card.ts` (`cardProvider`), `src/destinations/repository.ts`, `src/trips/public-load.ts` | `experience-card.test.ts`, `card-sources.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-525 | Línea de precio: «Desde aprox. MXN $X · EUR €Y» / «Free tour» | `experience-card.ts` (`cardPrice`), `DestinationTourCard.tsx` (TourGrid) | `experience-card.test.ts`, `card-sources.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-526 | Solo dos insignias sobre la foto (C5) | `ExperienceCard.tsx` | `ExperienceCard.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-531 | Nombres cortos solo en la etiqueta de la foto (opción A, PO 6-11 20:30); el filtro conserva los largos | `src/taxonomy/lib/filters.ts` (`FORMATO_CARD_LABEL`), `src/tours/lib/experience-card.ts` | `src/taxonomy/lib/card-labels.test.ts`, `experience-card.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-527 | Carruseles con flechas y tarjetas redondeadas (mix de referentes) | `src/components/tours/CardRail.tsx`, `ExperienceCard.tsx`, `FeaturedTours.tsx`, `DayTripsCarousel.tsx` | `ExperienceCard.test.ts` | CUMPLIDO (falta OK visual del PO) |

Datos (respaldo de producción del 5 nov, 8,018 tours activos): formato pieza-libre 3,464 · caminata 1,515 · tour 1,253 · excursion-dia 1,222 · experiencia-unica 344 · circuito 30 · autoguiado 29 · entradas 28 · traslado 8 · transporte 1 · `fuera` 124 (llevan el respaldo «Experiencia»). Operador: 0 vacíos; 32 tours con «freetour» en el nombre del operador (p. ej. «Don freetour», «MontpellierFreeTour») quedan con el espacio vacío por la regla dura. Componentes que quedan sin uso (no se borran): `TourCard`, `HomeTourCard`, `DestinationTourCard`, `OwnTripCard` (solo su test).

## Fichas legibles para buscadores e IA — PR 3: IndexNow tras `INDEXNOW_ENABLED="false"` — matriz de trazabilidad

| ID | Requisito | Archivo(s) | Test | Estado |
|---|---|---|---|---|
| REQ-586 | IndexNow diario (URLs con lastmod de ayer u hoy), clave en /indexnow-key.txt, apagado | `src/seo/lib/indexnow.ts`, `src/seo/indexnow-run.ts`, `app/api/cron/indexnow/route.ts`, `app/indexnow-key.txt/route.ts`, `destinations/sitemaps.ts` (`sitemapFiles`), `worker.ts` (12:10 UTC), `wrangler.jsonc` | `src/seo/lib/indexnow.test.ts`, `src/seo/indexnow-run.test.ts` | CUMPLIDO (apagado) |

Para encender (paso a paso del PO, uno por uno): 1) crear la clave (8–128 caracteres a-z, 0-9, guion) y cargarla como variable `INDEXNOW_KEY` del Worker; 2) PR que cambie `INDEXNOW_ENABLED` a "true", con preview y prueba de humo (exige /indexnow-key.txt en 200); 3) OK del PO y merge; 4) en Bing Webmaster Tools, revisar «IndexNow Insights» al día siguiente.

## Filtros de /tours con scroll propio (PO, 6 nov 2026, 14:24) — matriz de trazabilidad
| ID | Requisito | Archivo(s) | Test | Estado |
|---|---|---|---|---|
| REQ-530 | Columna de filtros sticky bajo el header con scroll propio; celular sin cambio | `src/tours/lib/filters-layout.ts`, `src/components/tours/filters/FiltersSheet.tsx` | `src/tours/lib/filters-layout.test.ts`; navegador real: `npx tsx src/scripts/filters-scroll-check.ts <url>` | CUMPLIDO (falta OK del PO) |

## Auditoría de tipos (PO, 6 nov 2026) — matriz de trazabilidad
| ID | Requisito | Archivo(s) | Test | Estado |
|---|---|---|---|---|
| REQ-532 | Caminata solo a pie; barco/bici/vehículo = visita guiada | `src/taxonomy/lib/format.ts`, `src/taxonomy/data/dictionary.json` (medio) | `src/taxonomy/lib/auditoria-tipos.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-533 | Audioguía/app/«por tu cuenta» = autoguiado | `format.ts`, `dictionary.json` (autoguiado) | `auditoria-tipos.test.ts`, `attributes.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-534 | FREETOUR cat. 4 de menos de 6 h no es excursión | `format.ts` | `auditoria-tipos.test.ts`, `freetour.test.ts`, `recompute.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-535 | Excursión por resumen («transporte desde…») o «Excursión de un día» en el título | `format.ts`, `dictionary.json` (`palabrasEnResumen`, `palabrasSinDuracion`), `src/taxonomy/schemas/dictionary.ts`, `src/tours/lib/card-format.ts`, `src/trips/public-load.ts`, `src/destinations/lib/catalog.ts` | `auditoria-tipos.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-536 | Clase, taller, cata, espectáculo = Momentos de autor | `dictionary.json`, `mapping/freetour.json` (13, 14), `mapping/propios.json` (tour) | `auditoria-tipos.test.ts`, `format.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-537 | Traslados en FREETOUR cat. 19 | `mapping/freetour.json` (19) | `auditoria-tipos.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-538 | Import de Fantástica China: Macao = tour de 1 día | `imports/fantasticachina-2027.json` | `auditoria-tipos.test.ts` | CUMPLIDO en repo; falta aplicar en D1 |

Efecto en el catálogo (respaldo de producción del 5-11, 8,018 tours activos de FREETOUR): pieza-libre sin cambio (3,464); autoguiado 29 → 635; excursión de un día 1,222 → 1,048; caminata 1,515 → 1,239; tour 1,253 → 1,193; Momentos de autor 344 → 230; traslado 8 → 26.


## Fichas legibles para buscadores e IA — PR 1: marcado y SSR (PO, 6 nov 2026) — matriz de trazabilidad

Decisiones: FREETOUR C2 (interruptor `indexableEnrichment`), Gate 2 (sin reseñas de terceros en el JSON-LD), Gate 3 pendiente (URL por idioma: las funciones ya reciben `lang` y canonical), tipo y etiquetas (PO 21:14). Contrato de fichas también en la prueba de humo (`src/scripts/smoke.ts`).

| ID | Requisito | Archivo(s) | Test | Estado |
|---|---|---|---|---|
| REQ-570 | Interruptor de enriquecimiento por proveedor (freetour = false) | `src/seo/lib/enrichment.ts`, `ficha-ld.ts`, `destinations/lib/page-model.ts` | `src/seo/lib/enrichment.test.ts`, `ficha-ld.test.ts`, `page-model.test.ts`, `ficha-contract.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-571 | Nodo `["Product","TouristTrip"]`, Offer con moneda real, 0 en pieza libre, availability si se conoce | `src/seo/lib/ficha-ld.ts`, `page-model.ts` (`tourPage`) | `ficha-ld.test.ts`, `page-model.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-572 | provider/brand = operador real, nunca FREETOUR | `ficha-ld.ts` | `ficha-ld.test.ts`, `page-model.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-573 | Duración, idiomas, cancelación (si se ve) y punto de encuentro | `ficha-ld.ts`, `trip-ficha.ts` | `ficha-ld.test.ts`, `page-model.test.ts`, `trip-ficha.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-574 | Sin AggregateRating/review de terceros; solo reseñas propias | `ficha-ld.ts` | `ficha-ld.test.ts`, `page-model.test.ts`, `ficha-contract.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-575 | Home con WebSite (SearchAction) y Organization | `src/seo/lib/home-jsonld.ts`, `src/app/page.tsx` | `home-jsonld.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-576 | Fichas de viaje (/destinos y /viajes) con el mismo marcado | `src/seo/lib/trip-ficha.ts`, `components/trips/TripDetailView.tsx` | `trip-ficha.test.ts`, `ficha-contract.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-577 | «En breve» 40–80 palabras, plantilla pura, no FREETOUR | `ficha-ld.ts` (`enBreve`), `components/seo/FichaEnBreve.tsx`, `components/trips/TripHeader.tsx`, `TourHeroSection.tsx` | `ficha-ld.test.ts`, `ficha-contract.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-578 | Idioma del guía y duración legible en el HTML del servidor | `ficha-ld.ts` (`guideLanguagesLabel`), `app/destinos/[pais]/[ciudad]/[slug]/page.tsx`, `TourHeroSection.tsx` | `ficha-ld.test.ts`, `page-model.test.ts`, `ficha-contract.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-579 | Canonical de /tours/[id] = ficha final de /destinos | `src/seo/lib/legacy-canonical.ts`, `app/tours/[id]/page.tsx` | `legacy-canonical.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-580 | Test de contrato por tipo de ficha y proveedor (+ prueba de humo) | `src/seo/lib/ficha-contract.ts`, `src/scripts/smoke.ts` | `ficha-contract.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-581 | Tipo principal y etiquetas visibles y en el JSON-LD (additionalProperty y keywords) | `src/seo/lib/taxonomy-facets.ts`, `ficha-ld.ts`, `FichaEnBreve.tsx` | `taxonomy-facets.test.ts`, `ficha-ld.test.ts`, `trip-ficha.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-587 | (REEMPLAZADO por REQ-588) Sin enriquecimiento: ni idiomas ni Place en el JSON-LD, ni «Idioma del guía» en el HTML | — | — | REEMPLAZADO |
| REQ-588 | FREETOUR: idioma del guía (pintado en el cliente) y punto de encuentro visibles con `data-nosnippet`; fuera del JSON-LD | `src/tours/lib/hero-facts.ts`, `components/tours/one/TourHeroSection.tsx`, `destinations/lib/page-model.ts`, `app/destinos/[pais]/[ciudad]/[slug]/page.tsx`, `src/seo/lib/ficha-contract.ts` | `src/tours/lib/hero-facts.test.ts`, `page-model.test.ts`, `ficha-contract.test.ts` | CUMPLIDO (falta OK del PO para publicar) |

Pendientes y notas:
- Cancelación: fuera del marcado y de «En breve» de los viajes mientras REQ-060 (PO, 5 nov) la oculte de la página. Si el PO la quiere visible, basta con `SHOW_POLICY_ON_PAGE = true` en `TripDetailView`.
- Reseñas propias (CustomerReview): `fichaJsonLd` acepta `ownReviews`, pero hoy no hay cargador que las agregue por producto. Queda para cuando haya reseñas recogidas en Travel Puzzle.
- Dato raro visto en la D1 local: viajes de Extime de una hora con `durationDays` = 1 («1 día» en la ficha y el marcado). Es dato de la importación (no se tocó).
- `productJsonLd` de `src/seo/lib/jsonld.ts` queda sin uso (no se borra).
## Criterio de pendientes de tipos (PO, 6 nov 2026, 21:14) — matriz de trazabilidad
| REQ-540 | Visita guiada con entrada = tour + «entrada-incluida»; boletos solo sin guía | `src/taxonomy/lib/format.ts`, `attributes.ts`, `dictionary.json` (`palabrasConGuia`), `mapping/propios.json` | `src/taxonomy/lib/criterio-pendientes.test.ts`, `format.test.ts`, `gates.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-541 | Food tour = caminata + gastronomía; Momentos de autor solo talleres, clases, catas sentadas, espectáculos | `format.ts`, `dictionary.json` (`palabrasRecorrido`, `palabrasFuertes`, tema gastronomía) | `criterio-pendientes.test.ts`, `recompute.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-542 | Día completo en la ciudad = tour + «dia-completo»; excursión solo si sale | `format.ts`, `attributes.ts`, `dictionary.json` (`palabrasEnCiudad`, `palabrasSaleSiempre`) | `criterio-pendientes.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-543 | Atributos nuevos en el diccionario y facetas listas para el filtro | `dictionary.json`, `src/taxonomy/lib/filters.ts` (`ATRIBUTOS_FACETA`) | `criterio-pendientes.test.ts` | CUMPLIDO |
| REQ-544 | Chips de atributos en la ficha (fuera de la foto); no en la tarjeta | `src/taxonomy/lib/copy.ts` (`tourLabels`), `src/taxonomy/lib/publish.ts`, `src/destinations/lib/catalog.ts`, `page-model.ts` | `criterio-pendientes.test.ts` | CUMPLIDO en la ficha (tras TAXONOMY_LABELS_ENABLED) |
| REQ-545 | «Excursiones en Kampala» no es excursión | `dictionary.json` (`palabrasNoEnTitulo`) | `criterio-pendientes.test.ts` | CUMPLIDO (falta OK del PO) |
## Menú sin «La Primera Pieza» (PO, 6 nov 2026, 21:16) — matriz de trazabilidad
| REQ-600 | «La Primera Pieza» fuera del menú (escritorio y celular, 6 idiomas); reversible con `MENU_PRIMERA_PIEZA` | `src/tours/lib/menu.ts`, `src/components/layout/Navbar.tsx` | `src/tours/lib/menu.test.ts`, `src/tours/lib/catalog-menu.test.ts` | CUMPLIDO (falta OK del PO) |
| REQ-601 | El pie enlaza /la-primera-pieza (no queda huérfana) solo con PRIMERA_PIEZA_ENABLED | `src/tours/lib/menu.ts` (`footerHubLinks`), `src/components/home/v2/SiteFooter.tsx` | `src/tours/lib/menu.test.ts` | CUMPLIDO (falta OK del PO) |
Pendiente: chip «Pieza libre» dentro de Experiencias (/tours), en otro frente.
## Chips de tipos principales en /tours (PO, 6 nov 2026, 21:16) — matriz de trazabilidad
| REQ-546 | Chips = Todo, Pieza libre y tipos con resultados por cantidad, etiquetas cortas | `src/tours/lib/format-chips.ts`, `src/components/tours/FormatChips.tsx`, `ToursPageClient.tsx` | `src/tours/lib/format-chips.test.ts` | CUMPLIDO tras TAXONOMY_FILTERS_ENABLED (apagada) |
| REQ-547 | Chip nuevo solo con resultados; sin chip en cero | `format-chips.ts` | `format-chips.test.ts` | CUMPLIDO tras la bandera |
| REQ-548 | Al elegir un chip todas las tarjetas tienen esa etiqueta | `ToursPageClient.tsx` (?formato=), `src/lib/db/repositories/tour-repository.ts` y `src/actions/tours.ts` (formato del índice en la tarjeta) | `format-chips.test.ts` + revisión con navegador (390/1366) | CUMPLIDO tras la bandera |
| REQ-549 | Etiquetas de chip = etiquetas de la tarjeta | `format-chips.ts` (`categoryLabel`) | `format-chips.test.ts` | CUMPLIDO |
