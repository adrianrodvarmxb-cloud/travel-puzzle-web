# Gates — Reseñas de clientes (punto 11) · 3 nov 2026

Firmados por el PO (Adri) en el chat, uno por uno.

1. **Destino:** se guardan en nuestra base (la API de Freetour solo lee reseñas). Las aprobadas se publican en la ficha del tour como "Cliente verificado de Travel Puzzle"; las de 1–3 ★ llegan como aviso "Dar seguimiento".
2. **Moderación:** ambos — botones Publicar/Ocultar en el aviso a info@ (abren una página de confirmación) y panel `/admin/resenas`. Sin cuentas: enlaces firmados con `CRON_SECRET` que vencen en 7 días.
3. **Autor:** nombre e inicial ("Ana G.") + fecha; el cliente acepta con una casilla que se publique así. Sin permiso no se puede publicar.

Datos: tabla `CustomerReview` (migración `0005`, nueva; no toca datos existentes). Una reseña por reserva; si el cliente la edita, vuelve a pendiente.
Correos post-tour siguen apagados (`REVIEW_EMAILS_ENABLED=false`).
