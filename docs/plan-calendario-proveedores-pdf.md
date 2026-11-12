# Plan do-plan · Calendario con precio por día para los proveedores de PDF (REQ-3454, REQ-3456)

Para firma del PO antes de programar. Frente: issue #444. Se apoya en el PR #440 (REQ-3443…3445, forma común de Freetour y Tangol).

Petición literal (PO, 12 nov 2026): «no se si esto de para hacer un calendario con costos como los que s ehara apra freutour y Tangol revisalo» → «como lo hacen refrentes» → «si preprarlo».

## 1. Auditoría (solo lectura, main al 12 nov)
| Lo que pide el calendario | Ya existe | Dónde |
|---|---|---|
| Días de salida (S) | sí: `availability.weekdays` | `src/trips/schemas/trip.ts:42`; los `imports/` ya los traen (p. ej. Exotic) |
| Fechas cerradas (B) | sí: `availability.closedDates` (366 máx.) | mismo esquema |
| Aviso mínimo (A) | sí: `minNoticeHours` | `src/departures/sources/own-trips.ts` |
| Temporadas (T) | sí, como suplemento sobre el precio base: `availability.seasons` (12 máx.) | `estimate()` en `src/trips/lib/request.ts:26` toma **una** temporada por fecha |
| Recargo obligatorio por fecha que se SUMA a la temporada (R) | **no**: una sola temporada por día; Feria de Cantón y temporada no se suman | — |
| Recargo distinto por tipo de habitación (doble/individual) | **no**: el suplemento es igual para todas las opciones | — |
| Días de salida que cambian por periodo (Fantástica China: L-M-J en verano, solo L en invierno) | **no**: `weekdays` vale para todo el año | — |
| Recargo por día de la semana (D) | **no** | — |
| Vigencia del tarifario (V) | **no**: fuera de vigencia hoy se ofrece igual | — |
| Días «a cotizar» (Navidad en India, temporada alta de Multitravel) | **no** (solo cerrar el día) | — |
| Calendario del mes con precio | en el PR #440 (`monthAvailability`, sin conectar) | `src/tours/lib/date-availability.ts` |

## 2. Estructura de carpetas
Sin carpetas nuevas.
- **Modificado** `src/trips/schemas/trip.ts`: campos nuevos opcionales en `availability` (todos con valor por omisión vacío, así los viajes de hoy no cambian):
  - `validFrom`, `validTo` (V).
  - `weekdayRules: [{ from, to, weekdays }]` (S por periodo; si hay, ganan sobre `weekdays` en su tramo).
  - `surcharges: [{ name, from?, to?, weekdays?, amount, byOption? }]` (R y D): obligatorios, se suman a la temporada; `byOption` da el monto por opción (doble/individual).
  - `quoteRanges: [{ from, to }]`: días con salida pero sin precio publicado («precio por confirmar»).
- **Nuevo** `src/trips/lib/day-price.ts`: función pura `dayPrice(trip, date, optionId)` → `{ bookable, price | null, quote }`. Una sola fuente: la usan el calendario y `estimate()`.
- **Modificado** `src/trips/lib/request.ts`: `estimate()` llama a `dayPrice` (mismo resultado de hoy cuando no hay campos nuevos).
- **Modificado** `src/tours/lib/date-availability.ts` (rama del PR #440): traductor `fromTripAvailability(trip)` para que los viajes de PDF entren al mismo `monthAvailability` que Freetour y Tangol.
- **Datos**: `imports/*.json` de cada proveedor, por tandas y en PR aparte por proveedor (los de REQ-3456). Sin montos netos en el repo: solo precios públicos, como hoy.
- Sin cambio de pantalla en este PR. El calendario en la ficha va en la ola siguiente, con su gate.

## 3. Pruebas (rojo → verde, `npx vitest run <archivo>`)
| Pieza | Test existente | Test nuevo |
|---|---|---|
| Esquema | `src/trips/schemas/trip.test.ts` (temporadas) | campos nuevos opcionales; fechas al revés rechazadas; un viaje viejo valida igual |
| Precio del día | — | `src/trips/lib/day-price.test.ts`: temporada + Feria de Cantón se suman; individual paga su propio recargo; salida en otro día suma el recargo D; fuera de vigencia no se ofrece; día en `quoteRanges` = precio por confirmar; días de salida por periodo (L-M-J / solo L) |
| `estimate()` | `src/trips/lib/request.test.ts` | igual que hoy sin campos nuevos (caracterización) y con recargos |
| Calendario | `src/tours/lib/date-availability.test.ts` (PR #440) | `fromTripAvailability`: los viajes de PDF dan el precio final por día |
| Candado | `src/ingest/privacy.test.ts` | ningún neto ni nombre de proveedor en el resultado |
Cada test con su folio en el nombre (`it('REQ-3454: …')`).

## 4. SOLID
- **S**: `day-price.ts` solo calcula el precio de un día; el calendario solo arma el mes; el esquema solo valida.
- **O**: un tipo de recargo nuevo es un dato en `surcharges`, no un `if` nuevo.
- **L**: un viaje sin campos nuevos se comporta exactamente como hoy (test de caracterización).
- **I**: `dayPrice` recibe solo `availability`, opciones y fecha, no el viaje entero.
- **D**: el día de hoy y la vigencia entran por parámetro; sin reloj ni red (INC-001).

## 5. Gates para el PO (uno por uno)
- **G1 · Dónde vive.** A) Ampliar `availability` de los viajes y traducirlo al calendario común del PR #440 (Recomendado: una sola forma para todos). B) Cargar los de PDF directo como `PriceRule` del PR #440, sin tocar el esquema de viajes. C) Otro.
- **G2 · Temporada + recargo.** A) Se suman (temporada alta + Feria de Cantón el mismo día) (Recomendado: así lo cobra el proveedor). B) Solo el mayor.
- **G3 · Días sin precio publicado.** A) Se ven con «precio por confirmar» y se pueden solicitar (Recomendado: así funcionan hoy los viajes «a cotizar»). B) Se ven deshabilitados.
- **G4 · Fuera de vigencia.** A) No se ofrecen hasta cargar el tarifario nuevo (Recomendado). B) Se ofrecen con «precio por confirmar».
- **G5 · Orden de carga.** A) Exotic y Fantástica China primero (tienen todo), luego Turismo Asiático, Jordan Experience, Destino Colombia, Extime y Eurowelcome; los vencidos (Mondial Trails, Canadian Receptive Tours, Multitravel) al recibir su tarifario (Recomendado). B) Todos a la vez.

## 6. Publicación
Sin bandera nueva para el esquema (campos vacíos = sin cambio). El calendario en pantalla irá tras bandera en su propio PR, con preview encendido, prueba de humo 390/1366 y OK del PO. Plan de regreso: revertir el merge; los campos nuevos son opcionales.

## 7. Firmas del PO
| Gate | Respuesta literal | Fecha |
|---|---|---|
| G1 · Dónde vive | «A» (ampliar la disponibilidad de los viajes y traducirla al calendario común del PR #440) | 12 nov 2026 |
| G2 · Temporada + recargo | «A» (se suman: temporada y recargo obligatorio el mismo día) | 12 nov 2026 |
| G3 · Días sin precio publicado | «A» (se ven con «precio por confirmar» y se pueden solicitar) | 12 nov 2026 |
