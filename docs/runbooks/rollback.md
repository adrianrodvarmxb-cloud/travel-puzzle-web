# Regresar el sitio a la versión anterior (a mano) — REQ-222

Úsalo si travelpuzzle.com.mx muestra un error y el regreso automático del deploy no lo arregló
(el workflow «Publicar en Cloudflare» ya corre la prueba de humo en producción y hace `wrangler rollback` solo si falla).

## Opción A — Desde Cloudflare (2 minutos, sin código)
1. Entra a dash.cloudflare.com → **Workers & Pages** → **travel-puzzle-web**.
2. Abre la pestaña **Deployments**.
3. Busca la versión anterior a la que falló (la fecha y el mensaje «deploy <commit>» te dicen cuál es).
   Ojo: las versiones de los PR (alias `pr-###`) nunca tuvieron tráfico; no regreses a una de ellas.
4. En sus tres puntos (⋯) elige **Rollback** y confirma. La versión regresa con sus propios secretos (REQ-155).
5. Abre travelpuzzle.com.mx en el celular en modo incógnito: deben cargar el inicio y /tours.
6. Si tienes el repo a la mano, confírmalo con la prueba de humo: `npx tsx src/scripts/smoke.ts https://travelpuzzle.com.mx`.

## Opción B — Desde GitHub (si hay que quitar el cambio del código)
1. En github.com/adrianrodvarmxb-cloud/travel-puzzle-web → **Pull requests** → **Closed**, abre el PR que causó la falla.
2. Botón **Revert** → se crea un PR nuevo. Espera su prueba de humo en verde y haz **Merge** (el merge publica).
3. El deploy corre solo, con su prueba de humo antes y después de publicar. Espera a que termine en verde (pestaña **Actions**).
4. Nunca `git push --force` ni push directo a `main`: el revert va siempre por PR.

## Después de regresar
- Avisa a Claude con la hora y una captura; se abre `docs/incidentes/INC-###.md`.
- Para ver el error exacto: Cloudflare → travel-puzzle-web → **Logs** (Observability) → busca `client-error`
  (errores del navegador con ruta, stack y origen, REQ-221).
- Las banderas (BOOKINGS_ENABLED, TRANSPORT_ENABLED, etc.) se apagan con un PR que cambie `wrangler.jsonc`;
  nunca editando variables a mano en Cloudflare, porque el siguiente deploy las pisa.
- Si el deploy tenía migración de D1: el rollback del Worker NO regresa la base. Pide el plan antes de tocarla (candado).
