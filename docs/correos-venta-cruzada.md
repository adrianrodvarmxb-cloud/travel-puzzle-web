# Correos transaccionales y venta cruzada (pendiente 18 del PO, 6 nov 2026)

Inventario de todos los correos del repo (`origin/main` en c8f18e0) y dónde va el bloque de venta cruzada, tras
`EMAIL_CROSS_SELL_ENABLED="false"`. REQ-262…267. Lógica: `src/notifications/lib/cross-sell.ts`. Carga (I/O inyectado): `src/notifications/cross-sell.ts`.

## 1. Inventario

| # | Correo | A quién | Constructor | Lo dispara | Bandera de envío | ¿Bloque? | Motivo |
|---|---|---|---|---|---|---|---|
| 1 | Confirmación de reserva (free tour o de pago, Modo 2) | Cliente | `notifications/lib/booking-email.ts` | `api/freetour/booking` | `EMAILS_ENABLED` (true) | **Sí** | Reserva activa con ciudad y fecha |
| 2 | Recordatorio 48 h | Cliente | mismo, `variant: reminder48` | `api/cron/booking-emails` | `EMAILS_ENABLED` | **Sí** | Aún hay tiempo de pedir traslado o transporte |
| 3 | Recordatorio del día | Cliente | mismo, `variant: dayOf` | cron | `EMAILS_ENABLED` | **Sí** | Solo lo que coincide con ese día |
| 4 | Reserva modificada | Cliente | `notifications/lib/status-emails.ts` (`modified`) | `api/reserva/[token]/modificar` | `EMAILS_ENABLED` | **Sí** | La reserva sigue activa con la fecha nueva |
| 5 | Post-tour (pide la reseña) | Cliente | `notifications/lib/review-email.ts` | cron | `REVIEW_EMAILS_ENABLED` (**false**: hoy no se envía) | **Sí** (solo cuando se envíe) | El cliente puede seguir en la ciudad |
| 6 | Rechazo del proveedor | Cliente | `status-emails.ts` (`rejected`) | `api/freetour/booking-rejected` | `EMAILS_ENABLED` | **Nunca** | Regla del PO |
| 7 | Cancelación por el cliente | Cliente | `status-emails.ts` (`canceled`) | `api/reserva/[token]/cancelar` | `EMAILS_ENABLED` | **Nunca** | Regla del PO |
| 8 | Acuse de solicitud de cotización (viaje propio) | Cliente | `trips/lib/request-email.ts` (`buildRequestCustomerEmail`) | `trips/requests.ts` | siempre | No | Aún no hay viaje confirmado ni fecha cerrada |
| 9 | Nueva solicitud | Equipo | `request-email.ts` (`buildRequestTeamEmail`) | `trips/requests.ts` | siempre | No | Interno |
| 10 | Enlace de pago (Stripe) | Cliente | `payments/lib/email.ts` (`buildPaymentLinkEmail`) | `payments/service.ts` | `STRIPE_ENABLED` (false) | No | Pago pendiente: no se distrae del pago |
| 11 | Pago recibido | Cliente | `payments/lib/email.ts` (`buildPaidCustomerEmail`) | webhook de Stripe | `STRIPE_ENABLED` (false) | No por ahora | Propuesto para una ola siguiente: falta leer ciudad y fechas del viaje propio |
| 12 | Pago recibido | Equipo | `payments/lib/email.ts` (`buildPaidTeamEmail`) | webhook | `STRIPE_ENABLED` | No | Interno |
| 13 | Nueva reseña / dar seguimiento | Equipo | `notifications/lib/review-alert-email.ts` | `reviews/customer.ts` | reseñas de clientes | No | Interno |
| 14 | Cancelación por hacer a mano | Equipo | inline en `api/reserva/[token]/cancelar` | cancelación fallida en FREETOUR | — | No | Interno |
| 15 | Crea tu contraseña del gestor | Usuario del gestor | `trips/lib/password-email.ts` | `trips/password.ts` | — | No | Cuenta interna |
| — | Carrito («Arma tu viaje») | — | **No existe ningún correo de carrito.** El carrito solo se enlaza desde la confirmación (REQ-182, tras `ARMA_TU_VIAJE_ENABLED`) | — | — | — | — |

## 2. Qué lleva el bloque

- Solo productos que **no son de FREETOUR** (regla B3 de `cumplimiento-freetour`: un correo que promueve productos que no son de FREETOUR está permitido, sujeto a la LFPDPPP). Falla cerrada: un producto sin origen cuenta como FREETOUR y se descarta (REQ-081).
- Categorías permitidas: tour y excursión (solo viajes propios u otros proveedores), traslado, transporte y eSIM.
- Origen de cada tarjeta hoy:
  - Viajes propios publicados de la misma ciudad (o del mismo país) de tipo tour, única o transporte (Big Bus), con salida ese día.
  - El traslado de Kiwitaxi, si `/traslados` está publicado (`TRANSFERS_ENABLED`).
  - eSIM: **sin proveedor en producción**, así que no sale. Se agrega cuando haya un adaptador.
- Reglas del carrito (`companions/lib/carousel.ts` y `rules.json`): prioridades y ocultos por destino, una tarjeta por categoría y máximo 3 (como en celular).
- Diferencia con el carrusel de la ficha: el correo **no exige** que la primera tarjeta sea un tour (`requireTour: false`), porque ahí no puede haber tours de FREETOUR y casi nunca hay un tour propio en la misma ciudad.
- Enlaces solo al sitio de Travel Puzzle (`/viajes/…`, `/traslados`), con UTM `utm_source=travelpuzzle&utm_medium=email&utm_campaign=venta-cruzada-{correo}&utm_content={categoría}`.
- Sin descuentos: el precio sale tal cual del producto o no se muestra. Un precio convertido con tipo de cambio no se repite en el correo.

## 3. LFPDPPP

- El bloque es **informativo** y va solo dentro de correos que ya se envían. No hay envíos nuevos ni píxeles de rastreo.
- El aviso de privacidad (`legal/lib/privacidad.ts`) ya lista «Enviar publicidad relevante propia o de terceros» como **finalidad no necesaria**, con negativa por correo (asunto «No publicidad»). El bloque repite cómo negarse.
- La negativa se respeta con la variable `EMAIL_NO_PUBLICIDAD`: una lista de SHA-256 de correos en minúsculas, nunca en claro. **Sin la variable, el bloque no sale** (falla cerrada). Vacía significa que nadie se ha negado.
- La casilla de consentimiento de marketing del registro (REQ-084, `MARKETING_CONSENT_ENABLED`) es aparte y no se toca. Este bloque no la necesita porque no es una campaña de email (B2) y va dentro de un correo transaccional. Si el PO o el abogado deciden que sí la necesita, se encadena a esa casilla en su propio PR.

## 4. Para encender (un cambio a la vez)

1. Cargar `EMAIL_NO_PUBLICIDAD` (variable: candado del PO), aunque esté vacía.
2. PR que cambia `EMAIL_CROSS_SELL_ENABLED` a `"true"`, con preview, prueba de humo y una reserva de prueba que reciba el correo.
3. Después de publicar, revisar 3 correos reales (confirmación, 48 h y cambio) y que el rechazo y la cancelación lleguen sin bloque.
