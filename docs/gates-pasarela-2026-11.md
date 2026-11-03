# Gates — Robustez de la pasarela (punto 16) · 3 nov 2026

Firmados por Adri (PO).

## Gate A — Reservas duplicadas
Investigación de referentes: Google Reservas (`idempotency_token` + `OVERLAPPING_RESERVATION`),
Prio (idempotencia en POST) y Stripe (llaves de 24 h).
**Decisión: las dos capas.**
1. Token por intento (lo crea el formulario), recordado 24 h en la pasarela: el mismo envío repetido devuelve la primera reserva.
2. Traslapes: si el correo ya tiene una reserva activa en ese horario, el sitio responde
   "Ya tienes una reserva para este horario. Revisa tu correo." (sin enlace, para no exponer la reserva).

## Gate B — IP de salida
**Decisión: la pasarela no arranca sin `FREETOUR_LOCAL_ADDRESS`** y dice qué falta.
Antes de subirla se confirma que la variable esté puesta en cPanel.

## Sin gate (técnico)
- Espera de 60 s tras un login fallido.
- `errorMessage` de Freetour en el registro, sin correos ni teléfonos.
- El sitio espera a la pasarela 35 s como máximo (504 claro).
- Aviso de rechazo que no se pudo confirmar con Freetour → 503 para que lo reintente.
