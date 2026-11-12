import { describe, it, expect } from "vitest";
import { buildBookingConfirmationEmail, meetingPointText, mapsUrlFor, daysUntil, calendarLinks } from "./booking-email";

const data = {
  lang: "es" as const,
  refNumber: "6782-20261030162746-244",
  firstName: "Ana",
  tourTitle: "Free Tour Centro Histórico",
  provider: "Mpika Tours",
  eventDate: "2026-10-31 08:00:00",
  duration: "2:30",
  tourLanguage: "French",
  adults: 2,
  children: 1,
  meetingPoint: "Zócalo, frente a la Catedral",
  manageUrl: "https://travelpuzzle.com.mx/reserva/abc",
  logoUrl: "https://travelpuzzle.com.mx/brand/logo-tp-oscuro.png",
  animatedLogoUrl: "https://travelpuzzle.com.mx/brand/logo-animado-tp-oscuro.gif",
  iconsBaseUrl: "https://travelpuzzle.com.mx/brand/social",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=19.43,-99.13",
  heroImageUrl: "https://www.freetour.com/images/tours/6782/hero.jpg",
  galleryUrls: ["https://www.freetour.com/images/tours/6782/a.jpg", "https://www.freetour.com/images/tours/6782/b.jpg"],
  reviews: [
    { name: "Lucía", rate: 5, text: "El guía fue increíble, aprendimos muchísimo." },
    { name: "Mark", rate: 4, text: "Great tour, very fun." },
  ],
  isFree: true,
  contact: {
    whatsapp: "525512345678",
    socials: [{ name: "Instagram", url: "https://instagram.com/travelpuzzle" }, { name: "Facebook", url: "https://facebook.com/travelpuzzle" }],
    assistantUrl: "https://travelpuzzle.com.mx/asistente",
  },
};

describe("correo de confirmación", () => {
  it("incluye todo lo que exige Freetour (Modo 2)", () => {
    const { subject, html, text } = buildBookingConfirmationEmail(data);
    expect(subject).toBe("Tu reserva está confirmada – Free Tour Centro Histórico");
    for (const s of ["6782-20261030162746-244", "Mpika Tours", "2:30", "Francés", "2 adultos, 1 niño", "Zócalo, frente a la Catedral", "https://travelpuzzle.com.mx/reserva/abc", "31 de octubre de 2026", "08:00"]) {
      expect(html).toContain(s);
      expect(text).toContain(s);
    }
    expect(html).toMatch(/cancelar/i);
    expect(html).toMatch(/cambiar/i);
  });

  it("en inglés para clientes del sitio en inglés", () => {
    const { subject, text } = buildBookingConfirmationEmail({ ...data, lang: "en", children: 0, adults: 1 });
    expect(subject).toBe("Your booking is confirmed – Free Tour Centro Histórico");
    expect(text).toContain("1 adult");
    expect(text).toContain("October 31, 2026");
  });

  it("escapa el HTML de datos que vienen de fuera", () => {
    const { html } = buildBookingConfirmationEmail({ ...data, firstName: "<script>x</script>", tourTitle: 'A & "B"' });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("A &amp; &quot;B&quot;");
  });

  it("si falta un dato opcional, lo omite sin romper", () => {
    const { html } = buildBookingConfirmationEmail({ ...data, meetingPoint: null, eventDate: null, provider: null });
    expect(html).not.toContain("null");
    expect(html).toContain("6782-20261030162746-244");
  });
});

