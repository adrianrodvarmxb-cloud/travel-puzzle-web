# Gates: cuentas de cliente opcionales (11 nov 2026)

Referentes: GetYourGuide y Civitatis reservan sin cuenta; la cuenta es opcional y junta las reservas hechas con el mismo correo.

## Auditoría (main 4bdf8ff)
- Las reservas reales se guardan por correo (`FreetourBooking.email`, `TripRequest.email`), sin usuario: se pueden juntar sin migración.
- `/api/auth/signup` seguía activo con las cuentas apagadas: creaba cuentas con contraseña sin verificar el correo.
- La contraseña servía para cualquier cuenta. Con «Mis reservas» encendido, cualquiera podría registrar un correo ajeno y ver esas reservas.
- El aviso de privacidad no mencionaba cuentas ni el acceso con Google.

## Firmados por el PO (11 nov 2026)
- **A** Entrada: enlace al correo (15 min, un solo uso) + Google. Contraseña solo para el equipo.
- **B** Mis reservas: todo lo hecho con ese correo (free tours, tours de pago y solicitudes de viajes), incluso antes de crear la cuenta.
- **C** Invitación opcional «Guarda tus reservas en tu cuenta» en la página de la reserva y en el correo de confirmación.
- **D** Aviso de privacidad: se agrega la finalidad y los datos de Google, y se encienden las cuentas con su OK, sin esperar al abogado.
