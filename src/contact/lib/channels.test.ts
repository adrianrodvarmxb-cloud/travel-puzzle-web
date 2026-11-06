import { describe, expect, it } from "vitest";
import { contactChannels, displayPhone } from "./channels";

describe("canales de contacto", () => {
  it("REQ-246: el WhatsApp oficial se muestra como +52 1 55 3649 0320 (calculado en el servidor, sin Intl)", () => {
    expect(displayPhone("525536490320")).toBe("+52 1 55 3649 0320");
    expect(displayPhone("526181234567")).toBe("+52 1 618 123 4567");
    expect(displayPhone("14155550100")).toBe("+14155550100");
  });

  it("REQ-246: arma WhatsApp con texto prellenado y correo con asunto, desde las variables", () => {
    const c = contactChannels({ WHATSAPP_NUMBER: "525536490320", EMAIL_REPLY_TO: "info@travelpuzzle.com.mx" }, "Hola Travel Puzzle", "Contacto desde el sitio");
    expect(c.whatsapp).toEqual({ digits: "525536490320", display: "+52 1 55 3649 0320", href: "https://wa.me/525536490320?text=Hola%20Travel%20Puzzle" });
    expect(c.email).toEqual({ address: "info@travelpuzzle.com.mx", href: "mailto:info@travelpuzzle.com.mx?subject=Contacto%20desde%20el%20sitio" });
  });

  it("REQ-246: un valor inválido se descarta y no rompe la página", () => {
    const c = contactChannels({ WHATSAPP_NUMBER: "55-36", EMAIL_REPLY_TO: "no es correo" }, "x", "y");
    expect(c.whatsapp).toBeNull();
    expect(c.email).toBeNull();
  });

  it("REQ-246: no hay enlace tel: (el número es de WhatsApp; llamadas por confirmar)", () => {
    const c = contactChannels({ WHATSAPP_NUMBER: "525536490320" }, "x", "y");
    expect(JSON.stringify(c)).not.toMatch(/tel:/);
  });
});
