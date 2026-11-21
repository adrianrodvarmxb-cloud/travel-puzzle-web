# Plan do-plan — Integración BeMyGuest (punto 22)

Fecha: 6 nov 2026 · Estado: **BORRADOR para firma del PO** · Sin código de producto en este PR.
Estándar: skill `sitio-destinos-multiproveedor` (ProviderAdapter api/deeplink, carrito multiproveedor) + `CLAUDE.md` (blindaje de publicación).

Regla fija de este documento: aquí **no** van precios netos, márgenes, llaves ni datos de la cuenta. El margen vive en la base (gestor) o en una variable del Worker, nunca en el repo.

---

## 0. Dónde estamos con BeMyGuest (hilo del 4–6 nov 2026)

| Fecha | Quién | Qué |
|---|---|---|
| 4 nov | Claudia → distribution@ | Pide llave demo nueva, llave de producción, Slack, IP allowlist, moneda de cobro y dar de baja la llave de 2024. El contacto anterior (Daniel Khor) ya no existe (rebote). |
| 6 nov, 04:17 UTC | YoonYoung Choi (Director BD) | La llave demo **venció**. Pide datos del negocio (tráfico, conversión, volumen, mercados). La recarga del wallet sigue igual. **La API tiene un proceso de evaluación con meta mensual de ventas y un API Access Fee**; recomiendan empezar con el portal B2B y ver ventas unos meses. |
| 6 nov, 00:49 CDMX | Claudia → YoonYoung | Responde y propone un **piloto de 90 días**: vender ya por el portal B2B y, en paralelo, llave demo + Slack para terminar y certificar la integración; a los 90 días revisar resultados y hablar de producción y del fee. Pide la meta mensual y el monto del fee. |

**Consecuencia para el plan:** no hay llave (ni demo ni producción) y la API tiene un costo y una meta que aún no conocemos. Por eso el plan va en dos carriles:
- **Carril B2B (sin API, se puede hacer ya):** selección curada cargada en el gestor de viajes, en modo solicitud; el equipo compra en el portal B2B y cobra con el enlace de pago de Stripe ola 1.
- **Carril API (condicionado a la llave):** adaptador `api` en el carrito con cobro propio por Stripe y reserva en BeMyGuest después del pago.

Nada del carril API se publica sin la llave demo, pruebas en verde y el OK del PO sobre el fee.

> Coherencia con lo que se le dijo a BeMyGuest: el correo del 6 nov dice que la primera etapa del conector (autenticación, precios y mapeo de catálogo) está construida y probada contra respuestas documentadas. Es cierto **solo en la rama `feat/bemyguest-ola1`** (sin PR, sin merge). Ver §1.

---

## 1. Auditoría de lo que existe en el repo (6 nov 2026, `origin/main` 808585c)

