# STATUS — travel-puzzle-web

Actualizado: 3 nov 2026.

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

## Banderas (wrangler.jsonc)
- `BOOKINGS_ENABLED=false` — hasta que Freetour habilite cancelar (hoy responde 403). También muestra `/ayuda` y su enlace en el footer.
- `EMAILS_ENABLED=false`, `REVIEW_EMAILS_ENABLED=false`, `PAID_TOURS_ENABLED=false`.

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
| REQ-027 | Travelpayouts Drive tras bandera y solo en rutas elegidas | `src/affiliates/lib/drive.ts`, `AffiliateDrive.tsx`, `app/layout.tsx` | `drive.test.ts` | EN CURSO (apagado) |
| REQ-028 | Página /traslados con buscador Kiwitaxi tras bandera | `src/transfers/lib/widget.ts`, `TransfersWidget.tsx`, `app/traslados/page.tsx` | `widget.test.ts` | EN CURSO (apagado) |

## INC-002 (4 nov 2026) — 403 al cancelar en Freetour
| ID | Requisito | Archivo(s) | Test | Estado |
|---|---|---|---|---|
| REQ-019 | Conformidad con el Swagger | `gateway/lib/operations.js`, `gateway/lib/freetour-spec-required.json` | `spec-conformance.test.js` | CUMPLIDO |
| REQ-020 | Diagnóstico en cPanel | `gateway/lib/diagnostic.js`, `gateway/scripts/prueba-reservas.js` | `diagnostic.test.js` | CUMPLIDO |
Detalle: `docs/incidentes/INC-002.md`.
