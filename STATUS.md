# STATUS — travel-puzzle-web

Actualizado: 3 nov 2026.

## En producción (travelpuzzle.com.mx, Cloudflare Workers + D1)
- Catálogo de Freetour sincronizado a diario (~8,000 tours) y reseñas reales en caché (7 días, top 300 tours).
- Home con secciones rescatadas del sitio anterior, datos reales y prueba social (ver `docs/gates-home-2026-11.md`).
- /tours y página de cada tour con reseñas, etiqueta "Favorito de los viajeros" y frase destacada.
- Correos de acompañamiento (confirmación, recordatorios, cancelación, rechazo, post-tour) listos; **apagados** por bandera.
- Página privada de la reserva (/reserva/[token]).

## Banderas (wrangler.jsonc)
- `BOOKINGS_ENABLED=false` — hasta que Freetour habilite cancelar (hoy responde 403).
- `EMAILS_ENABLED=false`, `REVIEW_EMAILS_ENABLED=false`, `PAID_TOURS_ENABLED=false`.

## Pendientes
- Freetour (Elias): habilitar cancelación; dejar de mandar sus correos en modo 2; cancelar 2 reservas de prueba; nuevo webhook `https://travelpuzzle.com.mx/api/freetour/booking-rejected` (borrador listo).
- Página de reseña `/reserva/[token]/resena` (antes de encender los correos post-tour).
- Paso de reserva y página de modificar reserva con el estilo de los correos.
- Respaldar el sitio viejo de Vercel antes de darlo de baja.
- Fuera de alcance por ahora: mapa interactivo, Puzzle Rewards, ofertas, boletín, administrador de tours propios.
- Seguridad: rotar la contraseña de la API de Freetour; repo privado y límite de gasto en GitHub.
