# Regresar el sitio a la versión anterior (a mano)

Úsalo si travelpuzzle.com.mx muestra un error y el rollback automático del deploy no lo arregló.

## Opción A — Desde Cloudflare (2 minutos, sin código)
1. Entra a dash.cloudflare.com → **Workers & Pages** → **travel-puzzle-web**.
2. Abre la pestaña **Deployments**.
3. Busca la versión anterior a la que falló (la fecha y el mensaje "deploy <commit>" te dicen cuál es).
4. En sus tres puntos (⋯) elige **Rollback** y confirma.
5. Abre travelpuzzle.com.mx en el celular en modo incógnito: debe cargar el inicio y /tours.

## Opción B — Desde GitHub (si hay que quitar el cambio del código)
1. En github.com/adrianrodvarmxb-cloud/travel-puzzle-web → **Pull requests** → **Closed**, abre el PR que causó la falla.
2. Botón **Revert** → se crea un PR nuevo → **Merge**.
3. El deploy corre solo, con su prueba de humo. Espera a que termine en verde (pestaña **Actions**).

## Después de regresar
- Avisa a Claude con la hora y una captura; se abre `docs/incidentes/INC-###.md`.
- Para ver el error exacto: Cloudflare → travel-puzzle-web → **Logs** → busca `client-error`.
- Las banderas (BOOKINGS_ENABLED, TRANSPORT_ENABLED, etc.) se apagan con un PR que cambie `wrangler.jsonc`; nunca editando variables a mano en Cloudflare, porque el siguiente deploy las pisa.
