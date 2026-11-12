# Gates — caché de páginas públicas en el borde (REQ-3318 a REQ-3320)

Contexto: medición en producción del 12 nov 2026 tras #381 y #386. Las páginas públicas salen con `private, no-store` por `force-dynamic` y el TTFB varía de 0.4 a 2.1 s (render en el Worker + D1), lo que deja el LCP móvil en ~3.6 s (REQ-1560 NO CUMPLIDO). La sesión se lee en el navegador (`useSession`) y el idioma va en la URL, así que el HTML de un visitante sin sesión es igual para todos.

| Gate | Decisión | Firmó | Fecha |
|---|---|---|---|
| A | Caché en el borde de Cloudflare: visitantes sin sesión reciben la página guardada; el Worker no corre en un acierto. (No ISR de Next en R2.) | PO (Adri) | 12 nov 2026 |
| B | La página guardada vale 5 minutos (`s-maxage=300`), con `stale-while-revalidate` para renovarla sin esperar. La reserva sigue consultando en vivo. | PO (Adri) | 12 nov 2026 |
| C | Entran todas las páginas públicas (home, /tours con filtros, fichas, destinos, blog y legales). Siempre fuera: `/admin`, `/api`, `/mi-cuenta`, `/reserva`, `/login` y cualquier visita con sesión. | PO (Adri) | 12 nov 2026 |
| D | Purga automática al publicar y al guardar un viaje en el gestor, con un token de Cloudflare solo de purga guardado como secreto (lo crea el PO con paso a paso). | PO (Adri) | 12 nov 2026 |