describe("logo y cómo llegar", () => {
  it("logo fijo arriba y logo animado en el pie", () => {
    const { html } = buildBookingConfirmationEmail(data);
    const fixed = html.indexOf("logo-tp-oscuro.png"), animated = html.indexOf("logo-animado-tp-oscuro.gif");
    expect(fixed).toBeGreaterThan(-1);
    expect(animated).toBeGreaterThan(fixed);
    expect(html).toContain('alt="Travel Puzzle"');
  });
  it("redes con sus íconos oficiales, WhatsApp incluido", () => {
    const { html } = buildBookingConfirmationEmail(data);
    expect(html).toContain('src="https://travelpuzzle.com.mx/brand/social/instagram.png"');
    expect(html).toContain('src="https://travelpuzzle.com.mx/brand/social/facebook.png"');
    expect(html).toContain('src="https://travelpuzzle.com.mx/brand/social/whatsapp.png"');
    expect(html).not.toContain("tiktok.png");
  });
  it("cuenta regresiva, calificación y agregar al calendario", () => {
    const { html, text } = buildBookingConfirmationEmail({ ...data, now: new Date("2026-10-28T18:00:00Z"), rating: { value: 4.83, count: 120 } });
    expect(html).toContain("Faltan 3 días");
    expect(text).toContain("Faltan 3 días");
    expect(html).toContain("4.8");
    expect(html).toContain("120 reseñas");
    expect(html).toContain("calendar.google.com");
    expect(html).toContain("outlook.live.com");
  });
  it("recordatorios: mismo contenido con otro asunto y encabezado", () => {
    const r = buildBookingConfirmationEmail({ ...data, variant: "reminder48" });
    expect(r.subject).toBe("Tu tour es en 2 días – Free Tour Centro Histórico");
    expect(r.html).toContain("¡Ya casi es tu tour!");
    expect(r.html).toContain("6782-20261030162746-244");
    expect(r.html).toContain("https://travelpuzzle.com.mx/reserva/abc");
    expect(buildBookingConfirmationEmail({ ...data, variant: "dayOf" }).subject).toBe("Tu tour está por empezar – Free Tour Centro Histórico");
  });
  it("botón principal en rojo de marca", () => {
    expect(buildBookingConfirmationEmail(data).html).toContain("background:#C12909;color:#ffffff");
  });
  it("encabezado con logo, Mi reserva y Ayuda", () => {
    const { html } = buildBookingConfirmationEmail(data);
    expect(html).toContain(">Mi reserva</a>");
    expect(html).toContain(">Ayuda</a>");
  });
  it("pronóstico del clima con consejo y crédito, solo si hay datos", () => {
    const weather = { kind: "rain" as const, temp: 18, min: 14, max: 21, rainChance: 70 };
    const { html, text } = buildBookingConfirmationEmail({ ...data, weather });
    expect(html).toContain("18 °C");
    expect(html).toContain("· Lluvia");
    expect(html).toContain("Lluvia 70%");
    expect(html).toContain("Lleva paraguas o impermeable.");
    expect(html).toContain("MET Norway");
    expect(text).toContain("Pronóstico para tu tour");
    expect(buildBookingConfirmationEmail(data).html).not.toContain("MET Norway");
  });
  it("más planes en la ciudad, solo con foto segura", () => {
    const moreTours = [
      { title: "Tour de Coyoacán", url: "https://travelpuzzle.com.mx/tours/a", imageUrl: "https://www.freetour.com/x.jpg", rating: 4.9, isFree: true },
      { title: "Sin foto segura", url: "https://travelpuzzle.com.mx/tours/b", imageUrl: "http://inseguro.jpg" },
    ];
    const { html } = buildBookingConfirmationEmail({ ...data, cityName: "Ciudad de México", moreTours });
    expect(html).toContain("Más planes en Ciudad de México");
    expect(html).toContain("Tour de Coyoacán");
    expect(html).not.toContain("Sin foto segura");
    expect(buildBookingConfirmationEmail(data).html).not.toContain("Más planes");
  });
  it("incluye el botón Cómo llegar cuando hay mapa, y lo omite si no", () => {
    expect(buildBookingConfirmationEmail(data).html).toContain("Cómo llegar");
    expect(buildBookingConfirmationEmail({ ...data, mapsUrl: null }).html).not.toContain("Cómo llegar");
    expect(buildBookingConfirmationEmail(data).text).toContain("Cómo llegar: https://www.google.com/maps/search/?api=1&amp;query=19.43,-99.13".replace("&amp;", "&"));
  });
});

describe("diseño de alto impacto (manual de marca)", () => {
  it("usa los colores de la marca y la foto del tour", () => {
    const { html } = buildBookingConfirmationEmail(data);
    for (const c of ["#304A9F", "#008DFF", "#EAF54F"]) expect(html.toUpperCase()).toContain(c.toUpperCase());
    expect(html).toContain('src="https://www.freetour.com/images/tours/6782/hero.jpg"');
    expect(html).toContain("Poppins");
    expect(html).toContain("Te armamos tu viaje");
  });

  it("muestra galería y reseñas reales con estrellas", () => {
    const { html, text } = buildBookingConfirmationEmail(data);
    expect(html).toContain("tours/6782/a.jpg");
    expect(html).toContain("Lucía");
    expect(html).toContain("★★★★★");
    expect(html).toContain("★★★★☆");
    expect(text).toContain("El guía fue increíble");
  });

  it("sin fotos ni reseñas no deja huecos", () => {
    const { html } = buildBookingConfirmationEmail({ ...data, heroImageUrl: null, galleryUrls: [], reviews: [] });
    expect(html).not.toContain("tours/6782/hero.jpg");
    expect(html).not.toMatch(/otros viajeros/i);
  });

  it("en free tour recuerda la propina; en tour de pago no", () => {
    expect(buildBookingConfirmationEmail(data).html).toMatch(/propina/i);
    expect(buildBookingConfirmationEmail({ ...data, isFree: false }).html).not.toMatch(/propina/i);
  });
});

