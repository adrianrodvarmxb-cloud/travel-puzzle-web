# Big Bus por Ventrata OCTO: plan por olas (REQ-3324 a REQ-3332)

Fuente técnica: docs.ventrata.com (Steps to Integrate, Authentication, Headers, Test Credentials, Bookings, Pricing, Reseller Connections), consultada el 12 nov 2026, y los tipos del estándar OCTO (`@octocloud/types` 3.0.0, solo como referencia; no se instaló).

## Lo que pide Ventrata
- Dirección `https://api.ventrata.com/octo`, `Authorization: Bearer <llave>` y `Octo-Capabilities` en toda llamada (aunque vaya vacía; sin ella responde 400).
- `Octo-Env: test` no consume lugares, el código de barras no sirve y no se factura.
- Mínimo para revendedores: productos, disponibilidad y reservas, más precios en el 100 % de lo que se vende. Muy recomendados: webhooks, preguntas y recogidas.
- Apartar al empezar el pago (no al agregar al carrito), confirmar después del cobro y cancelar por API los apartados que no se paguen.
- Cobrar al cliente el `retail`; el operador factura el `net`.
- Entregar solo el método de `deliveryMethods` (VOUCHER: un código; TICKET: uno por persona), en QR y PDF, con la `supplierReference` impresa debajo.
- Certificación:
  1. Reservas de prueba en EdinExplore, incluida una actualización y una cancelación.
  2. Certificado de certify.octo.travel.
  3. Voucher de muestra, logo 800×320 e ícono 400×400.
  4. Correo a connectivity@ventrata.com. Revisan en 1 a 2 días hábiles.
  5. Ya aprobados, Big Bus activa la conexión y da su llave.

## Lo que se rescata del desarrollo manual
- `imports/bigbus-2026.json`: 29 ciudades con textos en español, puntos clave y fotos. En la ola 2 se ligan a los productos de la API por ciudad.
- `src/taxonomy/data/mapping/bigbus.json`: la clasificación.
- `src/companions/registry.json` (`bigbus`, adaptador `request`): la venta cruzada transporte↔tours. En la ola 3 pasa de solicitud a compra directa cuando la bandera esté encendida.
- El cobro con Stripe ya existe (`src/payments`).
- Sin pasarela: Ventrata no pide IP registrada, así que el Worker llama directo. La llave va como secreto de Cloudflare.

## Olas
1. **Este PR:** cliente OCTO con bandera `BIGBUS_OCTO_ENABLED="false"`. Nadie lo llama todavía.
   - `src/octo/lib/config.ts`: configuración y cabeceras.
   - `src/octo/lib/schemas.ts`: validación con Zod.
   - `src/octo/lib/pricing.ts`: retail y net.
   - `src/octo/lib/booking-flow.ts`: apartado y entrega.
   - `src/octo/api.ts`: llamadas.
2. **Catálogo:** sincronización diaria de los productos de la API.
   - Se guarda copia exacta en R2 privado (regla del 6 nov).
   - Se ligan a las 29 ciudades.
   - Solo se publica lo que la API devuelve; eso resuelve REQ-1607 sin revisión a mano.
3. **Compra directa** (ficha → fechas y personas → apartar → Stripe → confirmar → correo con QR):
   - Cancelación en línea según el corte de cada opción.
   - Webhooks de cambios.
4. **Certificación y encendido:** REQ-3331, luego REQ-3329 en "test" y luego "live".

## Estado (12 nov 2026)
- Ola 1: PR #419.
- Olas 2 y 3: en código, con pruebas, tras la bandera (REQ-3413 a REQ-3423).
  - El plan del catálogo vive en D1 (`OctoCatalogPlan`), no en el archivo crudo (REQ-747).
  - La compra usa la solicitud (`TripRequest`, `kind: "compra"`) y el pago (`Payment`) de siempre, más `OctoBooking`.
  - El webhook de Stripe llama a la compra directa solo con la bandera encendida.
- Decisiones del PO pendientes:
  - REQ-3425: política de reembolso.
  - REQ-3433: copia exacta al archivo privado.
  - REQ-3434: monedas distintas de USD y EUR.
- Falta la revisión visual con la llave de prueba (REQ-3424) y la certificación (REQ-3331).

## Estructura de carpetas (nueva)
```
src/octo/
  api.ts                 cliente OCTO (I/O, fetch inyectado)
  api.test.ts
  lib/
    config.ts            bandera, llave, cabeceras
    schemas.ts           Zod y descarte de registros malos
    pricing.ts           retail al cliente, net interno, precio «desde»
    booking-flow.ts      apartado, liberar sin pago, voucher/tickets
    fixtures.ts          datos de muestra con forma OCTO (pruebas)
    catalog.ts           ola 2: ciudad de cada producto y plan sin net
    purchase.ts          ola 3: validar compra, salida y total
    ticket-email.ts      ola 3: boleto, aviso al equipo y cancelación
    public-view.ts       ola 3: lo que llega al navegador
    *.test.ts
  data/bigbus-ciudades.json  palabras de cada ciudad (29)
  catalog-sync.ts        ola 2: sincronización diaria (deps inyectadas)
  purchase.ts            ola 3: apartar → Stripe → confirmar → boleto; cancelar
  deps.ts                dependencias reales (Ventrata, D1, Prisma, Stripe, Resend)
src/components/trips/BigBusBuyBox.tsx   caja de compra en la ficha (solo con bandera)
src/app/api/bigbus/{opciones,compra,cancelar}/route.ts
src/app/api/cron/bigbus-sync/route.ts
migrations/0027_octo_booking.sql        OctoBooking y OctoCatalogPlan
docs/bigbus/
  autorizaciones.md      lo que Big Bus autorizó por escrito
  octo-integracion.md    este plan
```

## SOLID
- **SRP:** un archivo por responsabilidad.
- **OCP:** el cliente es OCTO genérico; otro operador de Ventrata solo necesita su propia función de configuración.
- **DIP:** `fetch` y la configuración entran por parámetro.
- **ISP:** cada función recibe solo los campos que usa.
