# Plan — reserva en línea de tours de Tangol (ola 4; REQ-10546 a REQ-10572)

Frente #535. Concreta la ola 4 de REQ-1548 («reserva y cancelación con `ModoTest` y cobro con Stripe»). **Solo documento:** este PR no trae código de producción, migraciones, banderas, secretos ni llamadas a `MakeBooking`. El PO firma gate por gate; nada se programa antes de su firma.

Fuentes: swagger `tangolapi.tangol.com` v1 (20 operaciones, leído el 14-11-2026), documento del proyecto «tangol-api-reservas-y-disponibilidad-2026-11-13», acuerdo de intermediación con Tangol (cobra Travel Puzzle, comisión 20 % sobre tarifa pública, precio al cliente = tarifa pública REQ-1543, todas las ventas por la API, datos a Uruguay y Argentina, reclamaciones a agencias@tangol.com) y el código de `main` (e7b70745).

## 1. Auditoría

### Lo que ya existe y se reusa
| Pieza | Dónde | Para qué sirve aquí |
|---|---|---|
| Pasarela firmada `POST /tangol`, token 50 min, IP registrada | `gateway/lib/tangol.js`, `handler.js` (REQ-1550/1551) | Mismo canal para reservar; no se habla con Tangol desde el Worker |
| Lista cerrada de operaciones | `gateway/lib/tangol-operations.js` | Hoy 5 lecturas; se agregan 3 de reserva |
| Antidoble envío por intento | `gateway/lib/dedupe.js` (`bookingKey`, hoy solo Freetour) | Se reusa para `makeBooking` |
| Reglas de fecha | `Tour.availabilityRules` (0031), `isDateBookable` y `summarizeRates` en `src/tangol/lib/rates.ts` | Fechas que se ofrecen, horario (`StartTime`), `HoursBooking`, `HoursCancelation` |
| Calendario común de proveedores | PR #462 abierto (`ProviderDateCalendar`, `src/tours/lib/provider-availability.ts`, bandera `PROVIDER_CALENDAR_ENABLED`); pieza pura en PR #440 | El selector de fecha de Tangol; **no está en `main`** |
| Retención con tarjeta | `src/payments/lib/hold.ts`, `src/payments/hold.ts` (REQ-3482), cobro al confirmar y liberación (REQ-3483, EN CURSO); `STRIPE_HOLD_ENABLED="false"` | Retener → reservar en Tangol → capturar o liberar |
| Cobro en MXN con tipo de cambio | `chargeAmount`/`buildCheckoutParams` en `src/payments/lib/checkout.ts`, tabla `Payment` (`fxRate`, `fxCushionPct`) | Moneda del cobro (gate G2) |
| Compra directa con operador por API | `src/octo/purchase.ts`, `src/octo/lib/booking-flow.ts`, `/api/bigbus/{opciones,compra,cancelar}`, tabla `OctoBooking` (0029, columna `provider`), `TripRequest` | Patrón y tablas: apartar → cobrar → confirmar → boleto; `CONFIRM_FAILED` avisa al equipo |
| Solicitud de reserva con adultos, niños, infantes, edades, hotel, opción, horario, consentimiento | `TripRequest` | Guarda la reserva de Tangol sin tabla nueva (gate G11) |
| Política del proveedor en la ficha | Bloque Condiciones (REQ-10536), `Tour.cancellationPolicy` | Texto de cancelación que se muestra |
| Operador visible «Tangol Tours» | REQ-10542 | Marca del voucher |
| Reserva de FREETOUR | `bookingMode`/`bookingCopy` (`src/tours/lib/booking-cta.ts`), `confirmMode` (`src/booking/lib/confirm-mode.ts`), `/api/freetour/booking`, `src/booking/payment.ts`, `paid-policy.ts` | Se reusa la forma del panel y el modo de confirmación; **no** su texto de pago |

