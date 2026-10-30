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
