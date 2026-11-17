# Inventario completo de lo que no está cerrado (REQ-10742)

Generado por `npx tsx src/scripts/dependencias-detenidas.ts` desde `docs/requisitos.md`, `wrangler.jsonc` y los workflows. No se edita a mano. El motivo sale de las palabras del estado de cada fila; «Sin clasificar» se revisa a mano.

Filas de requisitos: 1217 · sin cerrar: 480

## Resumen por motivo

| Qué lo detiene | Filas |
|---|---|
| Decisión, firma u OK del PO | 164 |
| Depende de otro folio sin cerrar | 84 |
| A medias (el estado no dice qué falta) | 63 |
| Sin iniciar (el estado no dice qué falta) | 48 |
| Falta publicar (PR, humo o merge) | 40 |
| Pieza sin construir o en borrador | 22 |
| Tarea a mano del PO | 17 |
| Tercero (proveedor u otra empresa) | 11 |
| Carga de datos o migración | 9 |
| Secreto o variable por cargar | 9 |
| Abogado | 8 |
| Ola posterior del plan | 4 |
| Bandera apagada sin motivo escrito | 1 |

## Banderas apagadas y variables vacías

| Bandera o variable | Estado | Dónde | Folio que la nombra | Estado del folio |
|---|---|---|---|---|
| `PROVEEDORES_BORRADORES_ON` | apagada | wrangler.jsonc | REQ-10714 | PENDIENTE (apagada; se prueba en `borradores.test.ts`) |
| `MILA_AVISOS_URL` | vacía | wrangler.jsonc | REQ-10731 | EN CURSO (16-11-2026 18:02 CDMX: el PO pidió cargar el secreto desde el chat, «hazlo tu», y dio los cinco destinatarios; `AVISO_PO_EMAIL` cargado en los secreto |
| `BIGBUS_OCTO_ENABLED` | apagada | wrangler.jsonc | REQ-3424 | PENDIENTE |
| `PROVIDER_CALENDAR_ENABLED` | apagada | wrangler.jsonc | REQ-3471 | EN CURSO (PR abierto; el merge es del PO) |
| `NEARBY_UNIFIED_ENABLED` | apagada | wrangler.jsonc | REQ-10752 | PENDIENTE (siguiente PR de la ola 5) |
| `SEARCH_LOG_ENABLED` | apagada | wrangler.jsonc | REQ-1311 | BLOQUEADO |
| `STRIPE_HOLD_ENABLED` | apagada | wrangler.jsonc | REQ-3483 | EN CURSO (pruebas en verde; PR) |
| `FREETOUR_POSTTOUR_PROMO_ENABLED` | apagada | wrangler.jsonc | REQ-1315 | BLOQUEADO (a propósito) |
| `FREETOUR_CHATBOT_ENABLED` | apagada | wrangler.jsonc | REQ-1315 | BLOQUEADO (a propósito) |
| `TAXONOMY_SYNC_ENABLED` | apagada | wrangler.jsonc | REQ-3510 | CUMPLIDO (fusionado en main con el PR #500, 4f18867a, 13 nov 2026; `TAXONOMY_SYNC_ENABLED`="false" en `wrangler.jsonc`. Suite completa `npx vitest run -t "REQ-" |
| `TAXONOMY_LINEAGE_ENABLED` | apagada | wrangler.jsonc | REQ-1305 | PENDIENTE |
| `TAXONOMY_CIRCUIT_EXTRA_ENABLED` | apagada | wrangler.jsonc | REQ-1303 | CUMPLIDO para `TAXONOMY_CIRCUITS_ENABLED` (#355, deploy 43123240415 con humo de producción verde, 12-11; en producción /destinos/pe/cusco/city-tour-cusco-qorica |
| `MARKETING_CONSENT_ENABLED` | apagada | wrangler.jsonc | REQ-1313 | BLOQUEADO (las dos que quedan en "false" en main; esperan la revisión del abogado, REQ-1323) |
| `COOKIES_POLICY_ENABLED` | apagada | wrangler.jsonc | REQ-1313 | BLOQUEADO (las dos que quedan en "false" en main; esperan la revisión del abogado, REQ-1323) |
| `BLOG_SHOW_DRAFTS` | apagada | wrangler.jsonc | REQ-256 | CUMPLIDO (apagado; src/blog/lib/registry.test.ts) |
| `SOCIAL_LINKEDIN_ENABLED` | apagada | wrangler.jsonc | REQ-1310 | EN CURSO (Facebook encendida: #293, deploy 42561967397 verde, 8-11; Instagram encendida: #301, deploy 42577832647 verde, 9-11; falta `SOCIAL_LINKEDIN_ENABLED`,  |
| `CART_PAYMENTS_ENABLED` | apagada | wrangler.jsonc | REQ-1306 | EN CURSO (revisión REQ-1604, 12-11 23:5x UTC: #135 fusionado el 12-11 04:21 UTC con humo verde; deploy 43154278943 verde; en main `ARMA_TU_VIAJE_ENABLED`="true" |
| `VISA_ENABLED` | apagada | wrangler.jsonc | REQ-1315 | BLOQUEADO (a propósito) |
| `ETIAS_ENABLED` | apagada | wrangler.jsonc | REQ-1315 | BLOQUEADO (a propósito) |

## Decisión, firma u OK del PO (164)

| Folio | Tipo | Depende de | Estado |
|---|---|---|---|
| REQ-027 | (tabla vieja) | — | CUMPLIDO (17-11-2026): 5 pruebas verdes (`drive.test.ts`), `AFFILIATES_ENABLED="true"` y en producción el script carga en /traslados (auditoría 7-11-2026, DOC-16). Pendiente aparte: /trenes da 404 (DOC-12, decisión del P |
| REQ-039 | (tabla vieja) | — | EN CURSO (falta OK del PO para escribir) |
| REQ-080 | (tabla vieja) | — | EN CURSO (revisión 17-11-2026): herramienta y checklist listas (6 pruebas verdes, `release-email-check.test.ts`); falta la primera corrida con reserva de prueba en producción (candado: OK del PO; registro vacío en `docs/ |
| REQ-107 | (tabla vieja) | — | EN CURSO (lógica con test verde; falta probar POST /payment en stage de FREETOUR y el OK del PO: candado Stripe) |
| REQ-130 | (tabla vieja) | — | EN CURSO (test verde; falta correr el workflow con OK del PO) |
| REQ-172 | (tabla vieja) | — | EN CURSO (tests verdes; falta OK del PO para publicar) |
| REQ-307 | (tabla vieja) | — | EN CURSO (regla de operación; falta que el workflow lo haga solo, con OK del PO) |
| REQ-119 | (tabla vieja) | — | EN CURSO (migración sin aplicar: candado) |
| REQ-353 | (tabla vieja) | — | CUMPLIDO en código (revisión 17-11-2026: 1 prueba verde, `alias-ingest.test.ts`; cobertura local del 6-11 solo GeoNames); falta la corrida del workflow «Alias de destino (ensayo)» con Wikidata: 0 corridas en GitHub Actio |
| REQ-370 | (tabla vieja) | — | CUMPLIDO (plan; implementación pendiente de decisión del PO) |
| REQ-470 | (tabla vieja) | — | EN CURSO (falta correr el workflow con OK del PO) |
| REQ-409 | (tabla vieja) | — | PENDIENTE (migración 0017: candado) |
| REQ-425 | (tabla vieja) | — | PENDIENTE (candado) |
| REQ-450 | (tabla vieja) | — | EN CURSO (tests verdes; falta preview con la bandera y OK del PO) — **REEMPLAZADO en parte por REQ-850** (solo Favoritos, todos, por páginas) y **por REQ-10515/10516** (la parte «solo con reseñas reales»: lo sin reseñas  |
| REQ-453 | (tabla vieja) | — | EN CURSO (tests verdes; falta preview con la bandera y OK del PO) — **REEMPLAZADO en parte por REQ-852** (todas las excursiones, por páginas; el tope de 9 ya no aplica) y **por REQ-10515/10516** (gate C6: lo sin reseñas, |
| REQ-174 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-582 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-583 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-584 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-585 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-520 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-521 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) — **REEMPLAZADO en parte por REQ-860** (la posición: ya no va sobre la foto) |
| REQ-522 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-523 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-524 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-525 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-526 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) — **REEMPLAZADO en parte por REQ-860** («★ Favorito» sale de la foto; la categoría se queda) |
| REQ-531 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) — **parte EN «Free tour» REEMPLAZADA por REQ-1103** (PO, 7 nov 2026, 06:06: en inglés la categoría es «Free Puzzle») — **fila «Tour → Visita guiada» REEMPLAZADA por REQ-1250** (de |
| REQ-527 | (tabla vieja) | — | CUMPLIDO en código (revisión 17-11-2026): 2 pruebas verdes (`ExperienceCard.test.ts`), carruseles en producción (auditoría 7-11-2026, D02/D03); falta la firma visual del PO del look and feel (sin registro en el repo) |
| REQ-530 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-532 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-533 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-534 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) — **REEMPLAZADO en parte por REQ-865** (una base «excursión» de 6 h o más necesita señal de salida) |
| REQ-535 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-536 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-537 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-538 | (tabla vieja) | — | CUMPLIDO en el repo (falta aplicar en D1 con OK del PO) |
| REQ-570 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-571 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-572 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-573 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-574 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-575 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-576 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-577 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-578 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-579 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-580 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-581 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-588 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-540 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-541 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) — **Ampliado por REQ-867…869** (títulos con dos actividades) |
| REQ-542 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-545 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-600 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-601 | (tabla vieja) | — | CUMPLIDO (falta OK del PO para publicar) |
| REQ-614 | (tabla vieja) | — | BLOQUEADO (migraciones 0020/0021 solo propuestas; candado) |
| REQ-546 | (tabla vieja) | — | CUMPLIDO (falta encender TAXONOMY_FILTERS_ENABLED con OK del PO) |
| REQ-982 | (tabla vieja) | — | EN CURSO (PR de encendido con humo; falta el OK del PO para fusionar) |
| REQ-850 | (tabla vieja) | — | CUMPLIDO (falta OK del PO) — **REEMPLAZADO en parte por REQ-10515** («y solo ellos»: después de los Favoritos entra el resto por puntaje del prior) |
| REQ-851 | (tabla vieja) | — | CUMPLIDO (falta OK del PO) |
| REQ-852 | (tabla vieja) | — | CUMPLIDO (falta OK del PO) |
| REQ-854 | (tabla vieja) | — | CUMPLIDO (falta OK del PO) |
| REQ-855 | (tabla vieja) | — | CUMPLIDO (falta OK del PO) |
| REQ-860 | (tabla vieja) | — | CUMPLIDO (falta OK del PO) |
| REQ-865 | (tabla vieja) | — | CUMPLIDO (falta OK del PO) — **CORREGIDO por REQ-1253** (INC-008: sin señal de salida no basta; hace falta señal de quedarse en la ciudad) |
| REQ-866 | (tabla vieja) | — | CUMPLIDO (falta OK del PO) |
| REQ-867 | (tabla vieja) | — | CUMPLIDO (falta OK del PO) |
| REQ-868 | (tabla vieja) | — | CUMPLIDO (falta OK del PO) |
| REQ-869 | (tabla vieja) | — | CUMPLIDO (falta OK del PO) |
| REQ-650 | (tabla vieja) | — | CUMPLIDO (tests; tras LOCALE_URLS_ENABLED="false", falta preview encendido y OK del PO) |
| REQ-651 | (tabla vieja) | — | CUMPLIDO (tests; tras LOCALE_URLS_ENABLED="false", falta preview encendido y OK del PO) |
| REQ-652 | (tabla vieja) | — | CUMPLIDO (tests; tras LOCALE_URLS_ENABLED="false", falta preview encendido y OK del PO) |
| REQ-653 | (tabla vieja) | — | CUMPLIDO (tests; tras LOCALE_URLS_ENABLED="false", falta preview encendido y OK del PO) |
| REQ-654 | (tabla vieja) | — | CUMPLIDO (tests; tras LOCALE_URLS_ENABLED="false", falta preview encendido y OK del PO) |
| REQ-655 | (tabla vieja) | — | CUMPLIDO (tests; tras LOCALE_URLS_ENABLED="false", falta preview encendido y OK del PO) |
| REQ-656 | (tabla vieja) | — | CUMPLIDO (tests; tras LOCALE_URLS_ENABLED="false", falta preview encendido y OK del PO) |
| REQ-657 | (tabla vieja) | — | CUMPLIDO (tests; tras LOCALE_URLS_ENABLED="false", falta preview encendido y OK del PO) |
| REQ-658 | (tabla vieja) | — | CUMPLIDO (tests; tras LOCALE_URLS_ENABLED="false", falta preview encendido y OK del PO) |
| REQ-659 | (tabla vieja) | — | CUMPLIDO (tests; tras LOCALE_URLS_ENABLED="false", falta preview encendido y OK del PO) |
| REQ-752 | (tabla vieja) | — | CUMPLIDO (falta firma del PO de los mapeos; src/taxonomy/data/mapping/agencias.test.ts) |
| REQ-1102 | (tabla vieja) | — | **REEMPLAZADO por REQ-1103** (se publicó en #243; el PO cambió la regla el 7 nov 2026, 06:06) |
| REQ-1100 | (tabla vieja) | — | EN CURSO (test verde; falta humo del PR y OK del PO) |
| REQ-1101 | (tabla vieja) | — | EN CURSO (test verde; falta humo del PR y OK del PO) |
| REQ-1103 | (tabla vieja) | — | EN CURSO (test verde; falta humo del PR y OK del PO) |
| REQ-1240 | (tabla vieja) | — | EN CURSO (test verde; falta humo del PR y OK del PO) |
| REQ-1241 | (tabla vieja) | — | EN CURSO (test verde; falta humo del PR y OK del PO) |
| REQ-1242 | (tabla vieja) | — | EN CURSO (test verde; falta humo del PR y OK del PO) |
| REQ-1243 | (tabla vieja) | — | EN CURSO (test verde; falta humo del PR y OK del PO) |
| REQ-1244 | (tabla vieja) | — | EN CURSO (test verde; falta humo del PR y OK del PO) |
| REQ-1245 | (tabla vieja) | — | EN CURSO (test verde; falta humo del PR y OK del PO) |
| REQ-1246 | (tabla vieja) | — | EN CURSO (test verde; falta humo del PR y OK del PO) |
| REQ-1250 | (tabla vieja) | — | EN CURSO (test verde; falta humo del PR y OK del PO) |
| REQ-1251 | (tabla vieja) | — | EN CURSO (test verde; falta humo del PR y OK del PO) |
| REQ-1253 | (tabla vieja) | — | EN CURSO (test verde; falta humo del PR y OK del PO) |
| REQ-1256 | (tabla vieja) | — | EN CURSO (test verde; falta humo del PR y OK del PO) |
| REQ-1260 | (tabla vieja) | — | EN CURSO (test verde; falta humo del PR y OK del PO) |
| REQ-1261 | (tabla vieja) | — | EN CURSO (test verde; falta humo del PR y OK del PO) |
| REQ-1262 | (tabla vieja) | — | EN CURSO (test verde; falta humo del PR y OK del PO) |
| REQ-1264 | (tabla vieja) | — | EN CURSO (test verde; falta humo del PR y OK del PO) |
| REQ-1254 | (tabla vieja) | — | EN CURSO (test verde; falta humo del PR y OK del PO) |
| REQ-1255 | (tabla vieja) | — | EN CURSO (test verde; falta humo del PR y OK del PO) |
| REQ-1290 | (tabla vieja) | — | EN CURSO (test verde; falta humo del PR y OK del PO) |
| REQ-1292 | (tabla vieja) | — | EN CURSO (borrador en docs/proveedores/borrador-directorio-2026-11-07.md; OK del PO el 11 nov 13:11 (REQ-1653); falta la carga, REQ-1656) |
| REQ-1265 | (tabla vieja) | — | EN CURSO (test verde; falta humo del PR y OK del PO) |
| REQ-1306 | VALIDACIÓN | — | EN CURSO (revisión REQ-1604, 12-11 23:5x UTC: #135 fusionado el 12-11 04:21 UTC con humo verde; deploy 43154278943 verde; en main `ARMA_TU_VIAJE_ENABLED`="true" y `CART_PAYMENTS_ENABLED`="false". Faltan, según el PO 11-1 |
| REQ-1314 | DEFINICIÓN | — | PENDIENTE (solo `STRIPE_HOLD_ENABLED`, en "false" en main; falta la definición del PO) |
| REQ-1328 | VALIDACIÓN | — | PENDIENTE |
| REQ-1331 | DEFINICIÓN | — | PENDIENTE |
| REQ-1332 | DEFINICIÓN | — | PENDIENTE |
| REQ-1333 | DEFINICIÓN | — | PENDIENTE |
| REQ-1334 | DEFINICIÓN | — | PENDIENTE |
| REQ-1335 | DEFINICIÓN | — | PENDIENTE |
| REQ-1336 | DEFINICIÓN | — | PENDIENTE |
| REQ-1337 | VALIDACIÓN | — | PENDIENTE |
| REQ-1339 | DEFINICIÓN | — | PENDIENTE |
| REQ-1353 | VALIDACIÓN | — | EN CURSO (PO 11-11: «ok a todo»; #216, #229, #238 y #249 cerrados el 11-11; falta borrar la rama `diag/viajes-conteo`: el proxy de la sesión no permite borrar ramas, la borra el PO en GitHub) |
| REQ-1626 | CÓDIGO | — | EN CURSO (test verde; falta PR y OK del PO) |
| REQ-1627 | CÓDIGO | — | EN CURSO (test verde; falta PR y OK del PO) |
| REQ-1628 | DEFINICIÓN | — | PENDIENTE |
| REQ-1379 | VALIDACIÓN | — | EN CURSO (falta OK del PO) |
| REQ-1383 | DEFINICIÓN | — | APROBADO (registrar en la matriz) |
| REQ-1384 | DEFINICIÓN | — | APROBADO |
| REQ-1385 | DEFINICIÓN | — | APROBADO |
| REQ-1386 | DEFINICIÓN | — | APROBADO |
| REQ-1391 | VALIDACIÓN | — | PENDIENTE |
| REQ-1522 | VALIDACIÓN | — | PENDIENTE |
| REQ-1524 | VALIDACIÓN | — | PENDIENTE |
| REQ-1525 | VALIDACIÓN | — | PENDIENTE |
| REQ-3427 | DEFINICIÓN | — | APROBADO (desbloquea los periodos de REQ-1388 para India) |
| REQ-3455 | DEFINICIÓN | — | APROBADO (definición; construcción con los complementos) |
| REQ-1420 | CÓDIGO | — | EN CURSO (test verde; falta humo del PR y OK del PO) |
| REQ-1402 a REQ-1409 | (tabla vieja) | — | NO VERIFICADO: sin registro en el archivo ni commit identificado; quedan como RETRO sin caracterizar hasta que el PO o una sesión identifique a qué código corresponden (decisión del PO: cerrar como CANCELADO o caracteriz |
| REQ-1541 | CÓDIGO | — | EN CURSO (bandera `TANGOL_ENABLED` apagada; el código ya está en `main` con #367/fd29f96. Falta preview con la bandera encendida, humo verde y OK del PO) |
| REQ-1542 | CÓDIGO | — | EN CURSO (bandera `TANGOL_ENABLED` apagada; el código ya está en `main` con #367/fd29f96. Falta preview con la bandera encendida, humo verde y OK del PO) |
| REQ-1543 | CÓDIGO | — | EN CURSO (bandera `TANGOL_ENABLED` apagada; el código ya está en `main` con #367/fd29f96. Falta preview con la bandera encendida, humo verde y OK del PO) |
| REQ-1550 | CÓDIGO | — | EN CURSO (tests verdes, 4/4 corridos el 12 nov; probado en vivo en la pasarela el 11 nov con el inventario. #367 YA está fusionado en `main` (fd29f96): lo que falta es encender `TANGOL_ENABLED` con preview, humo y OK del |
| REQ-1551 | CÓDIGO | — | EN CURSO (tests verdes, 6/6 corridos el 12 nov; en la pasarela desde el 11 nov, `/health` ok. #367 YA está fusionado en `main` (fd29f96): lo que falta es encender `TANGOL_ENABLED` con preview, humo y OK del PO) |
| REQ-1573 | VALIDACIÓN | — | CUMPLIDO (PO, 11 nov 2026 15:13 CDMX: «ya tenemos confirmacion de marca blanca vamos para adelante»; falta guardar el correo de Tangol como evidencia en el expediente) |
| REQ-1620 | DEFINICIÓN | — | CUMPLIDO (respuesta literal del PO; pendiente de que avise si la otra sesión dejó algo) |
| REQ-3312 | PRUEBA | — | EN CURSO (4 pruebas en verde; falta humo del PR y OK del PO) |
| REQ-3323 | CÓDIGO | — | EN CURSO (3 pruebas en verde; falta humo del PR y OK del PO) |
| REQ-3425 | DEFINICIÓN | — | PENDIENTE |
| REQ-3433 | DEFINICIÓN | — | PENDIENTE |
| REQ-3519 | CÓDIGO | — | CUMPLIDO en código (test verde). Pendiente: la primera corrida real del workflow «Tangol sync de tours» con la casilla de escritura; es carga de datos a R2 privado y D1 (candado del PO) (17-11-2026 (constructora, REQ-107 |
| REQ-10534 | DATOS | — | EN CURSO (ensayo del 14 nov con los originales bajados de Gmail a tmp/: Exotic 15/15, Turismo Asiático 11/11, Destino Colombia 10/10, Fantástica China 51/51, Extime 179/179 con renglón del Excel, regla en `matchDocument` |
| REQ-10577 | VALIDACIÓN | — | PENDIENTE |
| REQ-10640 | DEFINICIÓN | — | EN CURSO (tablero creado el 14 nov 2026; se mantiene en cada cierre) |
| REQ-10644 | DEFINICIÓN | — | PENDIENTE (definición del PO dada el 15-11-2026; falta el código en su ola, tras bandera apagada) |
| REQ-10645 | DEFINICIÓN | — | PENDIENTE (falta la definición del PO) |
| REQ-10648 | CÓDIGO | — | CUMPLIDO (8 pruebas verdes el 14 nov 2026, `npx vitest run src/proveedores/lib/preguntas.test.ts`; falta conectar `diario.ts` y `entrante.ts` en su PR y el merge con OK del PO) |
| REQ-10668 | DEFINICIÓN | — | PENDIENTE (plan para firma en `docs/plan-actualizacion-diaria-2026-11.md`) |
| REQ-10670 | DEFINICIÓN | — | PENDIENTE (plan para firma) |
| REQ-10683 | DEFINICIÓN | — | EN CURSO (15 nov 2026: folios de este chat registrados; revisora de Travel Puzzle ampliada; skill de trazabilidad propuesto al PO) |
| REQ-10684 | DEFINICIÓN | — | PENDIENTE (definición del PO citada; falta el código, ola D6 del plan de actualización diaria) |
| REQ-10690 | DEFINICIÓN | — | EN CURSO (15 nov 2026: 8 de 16 expedientes: Extime (revisor) y, con las 11 secciones y sin datos confidenciales, Tangol primero (decisión 52) y luego Big Bus, Destino Colombia, Exotic Escapes, Fantástica China, Inca Worl |
| REQ-10700 | DEFINICIÓN | — | EN CURSO (aplicado en `src/taxonomy/data/dictionary.json`, `src/taxonomy/lib/filters.ts` y `src/trips/lib/copy.ts`; prueba `src/taxonomy/lib/actividades.test.ts` en verde; publicado en #600 y verificado en producción el  |
| REQ-10717 | DEFINICIÓN | — | EN CURSO (regla en CLAUDE.md; barrido: Extime y Tangol hechos; faltan los demás proveedores) |
| REQ-10718 | DEFINICIÓN | — | PENDIENTE (definición del PO citada; falta el plan) |
| REQ-10722 | DEFINICIÓN | — | EN CURSO (tarea creada; primera corrida el 16-11-2026) |
| REQ-10742 | CÓDIGO | — | EN CURSO (6 casos revisados a mano en `docs/dependencias-detenidas.md`; inventario completo pedido por el PO el 16-11-2026 16:17 CDMX, «Haz lista exhaiustiva», en `docs/dependencias-detenidas-inventario.md`: 509 folios s |
| REQ-10743 | DEFINICIÓN | — | CUMPLIDO (definición escrita en `CLAUDE.md` y en la tarea «Constructora cada 6 h»; falta la misma sección en el `CLAUDE.md` de `zoefel-mila`) |
| REQ-10748 | CÓDIGO | — | CUMPLIDO en código (17-11-2026: `src/taxonomy/lib/reclasificacion-agencia.test.ts` 5/5; lista generada en `docs/taxonomia/reclasificacion-agencias-2026-11-17/`: 371 viajes, 7 cambiarían (Fantástica China 1, Inca World 6) |
| REQ-10749 | CÓDIGO | — | CUMPLIDO en código (17-11-2026: `originals.test.ts` 2 pruebas nuevas, suite ingest+taxonomy 667 verdes; los 179 huecos de Extime salen de `contrato-huecos.json`). Lista antes/después en `docs/taxonomia/reclasificacion-ag |

## Depende de otro folio sin cerrar (84)

| Folio | Tipo | Depende de | Estado |
|---|---|---|---|
| REQ-1647 | (tabla vieja) | REQ-1639 | PENDIENTE |
| REQ-1649 | (tabla vieja) | REQ-1538 | PENDIENTE |
| REQ-1650 | (tabla vieja) | REQ-1640, REQ-1641 | PENDIENTE |
| REQ-1655 | (tabla vieja) | REQ-1658 | EN CURSO (14 nov 2026: bandera encendida en wrangler.jsonc con OK del PO «A) Sí, enciéndela»; falta el primer recordatorio real con copia al PO, que solo sale después de que el PO mande el primer correo a ese proveedor) |
| REQ-1662 | (tabla vieja) | REQ-1655 | PENDIENTE |
| REQ-1568 | (tabla vieja) | REQ-1569, REQ-1663 | EN CURSO |
| REQ-1305 | BANDERA | REQ-1316 | PENDIENTE |
| REQ-1310 | BANDERA | REQ-1322 | EN CURSO (Facebook encendida: #293, deploy 42561967397 verde, 8-11; Instagram encendida: #301, deploy 42577832647 verde, 9-11; falta `SOCIAL_LINKEDIN_ENABLED`, que espera REQ-1322 y REQ-1356) |
| REQ-1311 | BANDERA | REQ-1323 | BLOQUEADO |
| REQ-1313 | BANDERA | REQ-1323 | BLOQUEADO (las dos que quedan en "false" en main; esperan la revisión del abogado, REQ-1323) |
| REQ-1342 | VALIDACIÓN | REQ-1316 | PENDIENTE |
| REQ-1350 | DEFINICIÓN | REQ-1348 | PENDIENTE |
| REQ-1351 | CÓDIGO | REQ-1348 | PENDIENTE |
| REQ-1352 | TAREA-PO | REQ-1316 | PENDIENTE |
| REQ-1356 | VALIDACIÓN | REQ-1322 | PENDIENTE |
| REQ-1675 | DEFINICIÓN | REQ-1381 | EN CURSO (decisión del PO, 12 nov 2026, respuesta literal: «Partiendo de lo que envío. opunto medio B y pedirles que nos conmopartan los casos de uso que apliquen con sus proveedores para incluirlo en los t y condiciones |
| REQ-3343 | CÓDIGO | REQ-1675, REQ-1368 | BLOQUEADO (espera los casos por escrito de Fantástica China) |
| REQ-3345 | DEFINICIÓN | REQ-1381 | PENDIENTE (falta la decisión del PO sobre el diseño y el plan do-plan) |
| REQ-1368 | VALIDACIÓN | REQ-1363, REQ-1364, REQ-1365, REQ-1366, REQ-1367, REQ-1675 | PENDIENTE |
| REQ-1372 | CÓDIGO | REQ-1371 | PENDIENTE |
| REQ-1380 | VALIDACIÓN | REQ-1375 | EN CURSO |
| REQ-1381 | VALIDACIÓN | REQ-1380 | PENDIENTE |
| REQ-1382 | TAREA-PO | REQ-1381 | PENDIENTE (la firma sigue tras REQ-1381. El borrador r6118754695789496924 del hilo de Exotic, 12 nov 00:37 UTC, sigue sin enviar; Exotic propuso reunión el 18 nov (REQ-1363); Corrida 12 nov 2026 18:54 UTC) |
| REQ-1387 | DEFINICIÓN | REQ-1376 | APROBADO |
| REQ-1389 | BANDERA | REQ-1388 | PENDIENTE |
| REQ-1390 | CÓDIGO | REQ-1389 | PENDIENTE (plan sin firmar) |
| REQ-1523 | VALIDACIÓN | REQ-1366 | PENDIENTE (el correo de claulet@ del 11 nov 2026 23:54 UTC ya le dice a Rositsa: «We will only offer the products we can book on the partner platform». El OK del PO para fijar la regla en código (REQ-1607) sigue sin regi |
| REQ-1529 | DEFINICIÓN | REQ-1366 | PENDIENTE (los siguientes pasos de Ventrata OCTO se preguntaron el 11 nov 2026 23:54 UTC, punto 8; sin respuesta; falta guardar la autorización en docs/bigbus/; Corrida 12 nov 2026 00:54 UTC) |
| REQ-1607 | CÓDIGO | REQ-1523 | BLOQUEADO (espera OK del PO) |
| REQ-3459 | DEFINICIÓN | REQ-1572 | PENDIENTE (espera decisión del PO. Hay un borrador sin enviar r8490216246750404090 a hernan@tangol.com, 12 nov 2026 17:47 UTC; no se envía sin OK del PO; Corrida 12 nov 2026 18:54 UTC) |
| REQ-1404 | VALIDACIÓN | REQ-1364 | PENDIENTE (Beibei ya contestó en el hilo nuevo el 12 nov 2026 04:51 UTC; el borrador viejo r-4532302810611949390 sigue en Gmail y quedó superado. Falta que el PO confirme que se descarta: un solo borrador vigente, REQ-15 |
| REQ-1405 | VALIDACIÓN | REQ-1370 | PENDIENTE |
| REQ-3426 | DEFINICIÓN | REQ-1389 | APROBADO (definición; construcción con REQ-1388 a REQ-1390) |
| REQ-3439 | DEFINICIÓN | REQ-1404 | APROBADO (definición) |
| REQ-3454 | DEFINICIÓN | REQ-3443 | EN CURSO (plan firmado G1–G5 en `docs/plan-calendario-proveedores-pdf.md`, PR #446. Ola 1 de código en la rama `feat/calendario-proveedores-pdf`: esquema con vigencia, días por periodo, recargos que se suman por opción y |
| REQ-3456 | DEFINICIÓN | REQ-3454 | APROBADO (definición; construcción con el plan do-plan de REQ-3454) |
| REQ-1411 | VALIDACIÓN | REQ-1382 | SIN VERIFICAR |
| REQ-1421 | CÓDIGO | REQ-1420 | EN CURSO (PR abierto: 12 temas activos en el diccionario, índice v6, `?tema=` filtra y conteos sin ceros; tests `facets`, `query-temas`, `MoreFilters` verdes; merge del PO) |
| REQ-1422 | CÓDIGO | REQ-1421 | EN CURSO (PR abierto: `?atrib=` con cómo te mueves, nocturno, entrada incluida, día completo, en español y con vuelo; tests verdes; merge del PO) |
| REQ-1672 | CÓDIGO | REQ-1663 | EN CURSO (11 nov 2026: código, tests y build verdes en feat/proveedores-mila; falta migración, bandera, REQ-1584 y REQ-1585) |
| REQ-3446 | CÓDIGO | REQ-1291 | BLOQUEADO |
| REQ-3448 | TAREA-PO | REQ-3430 | PENDIENTE |
| REQ-1609 | CÓDIGO | REQ-1075 | EN CURSO |
| REQ-1570 | CÓDIGO | REQ-1548 | PENDIENTE |
| REQ-1571 | CÓDIGO | REQ-1548 | PENDIENTE |
| REQ-3334 | CÓDIGO | REQ-3333 | EN CURSO |
| REQ-3335 | CÓDIGO | REQ-3333 | EN CURSO |
| REQ-3337 | CÓDIGO | REQ-3336 | EN CURSO (ejemplo bilingüe y validador listos; el prompt se cambia con el merge) |
| REQ-3339 | CÓDIGO | REQ-3338 | PENDIENTE |
| REQ-3340 | DATOS | REQ-3336, REQ-3338 | EN CURSO (25 guías en inglés validadas en el PR de la ola 1; el blog va en la ola 3) |
| REQ-3444 | CÓDIGO | REQ-3443 | EN CURSO (pruebas en verde) |
| REQ-3445 | PRUEBA | REQ-3443 | EN CURSO (pruebas en verde) |
| REQ-3468 | CÓDIGO | REQ-3443, REQ-3444, REQ-1542 | EN CURSO (PR abierto; el merge es del PO) |
| REQ-3469 | CÓDIGO | REQ-3468 | EN CURSO (PR abierto; el merge es del PO) |
| REQ-3470 | CÓDIGO | REQ-3468 | EN CURSO (PR abierto; el merge es del PO) |
| REQ-3471 | CÓDIGO | REQ-3468, REQ-1543 | EN CURSO (PR abierto; el merge es del PO) |
| REQ-3458 | CÓDIGO | REQ-601 | EN CURSO (PR abierto; el merge es del PO) |
| REQ-3450 | CÓDIGO | REQ-3449 | EN CURSO |
| REQ-3329 | BANDERA | REQ-3330, REQ-3331 | PENDIENTE |
| REQ-3331 | TAREA-PO | REQ-3330 | PENDIENTE |
| REQ-3332 | DATOS | REQ-1607, REQ-1523 | BLOQUEADO |
| REQ-3424 | VALIDACIÓN | REQ-3330 | PENDIENTE |
| REQ-3437 | VALIDACIÓN | REQ-3330, REQ-3331 | PENDIENTE |
| REQ-3442 | DATOS | REQ-3441 | EN CURSO |
| REQ-3461 | CÓDIGO | REQ-1623 | CUMPLIDO (23 pruebas verdes en `src/catalog/lib/sql.test.ts`; falta merge y el OK del PO para aplicar la 0026) |
| REQ-3487 | CÓDIGO | REQ-3486 | SIN VERIFICAR (el código está en main, `.github/workflows/tipos-tangol.yml` y `src/scripts/tipos-tangol.ts`, pero no hay ninguna prueba que cite el folio; incumple el punto 2 del protocolo. Falta además la corrida) — rev |
| REQ-3527 | CÓDIGO | REQ-3526 | EN CURSO |
| REQ-3528 | CÓDIGO | REQ-3527 | EN CURSO |
| REQ-3537 | CÓDIGO | REQ-3527 | EN CURSO (tests verdes; PR abierto, falta humo y merge del PO) |
| REQ-3538 | CÓDIGO | REQ-3537 | EN CURSO (tests verdes; PR abierto, falta humo y merge del PO) |
| REQ-10514 | CÓDIGO | REQ-10512 | EN CURSO |
| REQ-10520 | CÓDIGO | REQ-1609 | EN CURSO (tests verdes; PR) |
| REQ-10521 | CÓDIGO | REQ-975 | EN CURSO (tests verdes; PR) |
| REQ-10535 | CÓDIGO | REQ-10534 | PENDIENTE |
| REQ-10576 | DATOS | REQ-10575 | PENDIENTE |
| REQ-10669 | DEFINICIÓN | REQ-3511 | PENDIENTE (plan para firma) |
| REQ-10691 | DEFINICIÓN | REQ-10690 | CUMPLIDO como definición (15 nov 2026, firma del PO); el código queda PENDIENTE con folios propios al construir cada conector |
| REQ-10692 | TAREA | REQ-10691 | EN CURSO (15 nov 2026: expediente creado por el revisor, secciones 1–7 llenas sin datos confidenciales; pendientes 1–5 abiertos) |
| REQ-10724 | TAREA-PO | REQ-1638, REQ-1537 | PENDIENTE |
| REQ-10727 | DEFINICIÓN | REQ-3454 | APROBADO (definición) |
| REQ-10733 | DEFINICIÓN | REQ-10728 | APROBADO (definición); regla en `src/taxonomy/lib/incluido-cantidad.ts` con prueba verde; falta mostrar la etiqueta en la ficha. Mostrada en la ficha el 17-11-2026 (`incluido-ficha.ts`, prueba REQ-10733: «Autobús turísti |
| REQ-10744 | CÓDIGO | REQ-10731 | CUMPLIDO en código (16-11-2026 17:59 CDMX: 8 pruebas en verde, `npx vitest run src/taxonomy/aviso-tipo-nuevo.test.ts`; tsc en verde); falta cargar el secreto y encender la bandera (REQ-10731) |
| REQ-10753 | CÓDIGO | REQ-10752 | PENDIENTE |
| REQ-10755 | TAREA | REQ-10754 | PENDIENTE |

## A medias (el estado no dice qué falta) (63)

| Folio | Tipo | Depende de | Estado |
|---|---|---|---|
| REQ-076 | (tabla vieja) | — | EN CURSO (revisión 17-11-2026): el código ya consulta `GET /events/{id}` en vivo (`src/booking/service.ts:73`, `src/app/api/freetour/booking/route.ts:61`, API 2.2 encendida); falta marcar `// REQ-076` y un test `it('REQ- |
| REQ-077 | (tabla vieja) | — | EN CURSO (revisión 17-11-2026): 14 pruebas verdes (`retry`, `guarded-sync`, `api`, `guard-plan`), incluida la regla del error 63; falta conectar `canCheckPaymentStatus` a un cron de estado de pago, que hoy no existe (tou |
| REQ-078 | (tabla vieja) | — | EN CURSO (log por corrida y horas desde el último sync: test verde; falta canal de aviso y registro de reservas de prueba) |
| REQ-086 | (tabla vieja) | — | EN CURSO |
| REQ-102 | (tabla vieja) | — | EN CURSO |
| REQ-110 | (tabla vieja) | — | EN CURSO (vista, agregada y WhatsApp se registran en los logs del Worker; «reservada» está definida y probada, se emite cuando exista la reserva desde el carrito) |
| REQ-154 | (tabla vieja) | — | EN CURSO |
| REQ-156 | (tabla vieja) | — | EN CURSO |
| REQ-157 | (tabla vieja) | — | EN CURSO |
| REQ-062 | (tabla vieja) | — | EN CURSO (revisión visual) |
| REQ-068 | (tabla vieja) | — | EN CURSO (revisión visual) |
| REQ-300 | (tabla vieja) | — | EN CURSO (revisión visual) |
| REQ-159 | (tabla vieja) | — | EN CURSO |
| REQ-115 | (tabla vieja) | — | EN CURSO |
| REQ-116 | (tabla vieja) | — | EN CURSO |
| REQ-117 | (tabla vieja) | — | EN CURSO |
| REQ-118 | (tabla vieja) | — | EN CURSO |
| REQ-471 | (tabla vieja) | — | EN CURSO |
| REQ-472 | (tabla vieja) | — | EN CURSO |
| REQ-473 | (tabla vieja) | — | EN CURSO |
| REQ-155 | (tabla vieja) | — | EN CURSO (tests verdes; falta el primer deploy con el workflow nuevo) |
| REQ-625 | (tabla vieja) | — | EN CURSO (falta la reserva de prueba del PO) |
| REQ-975 | (tabla vieja) | — | EN CURSO (tests de estructura en verde; falta la primera corrida real del workflow) |
| REQ-677 | (tabla vieja) | — | EN CURSO (Olas 0–3 y #224 en main; en la fila) |
| REQ-775 | (tabla vieja) | — | EN CURSO (src/ingest/backfill.test.ts; falta la corrida) |
| REQ-1086 | (tabla vieja) | — | EN CURSO |
| REQ-1232 | (tabla vieja) | — | EN CURSO (tests de estructura en verde; falta la primera corrida real) |
| REQ-1252 | (tabla vieja) | — | EN CURSO (test verde; falta la revisión del PO) |
| REQ-1263 | (tabla vieja) | — | EN CURSO (test verde) |
| REQ-1294 | (tabla vieja) | — | EN CURSO (la presentación la reemplaza REQ-1297; recordatorio, reintento y alta siguen aquí) |
| REQ-1316 | DATOS | — | EN CURSO |
| REQ-1344 | CÓDIGO | — | EN CURSO |
| REQ-1345 | CÓDIGO | — | EN CURSO |
| REQ-1346 | CÓDIGO | — | EN CURSO |
| REQ-1357 | CÓDIGO | — | EN CURSO |
| REQ-1392 | CÓDIGO | — | EN CURSO (falta guardar) |
| REQ-1564 | (tabla vieja) | — | EN CURSO (prod 12-11: Lighthouse sin imágenes fuera de pantalla en las 3 páginas, móvil y escritorio; falta la prueba Playwright del criterio) |
| REQ-1577 | (tabla vieja) | — | EN CURSO |
| REQ-3322 | CÓDIGO | — | EN CURSO (PR abierto) |
| REQ-3370 | CÓDIGO | — | EN CURSO |
| REQ-3371 | CÓDIGO | — | EN CURSO |
| REQ-3372 | CÓDIGO | — | EN CURSO |
| REQ-3333 | CÓDIGO | — | EN CURSO |
| REQ-3336 | CÓDIGO | — | EN CURSO |
| REQ-3443 | CÓDIGO | — | EN CURSO (9 pruebas en verde; sin conectar, gates G1-G4 del PO) |
| REQ-3449 | CÓDIGO | — | EN CURSO |
| REQ-3451 | CÓDIGO | — | EN CURSO |
| REQ-3452 | CÓDIGO | — | EN CURSO |
| REQ-3435 | CÓDIGO | — | EN CURSO |
| REQ-1604 | TAREA | — | EN CURSO (tarea programada creada el 11-11) |
| REQ-3423 | CÓDIGO | — | EN CURSO (lógica con test verde en `public-view.test.ts`; falta la revisión visual, REQ-3424) |
| REQ-3441 | CÓDIGO | — | EN CURSO |
| REQ-3497 | CÓDIGO | — | EN CURSO (tests verdes; PR) |
| REQ-3486 | CÓDIGO | — | EN CURSO (3 pruebas en verde; falta la corrida) |
| REQ-3536 | CÓDIGO | — | EN CURSO (prueba en verde; PR) |
| REQ-3482 | CÓDIGO | — | EN CURSO (pruebas en verde; PR) |
| REQ-3483 | CÓDIGO | — | EN CURSO (pruebas en verde; PR) |
| REQ-10509 | CÓDIGO | — | EN CURSO (pruebas en verde; PR) |
| REQ-10510 | CÓDIGO | — | EN CURSO |
| REQ-10511 | CÓDIGO | — | EN CURSO |
| REQ-10512 | DATOS | — | EN CURSO |
| REQ-10513 | CÓDIGO | — | EN CURSO |
| REQ-10575 | CÓDIGO | — | EN CURSO (11/11 pruebas en verde en la sesión; ensayo 0/29 por el 403) |

## Sin iniciar (el estado no dice qué falta) (48)

| Folio | Tipo | Depende de | Estado |
|---|---|---|---|
| REQ-400 | (tabla vieja) | — | PENDIENTE (gate firmado; la etiqueta está escrita en la rama de REQ-174, en espera sobre #141) |
| REQ-420 | (tabla vieja) | — | PENDIENTE (gate G-T1) |
| REQ-422 | (tabla vieja) | — | PENDIENTE (mapeo de los 3 valores de hoy: gate G-T8) |
| REQ-423 | (tabla vieja) | — | PENDIENTE |
| REQ-424 | (tabla vieja) | — | PENDIENTE |
| REQ-426 | (tabla vieja) | — | PENDIENTE |
| REQ-427 | (tabla vieja) | — | PENDIENTE (gate G-T2) |
| REQ-429 | (tabla vieja) | — | PENDIENTE |
| REQ-430 | (tabla vieja) | — | PENDIENTE |
| REQ-431 | (tabla vieja) | — | PENDIENTE |
| REQ-432 | (tabla vieja) | — | PENDIENTE (metas: gate G-T3) |
| REQ-433 | (tabla vieja) | — | PENDIENTE |
| REQ-230 | (tabla vieja) | — | PENDIENTE (es firmado; en, pt, de, fr, it por firmar) |
| REQ-619 | (tabla vieja) | — | PENDIENTE |
| REQ-621 | (tabla vieja) | — | PENDIENTE |
| REQ-622 | (tabla vieja) | — | PENDIENTE |
| REQ-623 | (tabla vieja) | — | PENDIENTE |
| REQ-960 | (tabla vieja) | — | PENDIENTE |
| REQ-1535 | (tabla vieja) | — | PENDIENTE |
| REQ-1638 | (tabla vieja) | — | PENDIENTE |
| REQ-1537 | (tabla vieja) | — | PENDIENTE |
| REQ-1538 | (tabla vieja) | — | PENDIENTE |
| REQ-1539 | (tabla vieja) | — | PENDIENTE |
| REQ-1639 | (tabla vieja) | — | PENDIENTE |
| REQ-1640 | (tabla vieja) | — | PENDIENTE |
| REQ-1641 | (tabla vieja) | — | PENDIENTE |
| REQ-1642 | (tabla vieja) | — | PENDIENTE |
| REQ-1643 | (tabla vieja) | — | PENDIENTE |
| REQ-1644 | (tabla vieja) | — | PENDIENTE |
| REQ-1645 | (tabla vieja) | — | PENDIENTE |
| REQ-1646 | (tabla vieja) | — | PENDIENTE |
| REQ-1673 | (tabla vieja) | — | PENDIENTE |
| REQ-1648 | (tabla vieja) | — | PENDIENTE |
| REQ-1651 | (tabla vieja) | — | PENDIENTE |
| REQ-1652 | (tabla vieja) | — | PENDIENTE |
| REQ-1317 | DATOS | — | PENDIENTE |
| REQ-1338 | CÓDIGO | — | PENDIENTE |
| REQ-1371 | CÓDIGO | — | PENDIENTE |
| REQ-1548 | (tabla vieja) | — | PENDIENTE |
| REQ-1634 | (tabla vieja) | — | PENDIENTE (gate C1: plan y gates propios antes de código; viene de INC-009) |
| REQ-3338 | CÓDIGO | — | PENDIENTE |
| REQ-1603 | CÓDIGO | — | PENDIENTE |
| REQ-10641 | CÓDIGO | — | PENDIENTE |
| REQ-10642 | CÓDIGO | — | PENDIENTE |
| REQ-10643 | CÓDIGO | — | PENDIENTE |
| REQ-10665 | CÓDIGO | — | PENDIENTE |
| REQ-10681 | CÓDIGO | — | PENDIENTE |
| REQ-10754 | DATOS | — | PENDIENTE (medición hecha; fuente de respaldo por proponer en el PR) |

## Falta publicar (PR, humo o merge) (40)

| Folio | Tipo | Depende de | Estado |
|---|---|---|---|
| REQ-006 | (tabla vieja) | — | CUMPLIDO en código (4 pruebas verdes, `cross-sell-copy.test.ts`, `match.test.ts`; `TRANSPORT_ENABLED="true"`). Pendiente: humo visual 390/1366 de la ventana en producción, sin evidencia en el repo; se registra cuando una |
| REQ-007 | (tabla vieja) | — | CUMPLIDO en código (3 pruebas verdes, `cross-sell.test.ts`, `match.test.ts`; franja en `TripDetailView.tsx:189`). Pendiente: humo visual 390/1366 de la franja en producción, sin evidencia en el repo (17-11-2026 (construc |
| REQ-093 | (tabla vieja) | — | PENDIENTE → **REEMPLAZADO** por REQ-400 (menú con «Experiencias»; la etiqueta la implementa REQ-174, PR #141) (6-11-2026, plan de taxonomía; el código actual sigue vigente hasta que el nuevo esté CUMPLIDO) |
| REQ-158 | (tabla vieja) | — | EN CURSO (PR #127) |
| REQ-221 | (tabla vieja) | — | CUMPLIDO (unitarias); verificación en logs de producción PENDIENTE tras el merge |
| REQ-610 | (tabla vieja) | — | CUMPLIDO (#217 publicado; deploy 42342111245 con humo en producción en verde; falta el cobro real de $10 MXN del PO) |
| REQ-613 | (tabla vieja) | — | BLOQUEADO (aviso de privacidad sin aprobar ni publicar) |
| REQ-616 | (tabla vieja) | — | EN CURSO (encendida en su PR; CUMPLIDO tras el humo en producción) |
| REQ-618 | (tabla vieja) | — | EN CURSO (encendida en su PR; CUMPLIDO tras el humo en producción) |
| REQ-774 | (tabla vieja) | — | EN CURSO (src/ingest/lib/flags.test.ts; falta publicar y revisar el primer sync) |
| REQ-1247 | (tabla vieja) | — | EN CURSO (test verde; falta la corrida tras el merge) |
| REQ-1257 | (tabla vieja) | — | EN CURSO (test verde; falta humo del PR) |
| REQ-1291 | (tabla vieja) | — | EN CURSO (14 nov 2026: código en main desde el PR #385 (12 nov) y publicado tras PROVEEDORES_MILA_ON apagada; 92 tests de src/proveedores y `npm run build` verdes en esta sesión; falta encender la bandera, REQ-1655) |
| REQ-1293 | (tabla vieja) | — | EN CURSO (14 nov 2026: código en main desde el PR #385 (12 nov) y publicado tras PROVEEDORES_MILA_ON apagada; 92 tests de src/proveedores y `npm run build` verdes en esta sesión; falta encender la bandera, REQ-1655) |
| REQ-1295 | (tabla vieja) | — | EN CURSO (14 nov 2026: código en main desde el PR #385 (12 nov) y publicado tras PROVEEDORES_MILA_ON apagada; 92 tests de src/proveedores y `npm run build` verdes en esta sesión; falta encender la bandera, REQ-1655) |
| REQ-1296 | (tabla vieja) | — | EN CURSO (14 nov 2026: código en main desde el PR #385 (12 nov) y publicado tras PROVEEDORES_MILA_ON apagada; 92 tests de src/proveedores y `npm run build` verdes en esta sesión; falta encender la bandera, REQ-1655) |
| REQ-1297 | (tabla vieja) | — | EN CURSO (14 nov 2026: código en main desde el PR #385 (12 nov) y publicado tras PROVEEDORES_MILA_ON apagada; 92 tests de src/proveedores y `npm run build` verdes en esta sesión; falta encender la bandera, REQ-1655) |
| REQ-1298 | (tabla vieja) | — | EN CURSO (14 nov 2026: código en main desde el PR #385 (12 nov) y publicado tras PROVEEDORES_MILA_ON apagada; 92 tests de src/proveedores y `npm run build` verdes en esta sesión; falta encender la bandera, REQ-1655) |
| REQ-1299 | (tabla vieja) | — | EN CURSO (14 nov 2026: código en main desde el PR #385 (12 nov) y publicado tras PROVEEDORES_MILA_ON apagada; 92 tests de src/proveedores y `npm run build` verdes en esta sesión; falta encender la bandera, REQ-1655) |
| REQ-1266 | (tabla vieja) | — | EN CURSO (test verde; falta humo del PR) |
| REQ-1348 | CÓDIGO | — | CUMPLIDO en código (#279 en main; test de contrato y sinónimos verde). Pendiente: humo del deploy no registrado en el repo (17-11-2026 (constructora, REQ-10742)) |
| REQ-1349 | CÓDIGO | — | EN MAIN (#277, test verde; deploy y humo NO VERIFICADOS) |
| REQ-1359 | CÓDIGO | — | CUMPLIDO en código (deploy 42428767660 verde). Pendiente: medición en frío con humo de producción, sin evidencia en el repo (17-11-2026 (constructora, REQ-10742)) |
| REQ-1615 | CÓDIGO | — | EN CURSO (tests verdes; falta humo y merge) |
| REQ-3316 | CÓDIGO | — | EN CURSO (PR abierto; el merge es del PO) |
| REQ-1623 | DEFINICIÓN | — | EN CURSO (migración escrita y probada, consultas actualizadas, suite verde; falta merge y luego el OK para aplicarla) |
| REQ-3380 | CÓDIGO | — | EN CURSO (PR abierto; el merge es del PO) |
| REQ-3381 | CÓDIGO | — | EN CURSO (PR abierto; el merge es del PO) |
| REQ-3367 | CÓDIGO | — | CUMPLIDO (21 pruebas verdes en `src/tangol/lib/cities.test.ts`; falta merge, que es del PO) |
| REQ-3368 | CÓDIGO | — | CUMPLIDO (pruebas verdes en `src/tangol/lib/cities.test.ts`; falta merge) |
| REQ-3416 | CÓDIGO | — | SIN VERIFICAR (el código está en main, `src/app/api/cron/bigbus-sync/route.ts`, pero no hay ninguna prueba que cite el folio; incumple el punto 2 del protocolo. Se verifica con la bandera encendida en preview, REQ-3424)  |
| REQ-3499 | CÓDIGO | — | EN CURSO (prueba roja sin el arreglo y verde con él; falta merge) |
| REQ-3511 | CÓDIGO | — | CUMPLIDO (PR #504, b1dbb494, y el reintento por tanda del PR #506, 09ed1b64, fusionados en main el 13 nov 2026. Falta volver a correr «Limpieza de taxonomía (INC-015)» con la casilla «Borrar en producción» marcada: la co |
| REQ-3526 | CÓDIGO | — | EN CURSO (tests verdes; PR abierto, falta humo y merge del PO) |
| REQ-10518 | CÓDIGO | — | EN CURSO (prueba en verde; PR #537) |
| REQ-10647 | CÓDIGO | — | CUMPLIDO (prueba en verde y humo contra producción el 14 nov 2026; falta el merge) |
| REQ-10651 | CÓDIGO | — | CUMPLIDO en código (pruebas en verde el 14 nov 2026; la casilla Proveedor se corrigió tras INC-022). Pendiente: humo visual de la corrección en producción, sin evidencia en el repo (17-11-2026 (constructora, REQ-10742)) |
| REQ-10655 | CÓDIGO | — | CUMPLIDO en código (8 pruebas en verde, `cancellation.test.ts`; Condiciones verificado en producción). Pendiente: humo visual del resumen junto al título tras INC-023 en producción (17-11-2026 (constructora, REQ-10742)) |
| REQ-10745 | CÓDIGO | — | CUMPLIDO en código (prueba roja → verde, 2 pruebas `REQ-10745` + 5 de REQ-10741 y `workflows-build.test.ts`). Pendiente: humo en la siguiente corrida real del workflow `geo-coordenadas-ciudad.yml` (17-11-2026 (constructo |
| REQ-10746 | CÓDIGO | — | CUMPLIDO (17-11-2026): `src/ops/lib/migracion-una.test.ts` 5/5, `src/ops/migracion-una-workflow.test.ts` 4/4; corridas reales en producción con la 0033 (run 44016153517) y la 0034 (run 44025171251), ambas con humo verde  |

## Pieza sin construir o en borrador (22)

| Folio | Tipo | Depende de | Estado |
|---|---|---|---|
| REQ-620 | (tabla vieja) | — | BLOQUEADO: depende de REQ-625 (va después); sin cambio (17-11-2026 (constructora, REQ-10742)) |
| REQ-1075 | (tabla vieja) | — | CUMPLIDO en código. Pendiente: la primera corrida real del workflow `redes-diario.yml` lanzado por `blog-diario.yml`, que depende de REQ-3494 (preview de los agentes diarios) (17-11-2026 (constructora, REQ-10742)) |
| REQ-1565 | (tabla vieja) | — | EN CURSO (código y 4 tests verdes; el aviso en el resumen depende de la mejora 4) |
| REQ-1664 | (tabla vieja) | — | EN CURSO (corrida del 12 nov 2026 12:40: main mezclado sin conflictos; `vitest -t "REQ-"` 408 archivos y 2718 tests verdes; REQ-1668 hecho; REQ-1663 sigue sin plan firmado) |
| REQ-1395 | TAREA-PO | — | PENDIENTE (borrador nuevo sin enviar r6097433612910371205 a sales4@jordanexperience.com, 12 nov 2026 15:25 UTC; sin respuesta nueva de Jordan; Corrida 12 nov 2026 18:54 UTC) |
| REQ-1396 | TAREA-PO | — | PENDIENTE (borrador vigente sin enviar r4094618039243592710 a angela@multitraveltours.org, 12 nov 2026 15:25 UTC; Corrida 12 nov 2026 18:54 UTC) |
| REQ-1397 | CÓDIGO | — | EN CURSO (última corrida: Corrida 13 nov 2026 13:16 UTC: Gmail no conectó en la sesión, no se revisaron correos; producción y rama de portada revisadas. Corrida 13 nov 2026 06:54 UTC: sin correos nuevos de proveedores de |
| REQ-1407 | VALIDACIÓN | — | PENDIENTE (borrador sin enviar r9009198869260567051 a angela@mondialtrails.com, 12 nov 2026 15:25 UTC; Corrida 12 nov 2026 18:54 UTC) |
| REQ-1583 | DATOS | — | EN CURSO (12 nov 2026: cuerpos corregidos en docs/proveedores/borradores-presentacion-2026-11-12.md; falta el asunto real de cada hilo, que necesita Gmail) |
| REQ-1560 | (tabla vieja) | — | NO CUMPLIDO (prod 12-11 tras caché del Worker, mediana 3 corridas móvil: / 3.37 s, /tours 4.16 s, ficha 2.90 s. Ya no lo frena el servidor: retraso en descubrir la imagen LCP 1.3–1.5 s y JS del chunk 1255) |
| REQ-1562 | (tabla vieja) | — | NO CUMPLIDO (prod 12-11, mediana TBT móvil: 152 / 535 / 511 ms) |
| REQ-1563 | (tabla vieja) | — | NO CUMPLIDO (prod 12-11: móvil CUMPLE 1.46 / 1.03 / 0.83 MB; escritorio / 1.52 MB y /tours 3.05 MB no) |
| REQ-3494 | CÓDIGO | — | SIN VERIFICAR: cambia `.github/workflows/guias-ciudad.yml` y `blog-diario.yml` sin ninguna prueba que cite el folio (punto 2 del protocolo); sin construir la prueba `it('REQ-3494')` sobre `workflows-build.test.ts`; revis |
| REQ-3507 | VALIDACIÓN | — | EN CURSO (configuración y prueba en verde; humo con datos de Tangol y capturas NO CUMPLIDO: aún no hay tours de Tangol) |
| REQ-10685 | TAREA-PO | — | PENDIENTE (borrador sin armar) |
| REQ-10698 | DEFINICIÓN | — | CUMPLIDO (definición, respuesta literal citada); código PENDIENTE |
| REQ-10714 | BANDERA | — | PENDIENTE (apagada; se prueba en `borradores.test.ts`) |
| REQ-10715 | TAREA | — | EN CURSO (borrador vigente creado el 15-11-2026; sin enviar) |
| REQ-10719 | TAREA | — | EN CURSO (Word entregado y adjunto al borrador vigente; sin enviar) |
| REQ-10720 | TAREA | — | EN CURSO (borrador actualizado; sin enviar) |
| REQ-10721 | TAREA | — | EN CURSO (pedido en el borrador vigente; sin enviar) |
| REQ-10723 | TAREA | — | EN CURSO (borrador y acuerdo listos; sin enviar; carga en cola) |

## Tarea a mano del PO (17)

| Folio | Tipo | Depende de | Estado |
|---|---|---|---|
| REQ-1322 | TAREA-PO | — | EN CURSO |
| REQ-1323 | TAREA-PO | — | PENDIENTE |
| REQ-1324 | TAREA-PO | — | PENDIENTE (PO 11-11: faltan «tour de otros proveedores y propios con nuestro Stripe»; pasos en docs/runbook/prueba-cobro-stripe-proveedores.md) |
| REQ-1325 | TAREA-PO | — | PENDIENTE |
| REQ-1326 | TAREA-PO | — | PENDIENTE |
| REQ-1327 | TAREA-PO | — | PENDIENTE |
| REQ-1364 | TAREA-PO | — | EN CURSO (Beibei respondió el 12 nov 2026 04:51 UTC: «Tiene razón, debería ser No.18 de la Página 122»; Gran Lujo: «SÍ, es lo mismo». El acuerdo está «bajo la revisión del Sr. Zhou Fan, director de nuestra empresa, por f |
| REQ-1365 | TAREA-PO | — | EN CURSO (claulet@ a Destino Colombia, 11 nov 2026 23:55 UTC, con el acuerdo para revisión: pide marcar lo que cambió de los T&C de 2023 y la cancelación de hoteles por plan PC-016 a PC-030. Sin respuesta; Corrida 12 nov |
| REQ-1366 | TAREA-PO | — | EN CURSO (claulet@ a Rositsa, 11 nov 2026 23:54 UTC, con el acuerdo ES/EN para revisión: pide cancelación y cambio de fecha por producto y permiso escrito de fotos y logo en la web. Sin respuesta; el ticket #742920 quedó |
| REQ-1369 | TAREA-PO | — | PENDIENTE |
| REQ-1370 | TAREA-PO | — | PENDIENTE |
| REQ-1393 | TAREA-PO | — | PENDIENTE |
| REQ-1394 | TAREA-PO | — | PENDIENTE |
| REQ-1536 | TAREA-PO | — | PENDIENTE |
| REQ-1408 | TAREA-PO | — | PENDIENTE |
| REQ-1409 | TAREA-PO | — | PENDIENTE |
| REQ-1584 | TAREA-PO | — | PENDIENTE |

## Tercero (proveedor u otra empresa) (11)

| Folio | Tipo | Depende de | Estado |
|---|---|---|---|
| REQ-1569 | (tabla vieja) | — | BLOQUEADO: plantilla de Meta (candado: la envía a aprobación el PO); depende de REQ-1663 encendido para que el resumen tenga canal; sin redactar (17-11-2026 (constructora, REQ-10742)) |
| REQ-1663 | (tabla vieja) | — | EN CURSO (13 nov 2026: zoefel-mila REQ-035, PR #207 borrador: ruta POST /api/avisos con Bearer, Zod con el contrato de `deps.ts`, lista permitida (403 a otro número) y envío desde el número de la ficha de Travel Puzzle,  |
| REQ-1363 | TAREA-PO | — | EN CURSO (pedido por escrito: adrianrodvar@ a Angela Ballén, 11 nov 2026 17:06 UTC, con el acuerdo para revisión. Acuse de Angela, 12 nov 2026 01:17 UTC: «De inmediato comparto el documento con mis jefes y quedo atenta d |
| REQ-1375 | DEFINICIÓN | — | PENDIENTE (preguntado en el correo del 11 nov 2026 17:06 UTC, punto 2; Angela acusó recibo el 12 nov 01:17 UTC y lo pasó a sus jefes; el 12 nov 16:31 UTC propuso reunión virtual el 18 nov 10:00 (Mex) en lugar de responde |
| REQ-1376 | DEFINICIÓN | — | PENDIENTE (preguntado en el correo del 11 nov 2026 17:06 UTC, punto 3; Angela acusó recibo el 12 nov 01:17 UTC y lo pasó a sus jefes; el 12 nov 16:31 UTC propuso reunión virtual el 18 nov 10:00 (Mex) en lugar de responde |
| REQ-1377 | DEFINICIÓN | — | PENDIENTE (preguntado en el correo del 11 nov 2026 17:06 UTC, puntos 4 y 5; Angela acusó recibo el 12 nov 01:17 UTC y lo pasó a sus jefes; el 12 nov 16:31 UTC propuso reunión virtual el 18 nov 10:00 (Mex) en lugar de res |
| REQ-1378 | DATOS | — | PENDIENTE (preguntado en el correo del 11 nov 2026 17:06 UTC, punto 6; Angela acusó recibo el 12 nov 01:17 UTC y lo pasó a sus jefes; el 12 nov 16:31 UTC propuso reunión virtual el 18 nov 10:00 (Mex) en lugar de responde |
| REQ-1398 | TAREA-PO | — | PENDIENTE (vence el 17 nov 2026; Corrida 13 nov 2026 13:16 UTC: faltan 4 días; sin evidencia nueva (Gmail no conectó en esta corrida, no se pudo revisar el hilo). Corrida 13 nov 2026 06:54 UTC: faltan 4 días, sigue sin r |
| REQ-1399 | VALIDACIÓN | — | EN CURSO (enviado: claulet@ a a.alves@ e intlsales@, 11 nov 2026 23:56 UTC, con el texto reescrito: fotos de 20 productos, idioma de 46, cancelación 48/72 h frente a la política del 16 oct y llamada el 17 o 18 nov; adjun |
| REQ-1406 | TAREA-PO | — | PENDIENTE (borrador sin enviar r-1099995071414724985 a roberto@canadianreceptivetours.com, 12 nov 2026 15:25 UTC; sin respuesta de Canadian ni de Kyoto; Corrida 12 nov 2026 18:54 UTC) |
| REQ-10728 | DEFINICIÓN | — | APROBADO (definición); construcción EN CURSO (16-11-2026: regla pura `src/taxonomy/lib/incluido-cantidad.ts` con su prueba y lista por proveedor en `docs/taxonomia/etiquetas-incluido-2026-11-16/README.md`; publicadas en  |

## Carga de datos o migración (9)

| Folio | Tipo | Depende de | Estado |
|---|---|---|---|
| REQ-048 | (tabla vieja) | — | EN CURSO (falta migración y encender con OK) |
| REQ-049 | (tabla vieja) | — | EN CURSO (migración 0012 y sync tras DEPARTURES_SYNC_ENABLED) |
| REQ-087 | (tabla vieja) | — | CUMPLIDO en código (8 pruebas verdes, `assign-slugs.test.ts`, `dry-run.test.ts`). Pendiente: medición en D1 (solo lectura) de cuántas ciudades homónimas viven hoy con sufijo; es carga de datos, no código (17-11-2026 (con |
| REQ-366 | (tabla vieja) | — | CUMPLIDO (migración pendiente de OK) |
| REQ-418 | (tabla vieja) | — | EN CURSO (17-11-2026, constructora: 2 pruebas verdes en `attributes.test.ts`; FALTA: la bandera `TAXONOMY_ATTRS_EXTRA_ENABLED` no existe en `wrangler.jsonc`, el gate es `DEFAULT_GATES.atributosExtra = false` fijo en `src |
| REQ-1354 | CÓDIGO | — | SIN VERIFICAR: es carga de datos, no código: medir en D1 (solo lectura) los viajes de Inca World contra los 76 importados y explicar la diferencia (1 viaje); ningún test puede cerrarlo (17-11-2026 (constructora, REQ-1074 |
| REQ-1361 | CÓDIGO | — | PENDIENTE (verificado con curl, Corrida 12 nov 2026 12:55 UTC: /tours muestra «8,343 experiencias disponibles» y el inicio trae 8,343 en sus datos; /nosotros trae 8,127. Las dos cifras subieron desde la corrida de 06:54  |
| REQ-1388 | CÓDIGO | — | EN CURSO (datos sin periodos) |
| REQ-1665 | CÓDIGO | — | EN CURSO (11 nov 2026: código y tests verdes en feat/proveedores-mila; falta migración y bandera) |

## Secreto o variable por cargar (9)

| Folio | Tipo | Depende de | Estado |
|---|---|---|---|
| REQ-1077 | (tabla vieja) | — | CUMPLIDO (sin probar contra Meta: faltan tokens) |
| REQ-1078 | (tabla vieja) | — | CUMPLIDO (sin probar contra Meta: faltan tokens) |
| REQ-1079 | (tabla vieja) | — | CUMPLIDO (sin probar contra LinkedIn: falta token) |
| REQ-1658 | (tabla vieja) | — | EN CURSO (14 nov 2026: CPANEL_HOST, CPANEL_USER y CPANEL_TOKEN cargados en Cloudflare; token `mila-docs` perdido y revocado, sustituido por `mila-docs-2` que pasó por chat: rotarlo cuando el canal esté estable. Falta la  |
| REQ-3313 | VALIDACIÓN | — | EN CURSO (enviado; sin respuesta; confirmar si el adjunto era intencional y rotar la credencial citada) |
| REQ-3430 | CÓDIGO | — | EN CURSO (12 nov 2026: código y 15 tests REQ-3430 verdes en `src/proveedores/lib/consulta.test.ts`, `src/proveedores/contacto.test.ts` y `proveedores-io.test.ts`; suite 3155 verde, tsc y build verdes; falta aplicar la mi |
| REQ-3330 | TAREA-PO | — | EN CURSO (12-11, 05:53: «ya tego las llaves deprueba»; 06:26: «listo», guardada en GitHub como BIGBUS_OCTO_TEST_KEY y probada en REQ-3438; falta el secreto de Cloudflare para la preview, REQ-3424) |
| REQ-3320 | CÓDIGO | — | PENDIENTE: el token ya existe como secreto de Actions `CLOUDFLARE_PURGE_TOKEN`; sin construir el paso de purga de `deploy-cloudflare.yml` (todo al publicar) y la purga de las URL del viaje al guardar en el gestor; es cód |
| REQ-10731 | BANDERA | — | EN CURSO (16-11-2026 18:02 CDMX: el PO pidió cargar el secreto desde el chat, «hazlo tu», y dio los cinco destinatarios; `AVISO_PO_EMAIL` cargado en los secretos de Actions y `RESEND_API_KEY` ya existía; bandera encendid |

## Abogado (8)

| Folio | Tipo | Depende de | Estado |
|---|---|---|---|
| REQ-041 | (tabla vieja) | — | CUMPLIDO (pendiente validación del abogado) |
| REQ-084 | (tabla vieja) | — | EN CURSO (17-11-2026, constructora: código y 9 pruebas verdes en `src/legal/lib/cookies.test.ts` y `marketing-consent.test.ts`; FALTA: la revisión del abogado (REQ-1323) para encender `COOKIES_POLICY_ENABLED` y `MARKETIN |
| REQ-1367 | CÓDIGO | — | PENDIENTE (el correo a Extime del 11 nov 23:56 UTC cita la política del 16 oct: 24, 72 y 96 h y 21 días; el borrador legal sigue sin corregir; Corrida 12 nov 2026 00:54 UTC) |
| REQ-1572 | DEFINICIÓN | — | EN CURSO (ENVIADO: el PO confirmó en el chat el 12 nov 2026 «tambien se envio tangol». Evidencia: adrianrodvar@ a Hernán Garriga, cc agencias2@, 11 nov 2026 23:52 UTC, con el acuerdo con control de cambios y 5 preguntas: |
| REQ-1635 | CÓDIGO | — | EN CURSO (PR abierto; validar con abogado; el merge es del PO) |
| REQ-1636 | CÓDIGO | — | EN CURSO (PR abierto; validar con abogado) |
| REQ-1637 | CÓDIGO | — | EN CURSO (PR abierto; validar con abogado) |
| REQ-10646 | DEFINICIÓN | — | PENDIENTE (falta la definición del PO y la revisión del abogado) |

## Ola posterior del plan (4)

| Folio | Tipo | Depende de | Estado |
|---|---|---|---|
| REQ-075 | (tabla vieja) | — | PENDIENTE (updatedSince solo existe en /events; /tours sigue completo. Ver STATUS.md, Ola 1) |
| REQ-111 | (tabla vieja) | — | EN CURSO (funciones y metas firmadas listas; faltan los valores de producción: dependen del log de corridas de la Ola 1 y de los slugs de la Ola 3) |
| REQ-416 | (tabla vieja) | — | EN CURSO (17-11-2026, constructora: es/en desde el diccionario con 13 pruebas verdes en `tour-card-guia.test.ts`, `page-model.test.ts` y `copy.test.ts`; FALTA: el diccionario en pt, de, fr e it (`src/taxonomy/data/i18n/` |
| REQ-10752 | CÓDIGO | — | PENDIENTE (siguiente PR de la ola 5) |

## Bandera apagada sin motivo escrito (1)

| Folio | Tipo | Depende de | Estado |
|---|---|---|---|
| REQ-1315 | BANDERA | — | BLOQUEADO (a propósito) |