| Pieza | Dónde | Estado | Qué aprovecha BeMyGuest |
|---|---|---|---|
| CartItem genérico + Zod | `src/cart/lib/item.ts` (REQ-104) | En main, tests verdes | Tipos `tour`, `day_trip`, `tickets`; moneda ISO 4217; `cancellationPolicy`; `chargedBy`; `externalRef`; `payment` con vencimiento. **No hay que tocarlo.** |
| Interfaz ProviderAdapter | `src/cart/lib/adapter.ts` (REQ-104) | En main | 5 operaciones: `search`, `availability`, `reserve`, `cancel`, `charge`; modos `api`/`deeplink`/`request`. BeMyGuest = un adaptador nuevo (OCP). |
| Interruptor automático | `src/cart/lib/switch.ts` (REQ-105) | En main | api con inventario → «Reservar»; si el adaptador falla → WhatsApp. BeMyGuest entra sin cambios. |
| Cobro dividido por proveedor | `src/cart/lib/split.ts` (REQ-107) | En main, tras `CART_PAYMENTS_ENABLED=false` | Una parte de pago por proveedor, `paymentUrl` renovable, cancelación por pieza. |
| Adaptadores existentes | `src/cart/adapters/` — `freetour` (api), `kiwitaxi` (deeplink, marca blanca), `request` (REQ-121), `deeplink`, `whatsapp` | En main | `request` sirve para el carril B2B; `freetour` es el modelo del adaptador api. |
| Registro de complementos | `src/companions/registry.json`, `src/cart/adapters/index.ts` (REQ-121) | En main | Un proveedor con adaptador existente es solo un dato; BeMyGuest api necesita una rama nueva en `buildRegistryAdapters`. |
| Carrusel y reglas por destino | `src/companions/lib/*` (REQ-108…110, 180…184) | En main, tras `ARMA_TU_VIAJE_ENABLED=false` | Tickets y tours de día en Asia como tarjetas del carrusel. |
| Stripe ola 1 | `src/payments/` (REQ-159, REQ-115…119) | En main, tras `STRIPE_ENABLED=false`; **migración 0013 sin aplicar** (candado) | Checkout solo tarjeta, cobro en MXN = monto × FIX Banxico × (1 + colchón), enlace de 24 h, webhook firmado e idempotente, tabla `Payment`. `docs/gates-stripe-2026-11.md` (gate A) dejó **BeMyGuest para la ola 2**. |
| Gestor de viajes | `src/trips/` (`/admin/viajes`, migraciones 0006–0008) | En producción | Borradores en estado `quote`, opciones y precios, fotos en R2, traducción, checklist de 5 fotos. Es donde cae la selección curada. |
| Conector BeMyGuest (ola 1) | Rama `origin/feat/bemyguest-ola1` (9f4580e, 4 nov 2026), **sin PR** | 13 archivos, solo `lib/` puro + fixtures sintéticos | `lib/auth.ts` (token client_credentials de 15 min, sin refresh), `lib/price.ts` (neto × (1 + margen), nunca abajo del `minimumSellingPrice`), `lib/catalog-map.ts` (producto → borrador del gestor), `schemas/api.ts` (Zod). Cita **REQ-021…024, que no están registrados** en `docs/requisitos.md`. |
| Banderas | `wrangler.jsonc` | — | No existe ninguna bandera de BeMyGuest. Existentes que aplican: `STRIPE_ENABLED=false`, `CART_PAYMENTS_ENABLED=false`, `ARMA_TU_VIAJE_ENABLED=false`, `OWN_TOURS_ENABLED`. |
| Autorizaciones | `docs/bemyguest/` | **No existe** | La skill pide `docs/{proveedor}/autorizaciones.md`. |

Huecos encontrados:
1. REQ-021…024 se usan en la rama pero no están en la matriz (trazabilidad ISO 29148 rota).
2. No hay cliente con I/O, ni sync, ni adaptador del carrito, ni bandera.
3. El cobro del carrito (`charge`) hoy solo sabe del `paymentUrl` de FREETOUR; para BeMyGuest el cobro es **nuestro** (Stripe), no del proveedor.
4. Stripe ola 1 depende de la migración 0013 (candado) y del webhook (candado: secretos).

---

## 2. Requisitos propuestos (se registran en `docs/requisitos.md` al firmar)

Numeración: REQ-021…024 se conservan (ya los usa la rama y nadie más los ocupa). Los nuevos empiezan en REQ-231 porque otras ramas abiertas ya usan hasta REQ-220.

| ID | Requisito (Dado / Cuando / Entonces) | Ola |
|---|---|---|
| REQ-021 | Dado un token vencido o a <60 s de vencer, cuando se llama a BeMyGuest, entonces se pide uno nuevo con `client_credentials`; nunca se usa `refresh_token`. (ya en la rama) | 1 |
| REQ-022 | Dado un producto con neto y mínimo de venta, cuando se calcula el precio, entonces precio = ⌈neto × (1 + margen)⌉ y nunca abajo del mínimo de venta ni del neto; el margen llega por parámetro. (ya en la rama) | 1 |
| REQ-023 | Dado un producto seleccionado, cuando se importa, entonces queda como borrador `quote` del gestor, con textos y fotos por revisar. (ya en la rama) | 1 |
| REQ-024 | Dada una respuesta de BeMyGuest, cuando no cumple el esquema, entonces el registro se descarta y se registra; no tumba la página. (ya en la rama) | 1 |
| REQ-231 | Dado `BEMYGUEST_ENABLED` distinto de "true", cuando se abre cualquier página o el carrito, entonces no aparece ningún producto de BeMyGuest y sus rutas de admin responden 404. | 1 |
| REQ-232 | Dada la lista curada (UUIDs elegidos por el equipo), cuando corre el sync, entonces solo se leen esos productos; un producto fuera de la lista nunca se publica. | 2 |
| REQ-233 | Barrera de cordura del sync curado: error, 429 o caída >20 % de la lista → no se escribe y se sirve el último snapshot bueno; 429 respeta `Retry-After`. | 2 |
| REQ-234 | Dado un producto curado, cuando se publica, entonces tiene ciudad válida (ISO + geonameid), ≥5 fotos, textos propios en español y «Operado por {proveedor local} · vendido por Travel Puzzle». | 2 |
| REQ-235 | Dado un producto en el carrito, cuando se va a cobrar, entonces precio y lugares se consultan en vivo (nunca desde caché) y se muestra en la moneda de cobro con MXN aproximado. | 3 |
| REQ-236 | Dado el adaptador `bemyguest` (api), cuando se cobra, entonces `charge` crea un Checkout de Stripe propio por la parte de BeMyGuest (sin tocar las demás partes). | 3 |
| REQ-237 | Dado un pago confirmado por webhook, cuando se reserva en BeMyGuest, entonces la reserva se crea una sola vez (idempotente por pieza); si BeMyGuest rechaza, la pieza pasa a `failed`, se reembolsa automáticamente y se avisa al cliente y al equipo. | 3 |
| REQ-238 | Dada una pieza confirmada, cuando el cliente cancela, entonces se aplica la política de BeMyGuest de esa fecha, se cancela solo esa pieza y el reembolso es el que la política permita. | 3 |
| REQ-239 | El cliente recibe solo correos de Travel Puzzle (confirmación con voucher, recordatorio, cancelación); se valida en cada release que BeMyGuest no le escribe. | 3 |
| REQ-240 | Alerta al equipo si el saldo del wallet baja del umbral configurado o si una reserva falla por saldo. | 3 |
| REQ-241 | Carril B2B: dado un producto curado sin API, cuando el cliente lo pide, entonces entra como solicitud (`request`) y se cobra con el enlace de pago de Stripe ola 1 tras confirmar lugar en el portal. | 0 |

