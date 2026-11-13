# Prueba real de cobro con Stripe: viaje de agencia y viaje propio (REQ-1324)

> **Actualización 13 nov 2026 (REQ-3533 a REQ-3535):** el PO pidió que el cobro sea automático, sin gestor ni aprobación. Cuando se publique la compra directa, la prueba se hace así (y el flujo de abajo queda solo para viajes en «cotizar»):
> 1. En el gestor, un viaje de prueba en modo **comprar**, con una opción de **$10 MXN** por adulto, estado **Solo con enlace** y la agencia con tu correo como contacto (así el aviso al proveedor te llega a ti).
> 2. Con `TRIPS_DIRECT_BUY_ENABLED="true"` (PR propio, OK del PO), abrir la ficha por su enlace, 1 adulto, «Reservar y pagar» → Stripe muestra $10.00 MXN → pagar.
> 3. Llegan «Recibimos tu pago» (cliente) y «Nueva reserva por confirmar» (proveedor). En la página del enlace, «Sí, confirmo» → llega «Tu viaje está confirmado».
> 4. Segunda compra de $10: «No hay lugar» → Stripe muestra el cobro «Reembolsado» sin tocar nada → llega «Te devolvimos tu pago».
> 5. Anotar en la tabla de abajo las referencias (folio, pago y reembolso).

PO, 11 nov 2026: «las pruebas con freetour ya se hicieron… las que faltan son las de tour de otros proveedores y propios con nuestro Stripe».
Flujo en producción (REQ-159, REQ-115, REQ-116): solicitud desde la ficha → enlace de pago desde el gestor → Stripe Checkout → webhook → reembolso.
Requisitos: `STRIPE_ENABLED="true"` (ya está en main), cuenta ADMIN del gestor y la tarjeta del PO. Nada de esto lo puede hacer un agente: el pago y el gestor piden la sesión y la tarjeta del PO.

## Prueba 1: viaje de agencia (otro proveedor)
Ficha propuesta: https://travelpuzzle.com.mx/viajes/peru/chullpas-de-sillustani-iwp-pe-t01-029 (Inca World).
1. En la ficha, enviar la solicitud con datos del PO (nombre «Prueba TP», tu correo). Anotar la referencia que muestra la confirmación.
2. Revisar que llegue el correo de Travel Puzzle de la solicitud.
3. En `/admin/solicitudes`, abrir esa solicitud → «Enlace de pago»: monto **10**, moneda **MXN**, tipo **anticipo**.
4. Revisar que llegue el correo con el enlace. Abrirlo a 390 px (celular): Stripe Checkout muestra «$10.00 MXN» y el título del viaje.
5. Pagar con tu tarjeta.
6. Verificar: Stripe → Pagos muestra el cobro en «Exitoso»; la solicitud en el gestor queda como pagada (webhook); llega el correo de pago recibido.
7. Reembolsar en Stripe (Pagos → el cobro → Reembolsar, total). Verificar en Stripe «Reembolsado».

## Prueba 2: viaje propio (Travel Puzzle)
Ficha: cualquier viaje propio publicado de `/sitemap-viajes.xml` o de /tours con proveedor Travel Puzzle. Mismos pasos 1–7, tipo **total**.

## Prueba 3 (opcional): en dólares
Repetir el paso 3 con monto **1**, moneda **USD**: el enlace debe cobrar en MXN = 1 × FIX de Banxico × 1.03, redondeado hacia arriba (REQ-115).

## Qué anotar (pegar en el tablero, REQ-1324)
| Prueba | Referencia | Correo de solicitud | Correo con enlace | Pago en Stripe | Solicitud pagada en gestor | Reembolso |
|---|---|---|---|---|---|---|
| 1 agencia | | | | | | |
| 2 propio | | | | | | |

Si un paso falla: no repetir el cobro; anotar el paso, la hora y la captura, y abrir INC-### con esos datos.
