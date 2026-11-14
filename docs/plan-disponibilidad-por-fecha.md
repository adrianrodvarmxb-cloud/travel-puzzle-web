# Plan — disponibilidad y precio por fecha, igual para todos los proveedores (REQ-3443..REQ-3445)

Petición del PO (12 nov 2026 06:10): «si se puede implementar en más APIs hazlo, o propón algo que se pueda hacer con más».

## La idea
Cada proveedor dice lo suyo a su manera:

| Proveedor | Cómo da las fechas | Lo tenemos |
|---|---|---|
| Tangol | tarifas con rango (`ValidFrom`/`ValidTo`) por opción + fechas bloqueadas (`GetTourRates`) | la lectura sí (ola 1); nunca se ha pedido ni guardado |
| Freetour | fechas de salida sueltas por tour (`departureDates` en la base) | sí, ya sincronizadas |
| Exotic Escapes, Fantástica China, Destino Colombia… | columnas de temporada en PDF, cargadas a mano | parcial, en `imports/` |

En vez de un calendario por proveedor, **una sola forma**: `PriceRule` (una tarifa que vale para un tramo de fechas) más los bloqueos. Cada proveedor trae su traductor; el calendario y la ficha son los mismos para todos. Un proveedor nuevo solo escribe su traductor.

## Lo que ya está en este PR (puro y probado, sin conectar)
`src/tours/lib/date-availability.ts` (en `tours/lib` a propósito: no abre módulo nuevo de primer nivel):
- `monthAvailability(disponibilidad, "AAAA-MM", { today, minDays })` → por cada día del mes: si se ofrece y su **precio público más bajo**. Respeta bloqueos, el pasado y el aviso mínimo del proveedor.
- `fromDateRanges(...)` → traductor de tarifas con rango (Tangol).
- `fromFixedDates(...)` → traductor de fechas sueltas (Freetour).
- Sin red, sin base y **sin reloj**: el día de hoy entra por parámetro, así el render es determinista (regla de INC-001). El neto y el nombre del proveedor no existen en esta capa.

## Lo que falta, y es decisión del PO (gates de la ola 3)
- **G1 — de dónde salen las tarifas de Tangol.** No hay endpoint que traiga todo: es **una llamada por tour** (2,237). Dos caminos:
  - *bajo demanda*: se piden al abrir la ficha y se guardan en caché unas horas. Simple; la primera visita de cada tour tarda.
  - *en el sync diario*: 2,237 llamadas cada noche, guardadas en la base como ya se hace con `departureDates`. El calendario abre instantáneo; el sync se alarga y hay que cuidar la ventana (REQ-307: no a la par de una publicación).
- **G2 — qué ve el cliente**: calendario con precio por día (como los referentes) o precio «desde» y confirmación al elegir fecha.
- **G3 — cada cuánto se refresca** y qué se muestra cuando la tarifa cambió entre la vista y el pago.
- **G4 — los proveedores de PDF**: sus temporadas están en `imports/`; hay que decidir si se cargan como `PriceRule` o se quedan a cotizar.

## Lo que NO hace este PR
No conecta nada: ninguna ficha lo usa, no se piden tarifas, no se guarda nada y no hay bandera encendida. Es la pieza común para que la ola 3 no se escriba tres veces.
