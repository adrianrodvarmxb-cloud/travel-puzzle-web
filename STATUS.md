# STATUS — travel-puzzle-web

Actualizado: 3 nov 2026.

## En producción (travelpuzzle.com.mx, Cloudflare Workers + D1)
- Catálogo de Freetour sincronizado a diario (~8,000 tours) y reseñas reales en caché (7 días, top 300 tours).
- Home con secciones rescatadas del sitio anterior, datos reales y prueba social (ver `docs/gates-home-2026-11.md`).
- /tours y página de cada tour con reseñas, etiqueta "Favorito de los viajeros" y frase destacada.
- Diseño tecnológico en home y página del tour (header y footer sin cambios); mapa del mundo (OpenFreeMap + MapLibre) y mapa del punto de encuentro.
- /tours con el diseño tecnológico: buscador arriba, "Ordenar por" (más reseñas, mejor calificados, precio), filtros plegables en celular.
- Línea de comunicación (docs/linea-comunicacion.md): sin adjetivos inflados, lema registrado "Te armamos tu viaje".
- Vista previa al compartir (Open Graph) del sitio y de cada tour; ícono de Travel Puzzle (antes el de Vercel).
- Regla 60/40 (pago/gratis) en todas las recomendaciones; activa al encender `PAID_TOURS_ENABLED`.
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
- Siguiente frente propuesto: sección "Viajes en grupo" (viajes propios de Travel Puzzle; casos de clientes solo con permiso) y centro de Ayuda (Customer Journey de Claudia).
- Mapa en /tours ("Ver en mapa") para una fase siguiente.
- Al subir la versión de `maplibre-gl`, copiar su worker a `public/maplibre/` (lo vigila `src/components/map/maplibre.test.ts`).
- Fuera de alcance por ahora: Puzzle Rewards, ofertas, boletín, administrador de tours propios.
- Seguridad: rotar la contraseña de la API de Freetour; repo privado y límite de gasto en GitHub.
