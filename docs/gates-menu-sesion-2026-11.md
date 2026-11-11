# Gates: menú con sesión y Panel de admin (11 nov 2026)

## Auditoría (main 80189a4)
- La reserva (`/reserva/[token]`) no crea cuenta ni sesión. El menú «Panel» se ve porque el PO tenía abierta su sesión ADMIN de `/admin/entrar`.
- «Panel» ya estaba limitado a rol ADMIN, pero sus 5 enlaces (`/dashboard/*`) no existen (restos del sitio de Vercel) → 404.
- Con sesión, el header cambiaba al menú viejo (Inicio · Experiencias · Mis Reservas · Traslados); `/bookings` y `/profile` no existen.
- Servidor protegido: `/api/admin/*` y `/admin/viajes|solicitudes` revisan ADMIN; reseñas y contraseña con enlace firmado.
- Hueco: «Entrar con Google» en `/admin/entrar` creaba cuenta CLIENT a cualquiera aunque `ACCOUNTS_ENABLED` esté apagado.
- El rol vivía solo en el JWT: quitar ADMIN no surtía efecto hasta que vencía la sesión.

## Gate A — FIRMADO por el PO (11 nov 2026)
Arreglo de los 4 puntos (REQ-1530…1533). Cuentas de cliente: «OK QUE FUNCIONE IGUAL» que GetYourGuide/Civitatis (REQ-1534, plan aparte). Merge: «OK PARA EL MERGE» (condicionado al blindaje de publicación).
