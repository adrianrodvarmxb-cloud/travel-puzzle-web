// Puro · REQ-1294: las 4 plantillas aprobadas en docs/proveedores/plantillas-correo.md. Campos {…} sin dato no salen.
export type TipoCorreo = "presentacion" | "recordatorio" | "reintento" | "alta";
interface Plantilla { asunto: string; cuerpo: string }

const ES: Record<TipoCorreo, Plantilla> = {
  presentacion: {
    asunto: "Travel Puzzle · Les presento a Mila, quien coordinará nuestras reservas con {proveedor}",
    cuerpo: `Hola, {contacto}:
Hola:
Les saluda Adrián, de Travel Puzzle. Les presento a Mila, de nuestro equipo (en copia): a partir de hoy ella coordina con ustedes las reservas, la disponibilidad y el seguimiento de nuestros viajeros. Claudia y yo seguimos en copia.

Gracias por {ultimo_tema}.
Somos una agencia en línea de México (travelpuzzle.com.mx) para viajeros de habla hispana, y nos interesa sumar su operación en {destinos}.

Para integrar su producto a nuestra página, les pedimos en este orden:
{pedidos}

Mila les dará seguimiento desde comercial@travelpuzzle.com.mx.`,
  },
  recordatorio: {
    asunto: "Re: {asunto}",
    cuerpo: `Hola, {contacto}:
Hola:
Retomo mi correo del {fecha}. Cuando tengan un momento, nos ayudaría tener su respuesta.
{pendientes}

Si prefieren que lo veamos con otra persona de su equipo, indíquenme con quién.

Gracias,`,
  },
  reintento: {
    asunto: "Travel Puzzle · ¿Retomamos {tema}?",
    cuerpo: `Hola, {contacto}:
Hola:
Les escribimos hace un tiempo sobre {tema}. Seguimos interesados en trabajar con {proveedor} para {destinos}. Si les interesa, basta con responder este correo y retomamos.

Saludos,`,
  },
  alta: {
    asunto: "Re: {asunto} · Alta de {proveedor} en Travel Puzzle",
    cuerpo: `Hola, {contacto}:
Hola:
Muchas gracias. Ya dimos de alta a {proveedor} en nuestro sistema. Para empezar a recibir reservas, nos falta:
{pedidos}

Las reservas les llegarán de esta misma dirección, con nombre del viajero, fecha, servicio y número de personas.

Saludos,`,
  },
};

const EN: Record<TipoCorreo, Plantilla> = {
  presentacion: {
    asunto: "Travel Puzzle · Introducing Mila, who will coordinate our bookings with {proveedor}",
    cuerpo: `Hello {contacto},
Hello,
This is Adrián from Travel Puzzle. I would like to introduce Mila, from our team (in copy): from today she will coordinate bookings, availability and follow-up for our travelers with you. Claudia and I remain in copy.

Thank you for {ultimo_tema}.
We are an online travel agency in Mexico (travelpuzzle.com.mx) for Spanish-speaking travelers, and we would like to add your operation in {destinos}.

To integrate your product into our website, we ask in this order:
{pedidos}

Mila will follow up from comercial@travelpuzzle.com.mx.`,
  },
  recordatorio: { asunto: "Re: {asunto}", cuerpo: `Hello {contacto},\nHello,\nFollowing up on my email of {fecha}. When you have a moment, it would help us to have your reply.\n{pendientes}\nIf someone else on your team handles this, please let me know who.\n\nThank you,` },
  reintento: { asunto: "Travel Puzzle · Shall we pick up {tema}?", cuerpo: `Hello {contacto},\nHello,\nWe wrote some time ago about {tema}. We are still interested in working with {proveedor} for {destinos}. If you are interested, just reply to this email and we will pick it up.\n\nBest regards,` },
  alta: { asunto: "Re: {asunto} · {proveedor} set up at Travel Puzzle", cuerpo: `Hello {contacto},\nHello,\nThank you. {proveedor} is now set up in our system. To start sending bookings we still need:\n{pedidos}\n\nBookings will come from this same address with traveler name, date, service and number of people.\n\nBest regards,` },
};

// REQ-1294: el saludo con nombre si lo hay; si no, el genérico (nunca los dos).
export function plantilla(tipo: TipoCorreo, idioma: "es" | "en", datos: Record<string, string | undefined>): Plantilla {
  const p = (idioma === "en" ? EN : ES)[tipo];
  const [conNombre, sinNombre, ...resto] = p.cuerpo.split("\n");
  const saludo = (datos.contacto ?? "").trim() ? conNombre : sinNombre;
  // En la presentación: «gracias por…» solo si ya hay relación; «somos una agencia…» solo si no.
  const lineas = resto.filter((l) => !(tipo === "presentacion" && (datos.ultimo_tema ? /^(Somos una agencia|We are an online)/.test(l) : /^(Gracias por|Thank you for)/.test(l))));
  return { asunto: p.asunto, cuerpo: [saludo, ...lineas].join("\n") };
}