---

## 3. ProviderAdapter `api` de BeMyGuest (diseño)

```
id: "bemyguest" · mode: "api" · types: ["tour", "day_trip", "tickets"]
chargedBy: "Travel Puzzle"   ← cobro propio (merchant of record)
search(q)        → productos curados de la ciudad (lectura de D1, no de la API)
availability(id) → GET en vivo de precio y lugares por fecha/horario (REQ-235)
reserve(item)    → solo después del pago; POST de reserva + confirmación (REQ-237)
cancel(item)     → cancelación con la política vigente (REQ-238)
charge(item)     → Checkout de Stripe propio, enlace que vence; renovable (REQ-236)
```

Flujo de una pieza: `in_cart` → (cliente paga en Stripe) → `pending_payment` → webhook pagado → `reserve()` en BeMyGuest → `confirmed` (con `externalRef` y voucher) o `failed` + reembolso.

- **Precio:** neto de BeMyGuest × (1 + margen), redondeado hacia arriba, nunca abajo del mínimo de venta (`lib/price.ts`). El margen lo pone el equipo en el gestor (o variable del Worker); nunca en el repo.
- **Moneda:** se muestra en la moneda que cobra BeMyGuest a Travel Puzzle (SGD o USD; pendiente de confirmar, ver decisión 4), con MXN aproximado. Stripe cobra en MXN con FIX Banxico + colchón (REQ-115) para no perder por tipo de cambio entre el cobro y el débito del wallet.
- **Marca blanca:** el cliente ve Travel Puzzle en la ficha, el carrito, el cobro y los correos. Se dice quién opera la actividad (texto, sin logos sobre fotos). El voucher de BeMyGuest se entrega dentro de nuestro correo; hay que confirmar con ellos que el voucher no muestre precios netos y que no escriban al cliente (va a `docs/bemyguest/autorizaciones.md`).

---

## 4. Catálogo con selección curada

1. El equipo elige productos en el portal (o con `GET /products` cuando haya llave) y guarda sus UUIDs en `/admin/bemyguest` (lista curada en D1).
2. El sync lee solo esa lista (REQ-232) con la barrera de cordura (REQ-233), escribe en staging y publica atómico.
3. Cada producto entra como borrador del gestor (REQ-023) y se publica solo con ciudad válida, 5 fotos y textos propios (REQ-234); si no cumple, queda en borrador.
4. Prioridad inicial (de la propuesta enviada a BeMyGuest): Singapur, Tailandia, Japón, Corea del Sur, Vietnam, Bali, Malasia, Hong Kong y Macao; después entradas a atracciones en Europa y Medio Oriente. Tope sugerido para el piloto: lo que el equipo pueda revisar con calidad (propuesta: 30–50 productos).
5. Producto que BeMyGuest da de baja: `missing` → `removed` tras 3 corridas buenas; `removed` responde 410 con enlace a su ciudad (mismo patrón que FREETOUR).

