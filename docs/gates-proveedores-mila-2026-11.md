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
| P6 Confirmación de reservas | «ASAP»: pide confirmación de inmediato, recordatorio a las 4 h y aviso al PO a las 24 h (dentro de los 7 días de retención de Stripe). |

Fuera de alcance: FREETOUR (Partners API; nunca se le escribe ni se promueve por correo, skill cumplimiento-freetour B3). Boletines y aerolíneas (Viva, Doters, IPADE…) no son proveedores.
