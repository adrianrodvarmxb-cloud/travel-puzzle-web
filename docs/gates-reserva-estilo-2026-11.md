# Gates — Paso de reserva y Modificar reserva (punto 12) · 3 nov 2026

Firmados por el PO (Adri).

1. **Alcance A y B:** (A) `/events/[id]` con el lenguaje de los correos (marco, pase tipo boarding pass, secciones 01 Personas · 02 Tus datos · 03 Confirmar, soporte por WhatsApp); misma lógica de reserva. (B) `/reserva/[token]/modificar`: otro horario del mismo tour o personas, con `GET /event/{id}/{ref}` y `POST /booking/edit`, correo "modificada".
2. **Interruptor:** `EDIT_ENABLED="false"` hasta que Freetour dé el permiso de editar; además se exige `canBeEdited` de Freetour. Mientras tanto, "Mi reserva" muestra "Cambiar fecha por WhatsApp".
3. Sus documentos "Página Web Travel Puzzle" y "Journey Customer" se reparten: formularios de tours propios, thank you page y pago/cotización → punto 17; Garantías → 9; APIs de transporte y Booking → 19; growth/SEO → 18 y 20.
