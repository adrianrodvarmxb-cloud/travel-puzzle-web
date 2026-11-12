import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { checkAdultContact, isAdultContactCheckEnabled } from "./lib/adult-contact";

describe("REQ-3310: casilla «soy mayor de edad» encendida en producción (REQ-083)", () => {
  const wrangler = readFileSync("wrangler.jsonc", "utf8");

  it("REQ-3310: wrangler.jsonc enciende ADULT_CONTACT_CHECK_ENABLED con \"true\" exacto", () => {
    const valor = wrangler.match(/"ADULT_CONTACT_CHECK_ENABLED":\s*"([^"]*)"/)?.[1];
    expect(valor).toBe("true");
    expect(isAdultContactCheckEnabled(valor)).toBe(true);
  });

  it("REQ-3310: encendida, la reserva sin la casilla se rechaza y con la casilla pasa", () => {
    const requerida = isAdultContactCheckEnabled(wrangler.match(/"ADULT_CONTACT_CHECK_ENABLED":\s*"([^"]*)"/)?.[1]);
    expect(checkAdultContact(undefined, requerida)).toEqual({ ok: false, code: "adult_required" });
    expect(checkAdultContact(true, requerida)).toEqual({ ok: true });
  });

  it("REQ-3310: el único cliente del endpoint de reserva manda la declaración cuando la bandera está encendida", () => {
    const form = readFileSync("src/components/events/Contexts/BookingFormContext.tsx", "utf8");
    expect(form).toMatch(/fetch\('\/api\/freetour\/booking'/);
    expect(form).toMatch(/adultContactCheck && \{ contactIsAdult \}/);
  });
});