### Lo que falta
1. Pasarela: `makeBooking`, `cancelBooking` y `getBookingDetails` no están en la lista cerrada (hoy → 400 «operación no permitida»). No hay candado que fuerce `ModoTest`.
2. Sitio: `src/tangol/api.ts` solo tiene lecturas (`TangolReadOp`). No hay esquema Zod de las respuestas de reserva.
3. Cotización: nadie calcula el total por opción, fecha y personas (`RecStructuresTourRate` trae `PaxFrom/PaxTo`, `PaxType`, `RackRateAdu/Chd/Inf` y vigencia; `ChdFrom/ChdTo`, `InfFrom/InfTo` dan las edades). `availabilityRules` no guarda montos (REQ-1543): el precio por persona se pide en vivo.
4. Orquestador retener → `MakeBooking` → capturar/liberar, cancelación, voucher y correos de Tangol.
5. Ficha: Tangol no tiene eventos de FREETOUR, así que con `BOOKINGS_ENABLED="true"` el panel pinta el calendario de eventos vacío: **«No hay disponibilidad en este momento»** (`TourSidebar.tsx`, `tours.noAvailability`).
6. Texto equivocado **hoy en producción**: con `PAID_TOURS_ENABLED="true"` y precio > 0, `TourDetailClient` pasa `paidPolicyConfirmed(null, language)` a todos los tours, también a los de Tangol: «El cargo se hace en euros (EUR)…» y el reembolso automático confirmado por Elias (FREETOUR). Ninguno aplica a Tangol. Se corrige primero, en su propio PR (REQ-10563), sin esperar a la reserva.
7. Aviso de privacidad: no menciona la transferencia a Tangol (Uruguay y Argentina).
8. Conciliación quincenal con Tangol (neto que se le paga): no existe.

