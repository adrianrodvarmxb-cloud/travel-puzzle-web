# Gates · Mila administra la relación con proveedores (PO, 7 nov 2026)

Solo para la Mila de Travel Puzzle; no toca el agente configurable de ZoeFel.

Petición literal (PO, 12:13): «hay que hacer una base de datos que pueda administrar igual Mila para saber cuál fue la última respuesta del proveedor. La idea es ir subiendo todos, o sea, los 200 […] Mila tiene que checar eso todos los días […] dar seguimiento a cada uno y los que vayan contestando, irlos dando de alta y establecer la comunicación […] mandar el correo para decir que ya va a estar encargada y mantener esa relación».

| Gate | Decisión firmada |
|---|---|
| P1 Correo | C: Mila escribe desde comercial@travelpuzzle.com.mx. Acceso por cPanel (reenvío para leer; envío con Resend), sin contraseña del buzón. |
| P2 Presentación | B: «Mila, del equipo de Travel Puzzle»; si le preguntan, dice que es IA. |
| P3 Aprobación | Sin aprobación por mensaje (reemplaza «A aprobar» de las 11:47): cada correo sale con copia a claulet@ y adrianrodvar@travelpuzzle.com.mx. Las plantillas se muestran al PO una vez antes de prender. |
| P4 Seguimiento | A: recordatorios a los 5 y 10 días hábiles; sin respuesta → «sin respuesta» y reintento a los 2 meses. |
| P5 Orden | A: primero los 7 publicados (Big Bus, Destino Colombia, Exotic Escapes, Extime/Paris City Vision, Fantástica China, Inca World, Turismo Asiático); luego el resto en tandas de 20 al día. |
| P7 Documentos | B (PO, 12:28): cada PDF/PPTX/Excel que manda un proveedor se guarda en cPanel, en una carpeta privada fuera de public_html, por proveedor y fecha; Mila sube con un token de API de cPanel que el PO carga como secreto en Cloudflare (nunca por chat). |
| P8 Plataformas | B (PO, 12:36): también entran al directorio las plataformas de hoteles y vuelos (Bedsonline, RIU Partner Club, Expedia TAAP, Booking.com, Aeroméxico Vacations); «entra todo». |
| P3b Primer correo | (PO, 12:57; reemplaza en parte P3 y P5) El primer correo a cada proveedor, incluidos los publicados, lo manda Adri con copia a Mila (comercial@), anunciando que ella llevará la gestión. Mila prepara el borrador; no lo envía. Mila sigue desde la respuesta. |
| P9 Integración | (PO, 12:57) Orden de preferencia en todo borrador y alta: 1) API; 2) plugin, widget u otra integración en la página; 3) portal B2B con usuario para Mila; 4) manual: disponibilidad por WhatsApp o correo (el primero disponible), con la persona exacta, tiempo estimado de respuesta, y todo queda en el directorio. |
| P10 Cobro | (PO, 12:57) Preferido: el proveedor cobra completo y nos paga comisión (p. ej. ligas de Stripe que reenviamos, como FREETOUR). Si cobramos nosotros: se pide la cuenta bancaria para depositarles. |
| P10b Cobro por tipo | (PO, 11 nov 2026 17:24, «A»; precisa P10) DMC con tarifa neta: cobra Travel Puzzle un solo pago y paga el neto (acuerdo de intermediación, REQ-1385). Plataformas (Civitatis, Viator, Travelpayouts, FREETOUR): cobran ellas y pagan comisión. REQ-1573. |
| P11 Cambio de tarifa | (PO, 11 nov 2026 17:39, «A» + comando) Lo confirma el PO, no Mila. Su confirmación detona un comando automático que contesta al proveedor, actualiza el anexo y el precio en la página. REQ-1574, REQ-1579. |
| P6 Confirmación de reservas | «ASAP»: pide confirmación de inmediato, recordatorio a las 4 h y aviso al PO a las 24 h (dentro de los 7 días de retención de Stripe). |

Fuera de alcance: FREETOUR (Partners API; nunca se le escribe ni se promueve por correo, skill cumplimiento-freetour B3). Boletines y aerolíneas (Viva, Doters, IPADE…) no son proveedores.
