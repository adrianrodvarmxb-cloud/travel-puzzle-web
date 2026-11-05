import { describe, it, expect } from "vitest";
import { checkNoFreetourEmails, RELEASE_CHECKLIST, senderDomain } from "./release-email-check";

describe("REQ-080 FREETOUR no manda correos propios", () => {
  it("REQ-080: solo correos de Travel Puzzle = pasa", () => {
    const r = checkNoFreetourEmails([
      { from: "Travel Puzzle <reservas@travelpuzzle.com.mx>", subject: "Tu reserva está confirmada" },
      { from: "reservas@travelpuzzle.com.mx", subject: "Tu reserva quedó cancelada" },
    ]);
    expect(r).toEqual({ ok: true, freetour: [], unknown: [], ours: 2 });
  });

  it("REQ-080: cualquier correo de FREETOUR (o subdominio) hace fallar el release", () => {
    const r = checkNoFreetourEmails([
      { from: "reservas@travelpuzzle.com.mx" },
      { from: "FREETOUR.com <no-reply@freetour.com>", subject: "Your booking" },
      { from: "info@mail.freetour.com" },
    ]);
    expect(r.ok).toBe(false);
    expect(r.freetour).toHaveLength(2);
  });

  it("REQ-080: remitentes desconocidos quedan para revisión manual (y no dan verde)", () => {
    const r = checkNoFreetourEmails([{ from: "reservas@travelpuzzle.com.mx" }, { from: "guia@gmail.com" }]);
    expect(r.ok).toBe(false);
    expect(r.unknown).toEqual([{ from: "guia@gmail.com" }]);
  });

  it("REQ-080: sin correos de Travel Puzzle no hay evidencia y no pasa", () => {
    expect(checkNoFreetourEmails([]).ok).toBe(false);
  });

  it("REQ-080: lee el dominio con o sin nombre visible", () => {
    expect(senderDomain("A <x@Sub.FreeTour.com>")).toBe("sub.freetour.com");
    expect(senderDomain("x@travelpuzzle.com.mx")).toBe("travelpuzzle.com.mx");
    expect(senderDomain("sin arroba")).toBeNull();
  });

  it("REQ-080: la checklist de release incluye cancelar la reserva de prueba y registrarla", () => {
    const text = RELEASE_CHECKLIST.join("\n");
    expect(text).toMatch(/cancela/i);
    expect(text).toMatch(/registr/i);
    expect(text).toMatch(/OK del PO/);
  });
});
