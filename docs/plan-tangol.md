# Plan — API de Tangol (REQ-1540 a REQ-1548)

Petición del PO (11 nov 2026): implementar la API de Tangol con los protocolos del repo. Decisión previa (4 nov 2026): sin afiliados (no se enlaza a tangol.com); todo con cara Travel Puzzle.

## Condiciones de Tangol (correo de Hernán Garriga)
- Token: `POST /Tour/Autenticacion` con `{email, clave}`; la clave es el código de cliente de Travel Puzzle.
- Flujo: `GetTourCountries` → `GetTourDestinations` → `GetTourListByDestination`; precios con `GetTourRates`.
- Tarifas de la API comisionables al 20 % cuando Travel Puzzle cobra; pago a Tangol quincenal por transferencia a su cuenta en EE. UU.
- Reservas: `MakeBooking`, `CancelBooking`, `GetBookingDetails`, con `ModoTest` para probar sin reservas reales.

## Olas
| Ola | Alcance | Estado |
|---|---|---|
| 1 | Pasarela de Namecheap: `POST /tangol` con autenticación y 5 lecturas por la IP registrada. Sitio: cliente que solo habla con la pasarela, validación Zod, precio público, bandera `TANGOL_ENABLED=false`. Sin cambios visibles | Este PR |
| 2 | Sync diario: copia exacta en R2 privado + índice `ProviderRecord` (provider `tangol`), reclasificación con la taxonomía, alta en `Tour` con `providerId='tangol'` oculto | Gates aparte |
| 3 | Fichas y precios en /tours tras bandera; nunca se muestra `UrlTour`, neto ni comisión | Gates aparte |
| 4 | Reserva y cancelación (primero `ModoTest`), cobro con Stripe, conciliación quincenal | Gates aparte |

## Bloqueos antes de la ola 2
- REQ-1545: resuelto, por la pasarela de Namecheap (66.29.153.81).
- REQ-1546: significado de los códigos de idioma (0–4) y moneda (0–3), duración del token, IP a registrar, rotar la clave.
- REQ-1553: subir la pasarela y poner `TANGOL_EMAIL` y `TANGOL_CLAVE` en cPanel.

## Estructura nueva
```
gateway/lib/
  tangol.js             autenticación y llamadas por la IP registrada
  tangol-operations.js  lista cerrada de 5 lecturas
  tangol.test.js
src/tangol/
  api.ts            cliente del sitio (solo habla con la pasarela)
  api.test.ts
  lib/
    config.ts       bandera + pasarela → configuración o null
    config.test.ts
    schemas.ts      Zod; descarta registros malos y los cuenta
    rates.ts        resumen de tarifas, fechas disponibles, precio público
    rates.test.ts
docs/plan-tangol.md
```
Fuera del alcance: los métodos de estadios y partidos de fútbol del swagger.