---

## 5. Estructura de carpetas

```
src/bemyguest/
  lib/                     ← puro, sin I/O, todo con tests
    auth.ts                  (REQ-021, en la rama)
    price.ts                 (REQ-022, en la rama)
    catalog-map.ts           (REQ-023, en la rama)
    selection.ts             (REQ-232: lista curada → qué leer, qué despublicar)
    sync-plan.ts             (REQ-233: barrera del 20 %, missing/removed)
    booking-plan.ts          (REQ-237: estado de la pieza y cuándo reservar/reembolsar)
    cancel-policy.ts         (REQ-238: política de BMG → CancellationPolicy del carrito)
    wallet.ts                (REQ-240: umbral de saldo)
  schemas/api.ts           (REQ-024, en la rama)
  fixtures/                (respuestas sintéticas de la documentación; sin datos de la cuenta)
  client.ts                ← I/O: fetch + caché del token; recibe fetch, reloj y llave por parámetro
  sync.ts                  ← I/O: sync curado (deps inyectadas: client, repo, log)
  booking.ts               ← I/O: pagar → reservar → confirmar/reembolsar (deps inyectadas)
src/cart/adapters/bemyguest.ts   ← ProviderAdapter api (usa client y lib; sin lógica propia)
src/app/admin/bemyguest/         ← lista curada (solo ADMIN, tras BEMYGUEST_ENABLED)
migrations/00NN_bemyguest.sql    ← BmgSelection, BmgBooking (candado: se aplica solo con OK)
docs/bemyguest/autorizaciones.md ← lo que BeMyGuest autorice por escrito, con fecha
docs/gates-bemyguest-2026-11.md  ← gates firmados
```

---

## 6. Pruebas (primero en rojo, `npx vitest run <archivo>`)

| Archivo | Casos |
|---|---|
| `lib/auth.test.ts` | token nulo, vencido, a 59 s, válido; respuesta sin `access_token`; `expires_in` ausente → 900 s (REQ-021) |
| `lib/price.test.ts` | neto × margen hacia arriba; mínimo de venta manda; margen 0, negativo o NaN → neto; precio por horario vs. día completo (REQ-022) |
| `lib/catalog-map.test.ts` | país por nombre, moneda sin tipo de cambio → error, niños solo si `allowChildren`, máximo de opciones (REQ-023) |
| `schemas/api.test.ts` | registro malo descartado, nulos tolerados (REQ-024) |
| `lib/selection.test.ts` | solo UUIDs curados; producto que sale de la lista se despublica (REQ-232) |
| `lib/sync-plan.test.ts` | feed vacío, 500, 429 con `Retry-After`, caída de 21 %, doble corrida sin cambios, missing→removed a la 3.ª (REQ-233) |
| `lib/booking-plan.test.ts` | pago duplicado no reserva dos veces; rechazo → `failed` + reembolso; pago vencido → no reserva (REQ-237) |
| `lib/cancel-policy.test.ts` | política por horas, sin reembolso, texto en español (REQ-238) |
| `lib/wallet.test.ts` | arriba, en y abajo del umbral (REQ-240) |
| `cart/adapters/bemyguest.test.ts` | contrato ProviderAdapter con cliente falso; falla del cliente → interruptor manda a WhatsApp (REQ-105, 189, 190) |
| `flags.test.ts` | bandera apagada → nada visible y admin 404 (REQ-231) |
| Humo (`src/scripts/smoke.ts`) | preview con `BEMYGUEST_ENABLED=true`: ciudad de Asia, ficha BMG, carrito, a 390 y 1366 px |

Cruce de trazabilidad: `npx vitest run -t "REQ-"` y `grep -rE "REQ-0(2[1-4])|REQ-2(3[1-9]|4[01])" src`.

---

## 7. SOLID

- **S:** `lib/` calcula; `client.ts` solo habla HTTP; `sync.ts` y `booking.ts` orquestan; el adaptador solo traduce al contrato del carrito.
- **O:** el carrito, el interruptor y el cobro dividido no se tocan; BeMyGuest entra como un adaptador más en `buildRegistryAdapters`.
- **L:** `bemyguest` cumple `ProviderAdapter` igual que `freetour`; el test de contrato es el mismo.
- **I:** el adaptador expone las 5 operaciones; el admin usa `selection.ts`, no el adaptador.
- **D:** `client`, `sync` y `booking` reciben `fetch`, reloj, repositorio, Stripe y correo por parámetro (como `src/payments/service.ts`).