describe("contacto: WhatsApp, redes y asistente", () => {
  it("botón de WhatsApp directo con el número de reserva ya escrito", () => {
    const { html } = buildBookingConfirmationEmail(data);
    expect(html).toContain("https://wa.me/525512345678?text=");
    expect(html).toContain(encodeURIComponent("6782-20261030162746-244"));
  });
  it("redes sociales y asistente solo si están configurados", () => {
    const full = buildBookingConfirmationEmail(data).html;
    expect(full).toContain("https://instagram.com/travelpuzzle");
    expect(full).toContain("https://travelpuzzle.com.mx/asistente");
    const none = buildBookingConfirmationEmail({ ...data, contact: { socials: [] } }).html;
    expect(none).not.toContain("wa.me");
    expect(none).not.toMatch(/asistente/i);
  });
});

describe("daysUntil", () => {
  it("cuenta días de calendario y omite fechas pasadas", () => {
    const now = new Date("2026-10-30T23:00:00Z");
    expect(daysUntil("2026-10-30 08:00:00", now)).toBe(0);
    expect(daysUntil("2026-10-31 08:00:00", now)).toBe(1);
    expect(daysUntil("2026-10-29 08:00:00", now)).toBeNull();
    expect(daysUntil(null, now)).toBeNull();
  });
});

describe("calendarLinks", () => {
  it("usa la hora local del tour y la duración", () => {
    const c = calendarLinks({ title: "Tour", eventDate: "2026-11-02 10:00:00", duration: "2:30", location: "Zócalo", details: "ref" })!;
    expect(decodeURIComponent(c.google)).toContain("dates=20261102T100000/20261102T123000");
    expect(decodeURIComponent(c.outlook)).toContain("startdt=2026-11-02T10:00:00");
    expect(calendarLinks({ title: "x", eventDate: null, duration: null, location: null, details: "" })).toBeNull();
  });
});

describe("calendarLinks con hora UTC", () => {
  it("usa la hora UTC con Z para que el evento caiga a la hora correcta en cualquier zona", () => {
    const c = calendarLinks({ title: "Tour", eventDate: "2026-11-04 11:30:00", eventUtcDate: "2026-11-04 09:30:00", duration: "0:30", location: null, details: "x" })!;
    expect(decodeURIComponent(c.google)).toContain("dates=20261104T093000Z/20261104T100000Z");
    expect(decodeURIComponent(c.outlook)).toContain("startdt=2026-11-04T09:30:00Z");
  });
});

describe("mapsUrlFor", () => {
  it("arma el enlace de Google Maps con coordenadas y lugar", () => {
    expect(mapsUrlFor({ coordinates: "19.4326,-99.1332", googlePlaceId: "ChIJ1" })).toBe("https://www.google.com/maps/search/?api=1&query=19.4326%2C-99.1332&query_place_id=ChIJ1");
    expect(mapsUrlFor({ coordinates: "19.4,-99.1" })).toBe("https://www.google.com/maps/search/?api=1&query=19.4%2C-99.1");
    expect(mapsUrlFor({ title: "x" })).toBeNull();
    expect(mapsUrlFor(null)).toBeNull();
  });
});

describe("meetingPointText", () => {
  it("acepta título como texto o por idioma", () => {
    expect(meetingPointText({ title: "Zócalo" }, "es")).toBe("Zócalo");
    expect(meetingPointText({ title: { es: "Zócalo", en: "Main square" } }, "en")).toBe("Main square");
    expect(meetingPointText({ es: "Plaza" }, "es")).toBe("Plaza");
    expect(meetingPointText(null, "es")).toBeNull();
  });
});

