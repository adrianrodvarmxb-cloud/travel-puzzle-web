# Pasarela de reservas (Namecheap)

Freetour solo acepta reservas desde la IP registrada del servidor de Namecheap.
El sitio (Cloudflare) firma cada petición y la manda aquí; la pasarela la valida
y la reenvía a Freetour. Solo permite 7 operaciones: crear, consultar, cancelar y
cambiar reserva, ver el evento para un cambio, crear pago y ver estado del pago.

## Seguridad
- Firma HMAC-SHA256 con `GATEWAY_SECRET` (el mismo en cPanel y en el sitio); vence en 5 minutos.
- Lista cerrada de operaciones con validación de datos; nada más pasa.
- El registro no guarda nombre, correo ni teléfono del cliente.
- Sin dependencias externas (solo Node).

## Robustez (nov 2026)
- **No arranca sin `FREETOUR_LOCAL_ADDRESS`** (debe ser una IP): sin ella Freetour rechaza sin avisar claro.
- **Sin reservas duplicadas:** el formulario manda un token por intento; la misma reserva repetida en 24 h
  (doble clic, reintento tras un error) recibe la primera respuesta sin volver a llamar a Freetour.
  Vive en memoria: si la app se reinicia se olvida, y entonces el sitio bloquea los traslapes
  (mismo correo y mismo horario con reserva activa).
- **Login con espera:** tras un login fallido espera 60 s antes de reintentar (evita bloqueos de la cuenta).
- **Registro con `errorMessage`** de Freetour, sin correos ni teléfonos.

## Activar en cPanel (una sola vez)
1. Subir la carpeta `gateway/` a `~/pasarela` en el servidor.
2. cPanel → **Setup Node.js App** → **Create Application**:
   - Node.js: 18 o más · Application root: `pasarela` · Application URL: `pasarela.travelpuzzle.com.mx` (subdominio que apunta al servidor; travelpuzzle.com.mx apunta a Vercel) · Startup file: `server.js`
3. Variables de entorno de la app: `GATEWAY_SECRET`, `FREETOUR_EMAIL`, `FREETOUR_PASSWORD`
   y `FREETOUR_LOCAL_ADDRESS=66.29.153.81` (obligatoria); opcional `FREETOUR_BASE_URL`.
4. **Start**. Probar: `https://pasarela.travelpuzzle.com.mx/health` → `{"ok":true}`.
5. En el sitio: `GATEWAY_URL=https://pasarela.travelpuzzle.com.mx` (en wrangler.jsonc) y el mismo `GATEWAY_SECRET`.

## Pruebas
`npx vitest run gateway` (desde la raíz del repo).

Prueba contra Freetour desde cPanel (Run JS script): `npm run prueba` (consulta) o
`npm run prueba-completa` (reserva y cancela; usa `PRUEBA_EMAIL`, nunca un cliente real).