## 2. Flujo del cliente (con la bandera encendida)
1. **Fecha.** En la ficha, el calendario común (PR #462) marca los días con `isDateBookable(reglas, día, { now })`: vigencia, bloqueos, días de operación y anticipación `HoursBooking`.
2. **Opción y horario.** Al elegir día, `/api/tangol/opciones` pide `GetTourRates` en vivo (caché corta) y muestra solo las opciones con tarifa vigente ese día y ese día de la semana, con `Description`, `StartTime`–`EndTime`, `Duration` y su precio público por adulto.
3. **Personas por tipo.** Adulto, niño (edad `ChdFrom`–`ChdTo`) e infante (`InfFrom`–`InfTo`), con las edades de la API escritas en la etiqueta; si son 0–0 el tipo no se ofrece. Se pide la edad de cada niño (`TripRequest.childAges`). El total sale del rango `PaxFrom`–`PaxTo` que cubre al grupo; si ningún rango lo cubre, no se deja continuar y se ofrece al asesor.
4. **Datos del viajero** (gate G8): titular con nombre, apellido, correo y teléfono (`ContactEmail`, `ContactPhone`), nombre y apellido de cada viajero con su `AgeBand`, hotel si la opción tiene recogida (`PickUpLocation`/`ListLocations`) y comentarios. Documento, nacimiento, nacionalidad y género solo si Tangol los exige.
5. **Resumen y avisos.** Precio total, moneda del cobro, «Opera: Tangol Tours», política de cancelación de la opción (`Terms`, `HoursCancelation`, `Tour.cancellationPolicy`) y aviso de transferencia de datos. Nada de euros ni del reembolso de FREETOUR.
6. **Pago.** Se re-cotiza con `GetTourRates`; si el total cambió, se avisa antes de pagar. Checkout de Stripe con retención (gate G1).
7. **Reserva en Tangol.** Con la tarjeta retenida, el servidor manda `MakeBooking` (`BookingReference` = `TripRequest.ref`, `ExternalReference` = id del pago) por la pasarela.
8. **Confirmación.** Respuesta buena con `BookingConfirmation` → se captura el cobro, la solicitud pasa a «Confirmada» y sale el correo con el voucher (gate G4). Respuesta mala → se libera la retención y se avisa (gate G3). Respuesta dudosa o sin respuesta → `GetBookingDetails` con la referencia antes de decidir; nunca un segundo `MakeBooking` a ciegas.
9. **Voucher.** Travel Puzzle, «Operado por Tangol Tours», número de confirmación de Tangol, fecha, opción, horario, punto de encuentro o recogida, personas y contacto.
10. **Cancelación y reembolso.** Desde el enlace del correo, dentro de `HoursCancelation` antes de la salida: `CancelBooking` por la pasarela y reembolso según el gate G5. Fuera de plazo, el botón no aparece y se explica por qué.

## 3. Gates (decisión del PO, una por una)

**G1 — Momento del cobro (REQ-10547).**
- A. Cobro inmediato al pagar y luego `MakeBooking`; si falla, reembolso.
- **B. Retención de la tarjeta (REQ-3482), `MakeBooking`, y captura solo si Tangol confirma; si no, se libera.** ← recomendada
- C. Solicitud sin pago; un asesor confirma y manda liga de pago.
- Por qué B: si Tangol rechaza no hay que reembolsar (sin comisiones de Stripe ni espera de días del cliente) y sirve igual si la reserva es inmediata (se captura en segundos) o bajo solicitud (hasta 7 días de retención de Stripe). El swagger **no dice** si `MakeBooking` confirma en el acto o queda pendiente: pregunta 1 para Hernán. Depende de REQ-3483 (captura y liberación), hoy EN CURSO.

- **FIRMADO (PO, 14 nov 2026): B.** Respuesta literal: «Nosotros, con retención». Cobra Travel Puzzle con retención en Stripe y paga el neto a Tangol por quincena (correos de Hernán del 9 y 12 nov: por API «uds se ocupan de la cobranza»). Ratificado en la ficha única: decisión 5, solo retención (REQ-10584).

**G2 — Moneda del cobro (REQ-10548).**
- A. USD en Stripe, igual que la tarifa de Tangol.
- **B. MXN con el tipo de cambio del día y el colchón de `Payment.fxCushionPct` (`chargeAmount`), mostrando también el USD de referencia; `MakeBooking` en USD.** ← recomendada
- C. MXN sin colchón.
- Por qué B: el sitio ya muestra Tangol en MXN convertido de USD (REQ-10510), el cliente mexicano paga sin comisión por moneda extranjera y el cobro coincide con lo que vio; el colchón cubre la variación hasta el pago quincenal a Tangol en USD. Se guarda `fxRate` para la conciliación.

**G3 — Si `MakeBooking` falla después de retener (REQ-10549).**
- **A. Se libera la retención en automático, correo al cliente («no se te cobró») y aviso al equipo con el error de Tangol; si la respuesta es dudosa, primero `GetBookingDetails`.** ← recomendada
- B. Se deja retenido y el equipo intenta reservar a mano.
- C. Se cobra y luego se reembolsa.
- Por qué A: el acuerdo exige que todas las ventas vayan por la API (B lo rompe) y con retención no hay nada que reembolsar. Si Tangol confirmó pero la captura falla, la reserva queda `CONFIRM_FAILED` como en OCTO y el equipo decide (candado de pagos).

**G4 — Voucher (REQ-10550).**
- **A. Lo emite Travel Puzzle, con su marca, «Operado por Tangol Tours» y el `BookingConfirmation` de Tangol.** ← recomendada
- B. Se reenvía el voucher de Tangol.
- C. Los dos.
- Por qué A: la respuesta de `MakeBooking` no trae voucher, PDF ni liga (solo `BookingConfirmation`, totales y la línea del tour), y el PO ya decidió que el operador visible es «Tangol Tours» (REQ-10542). Pregunta 5 para Hernán: si el operador en destino acepta el voucher de la agencia o pide uno propio.

**G5 — Política de cancelación y reembolso (REQ-10551).**
- A. Se muestra la de la API; al cancelar en plazo, `CancelBooking` y reembolso automático por Stripe.
- **B. Se muestra la de la API; al cancelar en plazo, `CancelBooking` en automático y el reembolso lo dispara el equipo en un clic, por el total menos la penalidad que diga Tangol.** ← recomendada para el piloto; pasar a A cuando Hernán confirme qué significa `TotalCancelAmount`.
- C. Cancelación solo con asesor.
- Por qué B: `CancelBookingResponse.TotalCancelAmount` no dice si es lo que se devuelve o la penalidad (pregunta 3), y el reembolso es candado de pagos; OCTO hace lo mismo (`cancel_refund_pending`). Se muestra `Terms` y `HoursCancelation` de la opción elegida, no un «24 h» fijo.

**G6 — Pruebas con `ModoTest` antes de encender (REQ-10552).**
- **A. La pasarela fuerza `ModoTest=true` salvo que cPanel tenga `TANGOL_BOOKING_LIVE="true"`; en preview se corre la matriz (adulto solo, con niño, con infante, fecha bloqueada, fuera de `HoursBooking`, opción sin tarifa, cancelación, error forzado) y después una sola reserva real de un tour barato, con aviso a Hernán, que se cancela.** ← recomendada
- B. Solo `ModoTest`, sin reserva real.
- C. Directo a producción con un tour.
- Por qué A: doble candado (pasarela y bandera del sitio) y una prueba real que demuestra que `ModoTest` no ocultaba un error. Pregunta 2: si `ModoTest` valida todo igual que una real y no deja huella.

**G7 — Encendido (REQ-10553).**
- **A. `TANGOL_BOOKING_ENABLED="false"` por omisión; al encender, primero una lista corta de tours piloto (`TANGOL_BOOKING_TOURS`), luego todos.** ← recomendada
- B. Todos los tours de Tangol al mismo tiempo.
- Por qué A: limita el daño si algo falla con dinero real; REQ-1605 pide el mismo trato en el catálogo, y el piloto es por tiempo acotado con decisión escrita del PO. Requiere `PROVIDER_CALENDAR_ENABLED`, `STRIPE_ENABLED` y `STRIPE_HOLD_ENABLED` encendidas; sin ellas la ficha queda con el asesor.

**G8 — Datos del viajero (REQ-10554).**
- A. Todos los campos de `Traveller` (documento, nacimiento, nacionalidad, género…).
- **B. Mínimos: titular con contacto, nombre y apellido de cada viajero, `AgeBand`, hotel si hay recogida; lo demás solo si Tangol lo exige para ese tour.** ← recomendada
- C. Solo el titular.
- Por qué B: menos datos transferidos al extranjero (LFPDPPP, minimización) y un formulario más corto. El swagger no marca campos obligatorios: pregunta 4.

**G9 — Transferencia de datos a Uruguay y Argentina (REQ-10555).**
- A. Casilla de aceptación expresa antes de pagar.
- **B. Leyenda visible antes de pagar («Tus datos se comparten con Tangol Tours, en Uruguay y Argentina, solo para operar tu reserva») con liga al aviso de privacidad actualizado; sin casilla.** ← recomendada, sujeta a revisión legal
- C. Solo el aviso de privacidad.
- Por qué B: la transferencia es necesaria para cumplir el contrato con el cliente (art. 37 LFPDPPP), así que no requiere consentimiento, pero sí informarlo. Reclamaciones del cliente con Tangol: a agencias@tangol.com, por Travel Puzzle.

**G10 — Precio entre la vista y el pago (REQ-10556).**
- **A. `GetTourRates` en vivo al elegir fecha (caché de 15 min) y otra vez antes de pagar; si cambió, se avisa y se pide confirmar.** ← recomendada
- B. Guardar las tarifas completas en la base con el sync.
- Por qué A: `availabilityRules` no guarda montos a propósito (REQ-1543) y el precio por tipo de persona y rango de grupo solo está en vivo; una llamada por reserva es poco.

**G11 — Dónde se guarda la reserva (REQ-10557).**
- **A. `TripRequest` (personas, edades, hotel, opción, horario, consentimiento) + `Payment` + `OctoBooking` con `provider='tangol'`; sin tabla nueva ni migración, salvo que G8 pida guardar más de un viajero con nombre.** ← recomendada
- B. Tabla nueva `TangolBooking` (migración 0033).
- Por qué A: las tres tablas ya existen y `OctoBooking` ya tiene `provider`, `supplierReference` (= `BookingConfirmation`) y `delivery` (= voucher). No se duplica el flujo de OCTO. Hay que verificar que la 0029 esté aplicada en producción.

## 4. Estructura de carpetas
Cambia: se agregan archivos dentro de dominios existentes; no hay módulo nuevo de primer nivel.
```
gateway/lib/
  tangol-operations.js        + makeBooking, cancelBooking, getBookingDetails; ModoTest forzado sin TANGOL_BOOKING_LIVE
  tangol-operations.test.js   nuevo
src/tangol/
  api.ts                      + makeBooking, cancelBooking, getBookingDetails
  booking.ts                  nuevo: orquesta retener → MakeBooking → capturar/liberar; cancelar (deps por parámetro)
  booking-deps.ts             nuevo: arma las dependencias reales
  booking.test.ts             nuevo
  lib/
    quote.ts / .test.ts            nuevo: opciones del día, tipos de persona con edades, total por rango de grupo
    booking-request.ts / .test.ts  nuevo: cuerpo de MakeBooking y CancelBooking
    booking-response.ts / .test.ts nuevo: Zod + confirmada | rechazada | dudosa
    cancel-window.ts / .test.ts    nuevo: ¿se puede cancelar ahora? (HoursCancelation)
    voucher.ts / .test.ts          nuevo: contenido del voucher y correos
    booking-copy.ts / .test.ts     nuevo: textos del panel para Tangol (moneda, operador, política)
    booking-flags.ts / .test.ts    nuevo: bandera y lista piloto
src/app/api/tangol/{opciones,compra,cancelar}/route.ts   nuevo (mismo patrón que /api/bigbus)
src/components/tours/one/TangolBookingPanel.tsx          nuevo (fecha → opción → personas → datos → pago)
src/app/api/stripe/webhook/route.ts                      + rama provider='tangol'
src/app/admin/…                                          + reporte quincenal (solo ADMIN)
```

## 5. Unit tests por pieza (`npx vitest run <archivo>`)
- `gateway/lib/tangol-operations.test.js`: acepta las 3 operaciones con datos válidos; rechaza tipos de persona negativos, fechas mal formadas y campos de más; fuerza `ModoTest=true` sin `TANGOL_BOOKING_LIVE`.
- `src/tangol/lib/quote.test.ts`: opción sin tarifa ese día no sale; día fuera de `OperationDays` no sale; grupo fuera de `PaxFrom`–`PaxTo` → sin total; edades 0–0 ocultan el tipo; total = suma de tarifa pública × personas, nunca el neto.
- `booking-request.test.ts`: `Adu/Child/Inf` coinciden con la lista de viajeros; `BookingReference` = ref; moneda USD.
- `booking-response.test.ts`: `Status` bueno + `BookingConfirmation` → confirmada; error → rechazada con código; sin cuerpo o timeout → dudosa; un registro malo se descarta y se registra.
- `cancel-window.test.ts`: en el límite exacto de `HoursCancelation`; sin dato → solo con asesor.
- `booking-copy.test.ts`: para Tangol nunca sale «euros» ni el texto de Elias; sí «Tangol Tours» y la política de la opción.
- `src/tangol/booking.test.ts`: confirmada → captura; rechazada → libera; dudosa → `GetBookingDetails` y no repite `MakeBooking`; captura falla → `CONFIRM_FAILED` y aviso.
- Cierre: `npx vitest run`, build, `npx tsx src/scripts/smoke.ts <preview>` con la bandera encendida en preview (regla 3).

## 6. SOLID
- SRP: una pieza por responsabilidad (cotizar, armar petición, leer respuesta, plazo de cancelación, textos, voucher); el orquestador solo coordina.
- OCP: el panel de reserva recibe el modo del proveedor; Tangol se suma sin tocar el flujo de FREETOUR. El calendario agrega proveedores en `POR_PROVEEDOR` (PR #462).
- LSP: `TangolBookingPanel` respeta las props de `TourSidebar` (precio, `below`, `onAdvisorClick`); sin bandera, el panel del asesor queda como hoy.
- ISP: el panel recibe solo opciones, edades y política, no el tour completo; nada de neto ni comisión llega al cliente.
- DIP: `booking.ts` recibe pasarela, Stripe, base y correo por parámetro (`booking-deps.ts` arma las reales), como `src/octo/purchase.ts`.

## 7. Olas en orden de dependencia
0. **Texto del panel para Tangol** (REQ-10563): quita «euros» y el reembolso de FREETOUR, y cambia «No hay disponibilidad» por el asesor mientras no haya reserva. Sale ya, solo.
1. **Preguntas a Hernán** (REQ-10571) y firma de G1–G11. Bloquea todo lo demás.
2. **Pasarela** (REQ-10558) + cliente del sitio (REQ-10559). Pruebas solo con `ModoTest`.
3. **Lógica pura** (REQ-10560, 10561, 10562 parte de cancelación, 10564 voucher).
4. **Orquestador y rutas** (REQ-10565, 10566), con REQ-3483 ya en `main`.
5. **Panel en la ficha** (REQ-10567) sobre el calendario de PR #462, aviso de datos (REQ-10568), bandera en `false` (REQ-10569).
6. **Matriz `ModoTest` en preview + humo** (REQ-10570), reserva real de prueba, OK del PO, encendido del piloto.
7. **Conciliación quincenal** (REQ-10572).

## 8. Candados del PO
- Pagos/Stripe: encender `STRIPE_HOLD_ENABLED`, la primera captura real y cualquier reembolso.
- Secretos/variables: `TANGOL_BOOKING_LIVE` en cPanel; ninguna credencial en el repo.
- Bandera: `TANGOL_BOOKING_ENABLED` y la lista piloto; cada encendido en su PR con preview y humo.
- Datos reales: la primera reserva real en Tangol y cualquier escritura en reservas de clientes.
- Migración: solo si G11 o G8 la piden.
- Merge de cada PR con OK visual del PO.

## 9. Plan de regreso
- Bandera `TANGOL_BOOKING_ENABLED="false"` → la ficha vuelve al asesor; las reservas hechas siguen vivas.
- Quitar `TANGOL_BOOKING_LIVE` en cPanel → la pasarela vuelve a `ModoTest` sin desplegar el sitio.
- Retenciones abiertas: se liberan con el botón de REQ-3483; las confirmadas se cancelan en Tangol con `CancelBooking` solo con OK del PO.
- Ola 0: revertir su PR devuelve el texto anterior.

## 10. Preguntas para Hernán (Tangol)
1. ¿`MakeBooking` confirma en el acto o hay tours bajo solicitud? Si hay, ¿cómo se distingue en la respuesta y cuánto tarda la confirmación?
2. ¿Qué significan `RequestStatus.Status` 0 y 1, y qué valores toma `GetBookingDetails.Status`? ¿Hay lista de `ErrorCode`?
3. ¿`TotalCancelAmount` es lo que se devuelve al cliente o la penalidad? ¿`HoursCancelation` se cuenta contra la hora de salida local del tour?
4. ¿Qué campos de `Traveller` son obligatorios, y cuáles dependen del tour (documento, nacimiento, nacionalidad, hotel)? ¿Qué valores acepta `AgeBand`?
5. ¿Emiten voucher? ¿El operador acepta el voucher de Travel Puzzle con su número de confirmación?
6. ¿`ModoTest=true` valida igual que una reserva real (cupo, fechas, edades) y no deja ninguna reserva ni cargo?
7. Significado de los enteros `TourBookingRequest.Type` (0–4), `Currency` (0–3) y `TourLanguage` (0–6); ¿`MakeBookingRequest.Currency` acepta «USD»?
8. ¿Cómo se mandan `Sgl/Dbl/Tpl/Cpl` frente a `Adu`? ¿Aplican solo a tours con alojamiento?
9. ¿Hay cupo por salida? `GetTourRates` no lo trae: ¿puede rechazarse una fecha que las tarifas dan como vigente?
10. ¿En qué zona horaria van `StartTime` y `HoursBooking`?
11. Para la conciliación quincenal: ¿qué reporte usan y con qué referencia (`BookingReference` o `ExternalReference`)?
12. ¿Hay entorno de pruebas aparte o solo `ModoTest` en producción? ¿Límite de llamadas por minuto?
