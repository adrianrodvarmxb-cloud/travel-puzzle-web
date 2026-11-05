# Plan: Freetour Partners API v2.0 → v2.2

Pedido del PO (5 nov 2026): "tmb hay que usar la api 2.2 de freetour y prender las nuevas funcionalidades revisa eso, pero asegura la operabilidad que ya tenemos en caso de cualquier incidente antes de moverlo".

Estado: **plan + interruptor apagado**. Este PR no cambia nada en producción: sin `FREETOUR_API_VERSION` todo sigue en v.2.0.

## 1. Auditoría (qué versión usa cada pieza hoy)

| Pieza | Dónde se define la versión | Hoy | ¿Cómo se cambia? |
|---|---|---|---|
| Worker (catálogo, cron sync-tours, reseñas, /api/freetour/booking, modificar) | `src/freetour/lib/hosts.ts` | v.2.0 fija en código | Con este PR: variable `FREETOUR_API_VERSION` (REQ-062) |
| Pasarela cPanel (reservas, cancelación, edición; IP registrada) | `gateway/server.js` | `FREETOUR_BASE_URL` o v.2.0 | Con este PR: `FREETOUR_API_VERSION` en cPanel + reiniciar app |
| Cliente heredado | `src/lib/api/freetour-client.ts:94` | `www.freetour.com/.../v.2.0` fijo | No se toca (código heredado; ver riesgo R5) |
| Scripts (`generate-countries`, `gateway/scripts/prueba-reservas.js` en PR #62) | `hosts.ts` / argumento del script | v.2.0; el de prueba ya diagnostica 2.0 y 2.2 | El PO los corre |
| Reseñas | `src/reviews/lib/reviews.ts` | Acepta forma v2.0 (arreglo) y v2.1 (`{reviews,totalObjects}`) | Ya compatible |

Lo que ya existe para 2.2 (sin publicar):
- **PR #62 `feat/freetour-pago`**: `POST /payment` y `GET /payment/{checkoutSessionId}` en la pasarela, `src/booking/payment.ts` (confirmar + reintento), cron `/api/cron/payments` (se salta si `PAID_TOURS_ENABLED !== "true"`), páginas `pago/exito` y `pago/cancelado`, textos de reembolso en 6 idiomas, migración `0009_freetour_payments.sql` (**no aplicada**).
- **REQ-013** (tours de pago) y bandera `PAID_TOURS_ENABLED="false"` en `wrangler.jsonc`.
- `gateway/lib/freetour-spec-required.json`: swagger 2.0/2.1/2.2 (descargado 4 nov 2026).

## 2. Diferencias v2.0 → v2.2 y su impacto

| # | Cambio en v2.2 | Impacto en nuestro código | Qué falta |
|---|---|---|---|
| D1 | Ruta `/partnersAPI/v.2.2` | Worker y pasarela tenían la versión fija | Resuelto con el interruptor (REQ-062) |
| D2 | Pagos: `POST /payment` → `paymentUrl`, `checkoutSessionId`, `expiresAt`; `GET /payment/{id}` → `paymentStatus` (1 = pagado) | Implementado en PR #62 | Probar en 2.2 con tour 6782; migración 0009 |
| D3 | Estados de reserva: `active`, `unpaid`, `canceled`, `rejected` | Hoy tratamos todo lo creado como activo | Mapear `unpaid` (pendiente de pago) y `rejected` en la página de reserva (REQ-065) |
| D4 | Error **63**: pago aún no confirmado → reintentar por cron, **no más de cada 10 min**, hasta que expire la sesión | `retryPendingPayments` en PR #62 | Verificar intervalo del cron ≥ 10 min y corte en `expiresAt` |
| D5 | Error **33**: precio incorrecto | Hoy se manda el precio calculado por nosotros | El precio de la reserva debe salir de `payableNowPricePerGroup` del evento (REQ-064) |
| D6 | Campos nuevos del evento: `isAvailable`, `minAdultsPerBooking`, `availableAdultsPlaces`, `availableChildrenPlaces`, `isPhoneRequired`, `isPartiallyPaid`, `fullPricePerGroup`, `payableNowPricePerGroup` | No se leen | Validar con Zod y usarlos: ocultar salidas no disponibles, mínimo de adultos, cupo, teléfono obligatorio, pago parcial (REQ-063) |
| D7 | Modo 2: correo de confirmación propio; cancelación obligatoria disponible para el cliente; `GET /booking/{ref}` antes de cancelar o editar | Ya enviamos correo propio (Resend) y hay cancelar/modificar | Consultar la reserva antes de cancelar/editar (REQ-066) |
| D8 | Cancelar una reserva pagada = reembolso inmediato | Texto de reembolso listo (PR #62) | Confirmar que el texto solo prometa lo que Freetour hace |
| D9 | Editar solo reservas **gratis**, vía `/event/{id}/{refNumber}` | `EDIT_ENABLED="true"` para free tours | Ocultar "modificar" en reservas de pago (REQ-066) |

## 3. Funcionalidades que se pueden encender (cada una con su bandera)

| Funcionalidad | Bandera | Valor hoy | Se enciende cuando |
|---|---|---|---|
| Hablar v2.2 (Worker) | `FREETOUR_API_VERSION` en `wrangler.jsonc` | ausente = 2.0 | Paso 3 verde |
| Hablar v2.2 (pasarela) | `FREETOUR_API_VERSION` en cPanel | ausente = 2.0 | Paso 1 verde |
| Campos nuevos del evento (cupo, mínimo, teléfono) | `EVENT_V22_FIELDS_ENABLED` (nueva, `false`) | — | Worker en 2.2 |
| Tours de pago (checkout Freetour) | `PAID_TOURS_ENABLED` | `false` | Migración 0009 + merge #62 + compra real chica |
| Pago parcial (`isPartiallyPaid`) | `PARTIAL_PAYMENT_ENABLED` (nueva, `false`) | — | Después de tours de pago estables 1 semana |
| Modificar reserva | `EDIT_ENABLED` | `true` (solo free) | Ya encendida; en 2.2 se limita a free (REQ-066) |

El copy solo promete lo que esté encendido en producción.

## 4. Pasos, uno por uno (un REQ por paso, un PR y una firma cada uno)

| Paso | REQ | Qué | Quién | Gate |
|---|---|---|---|---|
| 0 | REQ-062 | Interruptor de versión, apagado (este PR) | Claude | Gate A: PO firma el plan y el merge (no cambia el comportamiento) |
| 1 | REQ-063 | Prueba de reservas en v2.2 con la pasarela, tour de prueba **6782 (Mpika)**: crear → consultar → editar → cancelar | **PO** corre el script en cPanel | Gate B1: salida del script verde |
| 2 | REQ-063 | Pasarela en 2.2: `FREETOUR_API_VERSION=2.2` en cPanel + reiniciar; repetir paso 1 | **PO** | Gate B2 |
| 3 | REQ-064 | Worker en 2.2: precio desde `payableNowPricePerGroup`, validación Zod de campos nuevos, luego `FREETOUR_API_VERSION="2.2"` en preview → humo → producción | Claude prepara PR; PO firma deploy | Gate B3 |
| 4 | REQ-065 | Estados `unpaid`/`rejected` en la página de reserva | Claude | Gate C1 |
| 5 | REQ-066 | `GET /booking/{ref}` antes de cancelar/editar; editar solo free | Claude | Gate C2 |
| 6 | REQ-067 | Migración 0009 + merge PR #62 (pagos) con `PAID_TOURS_ENABLED="false"`; compra real chica en preview con bandera encendida; luego encender en producción | PO aplica migración y firma | Gate C3 → C4 |

Regla: un cambio a la vez; nunca dos deploys seguidos sin prueba de humo entre ellos.

### Prueba de humo de reservas (tour 6782)
1. Solo se usa el tour de prueba **6782 (Mpika)**, en una salida futura, 1 adulto, nombre `PRUEBA TP` y el correo de pruebas.
2. El script solo consulta, edita y cancela el `refNumber` que **él mismo creó en esa corrida**; nunca lista ni toca otras reservas.
3. Secuencia: login → `GET /event` (ver campos D6) → crear reserva → `GET /booking/{ref}` (estado `active`) → editar (`/event/{id}/{refNumber}`) → `GET /booking/{ref}` → cancelar → `GET /booking/{ref}` (estado `canceled`).
4. Verde = los 7 pasos sin error y la reserva termina cancelada. Si algo falla a medias, el script intenta cancelar su propia reserva antes de salir y lo reporta.
5. La salida (sin credenciales) se pega en el PR del paso.

## 5. Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | 2.2 rechaza reservas que 2.0 aceptaba (error 33 por precio) | Paso 3 toma el precio de `payableNowPricePerGroup`; la pasarela pasa a 2.2 antes que el Worker solo para la prueba |
| R2 | Pasarela y Worker en versiones distintas | Mismo nombre de variable; orden fijo pasarela → Worker; la pasarela solo reserva, el Worker solo lee catálogo |
| R3 | Pago confirmado tarde (error 63) deja reservas `unpaid` | Cron cada ≥10 min hasta `expiresAt`; alerta si una reserva queda `unpaid` > 1 h |
| R4 | Cambio de forma en respuestas (reseñas, eventos) | Zod: registro malo se descarta y se registra; reseñas ya aceptan ambas formas |
| R5 | `src/lib/api/freetour-client.ts` sigue fijo en v.2.0 | Revisar si alguna ruta viva lo usa antes del paso 3; si sí, moverlo a `resolveFreetourConfig` |
| R6 | Swagger lista `/payment` también en 2.0 pero el PDF lo documenta en 2.2 | Paso 1 lo verifica en vivo antes de depender de él |
| R7 | Error 403 por IP | Las reservas siguen saliendo solo de la pasarela (IP registrada) |

## 6. Plan de regreso (orden exacto y responsable)

1. **Worker** (≈1 min) — PO o Claude con OK: en Cloudflare → Worker → Settings → Variables, borrar `FREETOUR_API_VERSION` (o `npx wrangler rollback` a la versión anterior). Sin la variable vuelve a v.2.0.
2. **Pasarela** (≈1 min) — **PO**: cPanel → Setup Node.js App → quitar `FREETOUR_API_VERSION` → *Restart*. Vuelve a v.2.0.
3. **Pagos** — PO: `PAID_TOURS_ENABLED="false"` (las reservas de pago dejan de ofrecerse; las ya pagadas siguen en Freetour).
4. Prueba de humo contra producción (`npx tsx src/scripts/smoke.ts https://travelpuzzle.com.mx`) y prueba de reservas del paso 1 en 2.0.
5. Abrir `docs/incidentes/INC-###.md` con causa raíz.

El orden es Worker primero (es lo que ve el cliente) y luego la pasarela.

## 7. Qué vigilar las primeras 24 h

- Códigos de Freetour en logs del Worker y la pasarela: **33** (precio), **63** (pago pendiente), **403** (IP/token), 5xx.
- Tasa de éxito de crear / cancelar / editar reserva contra el día anterior (meta: igual o mejor).
- Cron `sync-tours`: número de tours y salidas sincronizadas (no debe bajar de golpe).
- Cron `payments` (cuando esté encendido): reservas `unpaid` con más de 1 h.
- Prueba de humo contra producción al publicar, a la hora y a las 24 h.
- Correos de confirmación enviados = reservas creadas.
