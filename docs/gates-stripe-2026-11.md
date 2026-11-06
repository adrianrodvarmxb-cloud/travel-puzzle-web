# Gates — Stripe ola 1 (5 nov 2026, firmados por el PO en chat)

Cuenta Stripe "Travel Puzzle México" creada y activada (5 nov 2026). Productos: solo **Payments** (sin Connect, sin Tax: Stripe Tax no genera CFDI).

- A · Alcance: la ola 1 cobra solo las **solicitudes** (Inca World, viajes propios y de agencias) con enlace de pago enviado desde `/admin/solicitudes`, después de confirmar lugar. Tours de pago de Freetour (depende de Elias) y BeMyGuest quedan para la ola 2.
- B · B1: se cobra siempre en **pesos (MXN)** y solo con **tarjeta**. Montos en USD/EUR se convierten con el FIX de Banxico + **colchón de 3%** (configurable con `STRIPE_FX_CUSHION_PCT`). Al proveedor se le paga en su moneda desde el banco, fuera de Stripe. OXXO queda para después.
- C · C1: el enlace vence en **24 horas** (máximo de Stripe Checkout). Botón "Reenviar enlace": genera uno nuevo con el precio del día y vence el anterior.

Todo tras `STRIPE_ENABLED` (solo "true" enciende). Llaves en secretos de Cloudflare (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`), nunca en el repo. Encender = PR propio, preview con la bandera encendida en modo prueba, OK del PO.

## Decisión del PO (6 nov 2026)
- Se integra **directo con llaves reales** (sin preview en modo prueba). La prueba de punta a punta es **un cobro real de $10.00 MXN** (mínimo de Stripe en MXN y mínimo del código, `MIN_CENTAVOS`) a una solicitud de prueba propia, que se **reembolsa** desde el dashboard de Stripe.
- Llaves y secretos nunca en el chat ni en el repo: el PO los carga en Cloudflare (Workers → travel-puzzle-web → Settings → Variables and Secrets). El deploy (REQ-155) los hereda en cada versión: no están en `SECRETOS_DE_GITHUB`.
- Webhook: `https://travelpuzzle.com.mx/api/stripe/webhook`, eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`.

## Revisión del 6 nov 2026 (al poner el PR #99 al día con main)
- REQ-114 ya era de main (idiomas de salidas, PR #101): el enlace de pago se renumeró a **REQ-159**. REQ-115…119 no cambian.
- Migración: en producción ya están 0001–0012, 0014 y 0015 (logs de «Publicar en Cloudflare» con migraciones). **0016 también está pendiente**: `migrations apply` aplica todas las pendientes, así que 0013 debe ir en un deploy en el que 0016 ya esté aplicada (G3, su propio deploy) o el PO acepta las dos juntas.
- Reembolso: la ola 1 no escucha `charge.refunded`; el reembolso se hace en Stripe y el panel sigue diciendo «Pagado». Se registra a mano (estado «Cerrada») hasta una ola 2.
- `success_url` regresa al home (`/?pago=recibido&ref=…`) sin mensaje de confirmación: el cliente se entera por el correo de Stripe y el nuestro.
