import { describe, it, expect } from "vitest";
import { buildBookingConfirmationEmail, meetingPointText, mapsUrlFor } from "./booking-email";

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
  logoUrl: "https://travelpuzzle.com.mx/brand/logo-animado-tp.gif",
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
  it("muestra el logo animado en el encabezado con texto alternativo", () => {
    const { html } = buildBookingConfirmationEmail(data);
    expect(html).toContain('src="https://travelpuzzle.com.mx/brand/logo-animado-tp.gif"');
    expect(html).toContain('alt="Travel Puzzle"');
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