// REQ-079: correos de Modo 2 (FREETOUR, guía PDF A2/A3): confirmación con los 9 datos,
// recordatorio, cancelación y rechazo.
describe("REQ-079 correos de Modo 2", () => {
  const nueve = {
    titulo: data.tourTitle,
    proveedor: data.provider,
    fecha: "31 de octubre de 2026, 08:00",
    duracion: data.duration,
    idioma: "Francés",
    adultosYNinos: "2 adultos, 1 niño",
    refNumber: data.refNumber,
    puntoDeEncuentro: data.meetingPoint,
    enlaceCancelacion: data.manageUrl,
  };

  it("REQ-079: la confirmación trae los 9 datos en HTML y en texto plano", () => {
    const { html, text } = buildBookingConfirmationEmail(data);
    expect(Object.keys(nueve)).toHaveLength(9);
    for (const [campo, valor] of Object.entries(nueve)) {
      expect(html, `HTML sin ${campo}`).toContain(valor);
      expect(text, `texto sin ${campo}`).toContain(valor);
    }
    // El enlace de cancelación se presenta como tal, no como URL suelta.
    expect(text).toContain("Ver, cambiar o cancelar mi reserva: https://travelpuzzle.com.mx/reserva/abc");
  });

  it("REQ-079: en inglés también trae los 9 datos", () => {
    const { text } = buildBookingConfirmationEmail({ ...data, lang: "en" });
    for (const v of [data.tourTitle, "Mpika Tours", "October 31, 2026, 08:00", "2:30", "French", "2 adults, 1 child", data.refNumber, data.meetingPoint, `View, change or cancel my booking: ${data.manageUrl}`]) {
      expect(text).toContain(v);
    }
  });

  it("REQ-079: los recordatorios (48 h y del día) repiten los 9 datos con otro asunto", () => {
    const confirmation = buildBookingConfirmationEmail(data).subject;
    for (const variant of ["reminder48", "dayOf"] as const) {
      const { subject, text } = buildBookingConfirmationEmail({ ...data, variant });
      expect(subject).not.toBe(confirmation);
      for (const v of Object.values(nueve)) expect(text).toContain(v);
    }
  });
});

describe("Correo de confirmación: «Arma el resto de tu viaje»", () => {
  it("REQ-182: con enlace al carrito, el correo lo ofrece sin promover tours (solo complementos; regla B3)", () => {
    const e = buildBookingConfirmationEmail({ ...data, cityName: "Ciudad de México", tripUrl: "https://travelpuzzle.com.mx/arma-tu-viaje?reserva=tok_abcdefgh123" });
    expect(e.html).toContain("https://travelpuzzle.com.mx/arma-tu-viaje?reserva=tok_abcdefgh123");
    expect(e.html).toContain("Arma el resto de tu viaje");
    expect(e.text).toContain("Arma el resto de tu viaje: https://travelpuzzle.com.mx/arma-tu-viaje?reserva=tok_abcdefgh123");
    const block = e.text.split("\n").filter((l) => l.includes("resto de tu viaje") || l.includes("eSIM"));
    expect(block.join(" ").toLowerCase()).not.toMatch(/tour|freetour/);
    const en = buildBookingConfirmationEmail({ ...data, lang: "en", tripUrl: "https://travelpuzzle.com.mx/arma-tu-viaje?reserva=tok_abcdefgh123" });
    expect(en.html).toContain("Build the rest of your trip");
  });

  it("REQ-182: sin enlace (bandera apagada) el correo no menciona el carrito", () => {
    const e = buildBookingConfirmationEmail({ ...data });
    expect(e.html).not.toContain("arma-tu-viaje");
    expect(e.html).not.toContain("Arma el resto de tu viaje");
    expect(buildBookingConfirmationEmail({ ...data, tripUrl: "javascript:alert(1)" }).html).not.toContain("javascript:");
  });
});