---

## 8. Olas

| Ola | Qué | Depende de | Bandera |
|---|---|---|---|
| 0 · Carril B2B | Selección curada cargada a mano en el gestor como viajes en modo solicitud; cobro con enlace Stripe ola 1 | Gate A, migración 0013 + `STRIPE_ENABLED` (candados) | `OWN_TOURS_ENABLED` (ya existe) + `BEMYGUEST_ENABLED=false` |
| 1 · Lib pura | Abrir PR de `feat/bemyguest-ola1` + REQ registrados + bandera | Firma de este plan | `BEMYGUEST_ENABLED=false` |
| 2 · Sync curado + admin | `client.ts`, `sync.ts`, `/admin/bemyguest`, migración | **Llave demo** | `BEMYGUEST_ENABLED=false` |
| 3 · Carrito y cobro | Adaptador api, Stripe propio, reserva tras pago, cancelación, correos, alerta de wallet | Ola 2 + gates A/B + `CART_PAYMENTS_ENABLED` | `BEMYGUEST_BOOKING_ENABLED=false` |
| 4 · Producción | Llave de producción, IP allowlist si aplica, humo con bandera encendida en preview, OK del PO | Acuerdo de fee/meta con BeMyGuest | Encender una bandera a la vez |

Cada ola: rama + PR, unitarias + build + humo 390/1366, plan de regreso (apagar la bandera), sin merge sin OK del PO.

---

## 9. Gates para firma (uno por uno)

### Gate A · Cómo se cobra
- **A1 (recomendado para el carril API):** Travel Puzzle cobra con Stripe propio (merchant of record) y reserva en BeMyGuest **solo después** del pago confirmado; si BeMyGuest rechaza, reembolso automático.
- **A2 (recomendado para el carril B2B, ya):** modo solicitud; el equipo confirma lugar en el portal y manda el enlace de pago de Stripe ola 1 desde `/admin/solicitudes`.
- A3: retener en tarjeta y capturar al confirmar (depende de `STRIPE_HOLD_ENABLED`, que no existe en producción).
- **Recomendación:** A2 ahora y A1 cuando haya llave. Firma: ☐ A1 ☐ A2 ☐ A3 · Fecha: ____

### Gate B · Precio
- **B1:** margen único para todo BeMyGuest.
- **B2 (recomendado):** margen por categoría (tickets vs. tours y excursiones), con ajuste por producto en el gestor.
- B3: margen por producto, sin valor por defecto.
- En todos: nunca abajo del mínimo de venta de BeMyGuest (paridad), redondeo hacia arriba, cobro en MXN con colchón de tipo de cambio (REQ-115). El margen no se escribe en el repo.
- Firma: ☐ B1 ☐ B2 ☐ B3 · Fecha: ____

### Gate C · Catálogo
- **C1 (recomendado):** selección curada (lista de UUIDs en el admin), publicada solo con 5 fotos, ciudad válida y textos propios.
- C2: todo el catálogo de los países elegidos con filtros automáticos (calificación, fotos).
- **Recomendación:** C1 con tope de 30–50 productos en el piloto de 90 días. Firma: ☐ C1 ☐ C2 · Fecha: ____

---

## 10. Riesgos y pendientes con BeMyGuest

1. **API Access Fee y meta mensual** desconocidos: el carril API no se publica sin conocerlos y sin OK del PO.
2. **Moneda del wallet** (SGD o USD) sin confirmar: afecta el colchón de tipo de cambio.
3. **Wallet prepagado:** sin saldo no hay reserva (hay avisos de saldo bajo de 2024 en el correo). REQ-240.
4. **Voucher y correos al cliente:** confirmar por escrito que el voucher puede ir sin precios y sin marca de BeMyGuest, y que no escriben al cliente.
5. **Llaves:** llegarán por correo casi seguro. Guardarlas solo con `wrangler secret put` (candado: secretos con OK del PO) y pedir que revoquen la de 2024.
6. **Refresh token:** BeMyGuest bloquea la llave si un refresh se reusa; por eso el cliente nunca usa refresh (REQ-021).

## 11. Plan de regreso
Todo va tras `BEMYGUEST_ENABLED=false` / `BEMYGUEST_BOOKING_ENABLED=false`. Si algo falla en producción: apagar la bandera (los productos se ocultan, no se borran), correr humo y abrir `docs/incidentes/INC-###.md`.
