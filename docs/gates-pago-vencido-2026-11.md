# Gate — sesión de pago vencida (tours de pago de FREETOUR)

Pedido del PO (6 nov 2026, 22:36): «Termina». Faltante a) de la auditoría (#212): regenerar el enlace si el cliente vuelve; si no se paga, cancelar en FREETOUR y avisar por correo.

| Decisión | Valor propuesto | Dónde | Firma del PO |
|---|---|---|---|
| Gracia tras `expiresAt` en la que «Pagar» genera un enlace nuevo (REQ-931) | 60 minutos, y nunca después de la hora del tour | `PAYMENT_GRACE_MS` en `src/booking/lib/payment-state.ts` | PENDIENTE |
| Pasada la gracia: última consulta GET /payment y, sin pago, POST /booking/cancel con refNumber, eventId, adults y children + correo «pago vencido» (REQ-932) | Automático por el cron de pagos (cada 10 min) | `expirePayment` en `src/booking/payment.ts` | PENDIENTE |
| Estado de pago dudoso (60/62/64) o FREETOUR no acepta cancelar | Pasa al equipo por correo (REQ-017), sin cancelar a ciegas | `expirePayment` | PENDIENTE |

Todo queda tras `PAID_TOURS_ENABLED=false`. Para cambiar la gracia basta cambiar la constante y su test (REQ-931).
