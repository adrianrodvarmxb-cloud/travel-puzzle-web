# Plantillas de correo de Mila a proveedores (para aprobación del PO)

Reglas de todas (gates P1–P4): salen de comercial@travelpuzzle.com.mx, con copia a claulet@ y adrianrodvar@travelpuzzle.com.mx; firma «Mila, del equipo de Travel Puzzle»; si preguntan, Mila dice que es IA. Sin emojis, sin promesas de volumen, sin datos de clientes. Nunca se mandan a FREETOUR. Español a proveedores hispanos; inglés al resto. Lo que va entre {llaves} lo llena el sistema con datos reales; si falta un dato, esa línea no sale.

---

## 1. Presentación (primer correo de Mila a cada proveedor)

**Asunto:** Travel Puzzle · A partir de hoy coordino nuestras reservas con {proveedor}

Hola, {nombre del contacto}:

Soy Mila, del equipo de Travel Puzzle. A partir de hoy coordino con ustedes las reservas, la disponibilidad y el seguimiento de nuestros viajeros, siempre con Claudia y Adrián en copia.

{Si ya trabajamos juntos:} Gracias por {último tema: «el tarifario 2027», «la confirmación de los circuitos»}. Ya está registrado en nuestro sistema.
{Si aún no:} Somos una agencia en línea de México (travelpuzzle.com.mx) para viajeros de habla hispana, y nos interesa sumar su operación en {destino}.

Para dejar todo listo, ¿me ayudan con lo siguiente?
1. ¿Cuál es el canal preferido para reservar: portal de agencias, API o correo?
2. Correo y teléfono de reservas y de emergencias.
3. Tarifario vigente y condiciones de pago y cancelación.

Quedo atenta.

Mila
Del equipo de Travel Puzzle
comercial@travelpuzzle.com.mx · +52 55 3649 0320 · travelpuzzle.com.mx

**EN · Subject:** Travel Puzzle · I will be coordinating our bookings with {supplier} from now on

Hello {contact name},

I'm Mila, from the Travel Puzzle team. From today I will coordinate bookings, availability and follow-up for our travelers with you, always with Claudia and Adrián in copy.

To get everything ready, could you help us with:
1. Your preferred booking channel: agent portal, API or email?
2. Reservations and emergency email and phone.
3. Current rates and payment and cancellation terms.

Kind regards,
Mila
Travel Puzzle team

---

## 2. Recordatorio (a los 5 y a los 10 días hábiles sin respuesta)

**Asunto:** Re: {asunto original}

Hola, {nombre del contacto}:

Retomo mi correo del {fecha}. Cuando tengan un momento, nos ayudaría saber {lo pendiente, en una línea}.

Si prefieren que lo veamos con otra persona de su equipo, indíquenme con quién.

Gracias,
Mila
Del equipo de Travel Puzzle

**EN:** Hello {contact name}, following up on my email of {date}. When you have a moment, it would help us to know {pending item}. If someone else on your team handles this, please let me know who. Thank you, Mila · Travel Puzzle team

---

## 3. Reintento (a los 2 meses de «sin respuesta»)

**Asunto:** Travel Puzzle · ¿Retomamos {tema}?

Hola, {nombre del contacto}:

Les escribimos hace un tiempo sobre {tema}. Seguimos interesados en trabajar con {proveedor} para {destino}. Si les interesa, basta con responder este correo y retomamos.

Saludos,
Mila
Del equipo de Travel Puzzle

**EN:** Hello {contact name}, we wrote some time ago about {topic}. We are still interested in working with {supplier} for {destination}. If you are interested, just reply to this email and we will pick it up. Best regards, Mila · Travel Puzzle team

---

## 4. Alta (cuando el proveedor acepta)

**Asunto:** Re: {asunto} · Alta de {proveedor} en Travel Puzzle

Hola, {nombre del contacto}:

Muchas gracias. Ya dimos de alta a {proveedor} en nuestro sistema. Para empezar a recibir reservas, nos falta:
{solo lo que falte, uno por línea:}
- Usuario de agencia en su portal para comercial@travelpuzzle.com.mx.
- Documentación y ambiente de prueba de su API.
- Tarifario {año} y condiciones de cancelación.
- Fotos autorizadas y el crédito que debemos poner.

Las reservas les llegarán de esta misma dirección, con nombre del viajero, fecha, servicio y número de personas.

Saludos,
Mila
Del equipo de Travel Puzzle

**EN:** Hello {contact name}, thank you. {Supplier} is now set up in our system. To start sending bookings we still need: {missing items}. Bookings will come from this same address with traveler name, date, service and number of people. Best regards, Mila · Travel Puzzle team

---

## Cambios del 11 nov 2026 (REQ-1665, REQ-1666, REQ-1669, REQ-1670)
- La presentación a los 7 publicados la manda Adrián como respuesta en el hilo que ya existe («Re: <asunto>»), no como correo nuevo.
- Los pedidos salen de la lista de alta en 8 grupos (`src/proveedores/lib/checklist.ts`) y solo se pide lo que falta.
  - DMC: integración, tarifario neto por temporada con suplementos, condiciones de pago y datos bancarios (Travel Puzzle cobra y paga el neto), cancelación, contacto 24/7, datos legales y seguro, firma del acuerdo, fotos y crédito, datos del viajero.
  - Plataforma: integración, cómo cobran y qué comisión pagan, cancelación, soporte para agencias, términos para agencias, contenido y datos del viajero.
- El recordatorio agrega «Lo que nos falta:» con la lista; si ya no falta nada, esa línea no sale.
- Mila no escribe si hay borrador sin enviar, acuerdo en negociación, folio abierto de la revisión cada 6 h o si el hilo no le llegó con copia a comercial@.
