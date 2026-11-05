# Gates — Stripe ola 1 (5 nov 2026, firmados por el PO en chat)

Cuenta Stripe "Travel Puzzle México" creada y activada (5 nov 2026). Productos: solo **Payments** (sin Connect, sin Tax: Stripe Tax no genera CFDI).

- A · Alcance: la ola 1 cobra solo las **solicitudes** (Inca World, viajes propios y de agencias) con enlace de pago enviado desde `/admin/solicitudes`, después de confirmar lugar. Tours de pago de Freetour (depende de Elias) y BeMyGuest quedan para la ola 2.
- B · B1: se cobra siempre en **pesos (MXN)** y solo con **tarjeta**. Montos en USD/EUR se convierten con el FIX de Banxico + **colchón de 3%** (configurable con `STRIPE_FX_CUSHION_PCT`). Al proveedor se le paga en su moneda desde el banco, fuera de Stripe. OXXO queda para después.
- C · C1: el enlace vence en **24 horas** (máximo de Stripe Checkout). Botón "Reenviar enlace": genera uno nuevo con el precio del día y vence el anterior.

Todo tras `STRIPE_ENABLED` (solo "true" enciende). Llaves en secretos de Cloudflare (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`), nunca en el repo. Encender = PR propio, preview con la bandera encendida en modo prueba, OK del PO.