// REQ-800: A2 es OBLIGATORIO. Si el resumen del tour no llega (getTour falla o el dato viene vacío), la fila no
// desaparece: sale con «Por confirmar» y remite a la página de la reserva. Auditoría FREETOUR 6 nov 2026.
describe("REQ-800 los 9 campos de A2 aunque falte el dato", () => {
  const sinDatos = { ...data, provider: null, duration: null, tourLanguage: null, meetingPoint: null, eventDate: null };
  it("REQ-800: con proveedor, duración, idioma, fecha y punto de encuentro vacíos, las 9 filas siguen en HTML y texto", () => {
    for (const variant of ["confirmation", "reminder48", "dayOf"] as const) {
      const { html, text } = buildBookingConfirmationEmail({ ...sinDatos, variant });
      for (const label of ["Número de reserva", "Tour", "Organiza", "Fecha y hora", "Duración", "Idioma del tour", "Personas", "Punto de encuentro"]) {
        expect(text, `${variant}: texto sin «${label}»`).toContain(`${label}:`);
        expect(html, `${variant}: HTML sin «${label}»`).toContain(label);
      }
      expect(text).toContain("Ver, cambiar o cancelar mi reserva: https://travelpuzzle.com.mx/reserva/abc");
      expect(text).toMatch(/Duración: Por confirmar/);
      expect(text).toMatch(/Organiza: Un guía local/);
    }
  });
  it("REQ-800: en inglés también", () => {
    const { text } = buildBookingConfirmationEmail({ ...sinDatos, lang: "en" });
    for (const label of ["Booking number", "Tour", "Organized by", "Date and time", "Duration", "Tour language", "People", "Meeting point"]) expect(text).toContain(`${label}:`);
    expect(text).toContain("Duration: To be confirmed");
    expect(text).toContain("Organized by: A local guide");
  });
});

// REQ-801: el nombre del proveedor del correo nunca menciona FREETOUR (regla del PO; C3). Si lo menciona, «Un guía local».
describe("REQ-801 el correo no nombra a FREETOUR como proveedor", () => {
  it.each(["FREETOUR.com", "Freetour Lima", "free tour .com"])("REQ-801: proveedor «%s» → «Un guía local»", (provider) => {
    const { html, text, subject } = buildBookingConfirmationEmail({ ...data, provider });
    expect(text).toContain("Organiza: Un guía local");
    expect(`${subject}\n${text}`).not.toMatch(/freetour|free tour \.com/i);
    expect(html).not.toMatch(/>[^<]*(freetour|free tour \.com)[^<]*</i);
  });
});

// REQ-812 (D1, D3): la confirmación de un tour de pago no habla de propina y trae la política de cancelación de 24 h.
describe("REQ-812 confirmación de un tour de pago", () => {
  const paid = { ...data, isFree: false, paidPolicy: { cancel: "Cancelación gratis con reembolso de lo pagado hasta 24 h antes del tour, desde el enlace de tu correo de confirmación.", noShow: "Si cancelas con menos de 24 h o no te presentas, no hay reembolso." } };
  it("REQ-812: sin consejo de propina y con la política de 24 h, en HTML y texto", () => {
    const { html, text } = buildBookingConfirmationEmail(paid);
    expect(`${html}\n${text}`).not.toMatch(/propina/i);
    for (const s of [paid.paidPolicy.cancel, paid.paidPolicy.noShow]) { expect(text).toContain(s); expect(html).toContain(s); }
  });
  it("REQ-812: sigue con los 9 campos de A2", () => {
    const { text } = buildBookingConfirmationEmail(paid);
    for (const v of [data.tourTitle, "Mpika Tours", "2:30", "Francés", "2 adultos, 1 niño", data.refNumber, data.meetingPoint, data.manageUrl]) expect(text).toContain(v);
  });
});

describe("REQ-1596: invitación opcional a guardar las reservas en la cuenta", () => {
  it("REQ-1596: con accountUrl, el correo invita a guardar las reservas (html y texto)", () => {
    const { html, text } = buildBookingConfirmationEmail({ ...data, accountUrl: "https://travelpuzzle.com.mx/mi-cuenta/entrar" });
    expect(html).toContain("Guarda tus reservas en tu cuenta");
    expect(html).toContain('href="https://travelpuzzle.com.mx/mi-cuenta/entrar"');
    expect(text).toContain("Guarda tus reservas en tu cuenta: https://travelpuzzle.com.mx/mi-cuenta/entrar");
  });
  it("REQ-1596: sin accountUrl (cuentas apagadas), no aparece nada", () => {
    const { html, text } = buildBookingConfirmationEmail({ ...data });
    expect(html).not.toContain("Guarda tus reservas");
    expect(text).not.toContain("Guarda tus reservas");
  });
  it("REQ-1596: en inglés", () => {
    const { html } = buildBookingConfirmationEmail({ ...data, lang: "en", accountUrl: "https://travelpuzzle.com.mx/mi-cuenta/entrar" });
    expect(html).toContain("Keep your bookings in your account");
  });
});
