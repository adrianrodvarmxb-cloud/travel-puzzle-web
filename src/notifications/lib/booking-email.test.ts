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
    expect(html).toContain("Armamos tu viaje");
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
