import { describe, it, expect } from "vitest";
import { liveEventInfo } from "./live-notice";

const rates = { USD: 18, EUR: 20, date: "2026-11-05" };
const ev = (full: Record<string, number>, now: Record<string, number> = {}, minAdults = 1) => ({ fullPricePerGroup: full, payableNowPricePerGroup: now, minAdultsPerBooking: minAdults });

describe("REQ-095/096: insignia y aviso con el evento consultado en vivo", () => {
  it("REQ-095: free tour sin tarifa fija para el grupo mínimo: insignia y aviso base", () => {
    const r = liveEventInfo({ detail: ev({ "1": 0, "2": 0 }), isFreeTour: true, rates, lang: "es" });
    expect(r.badge).toBe("🧩 Primera Pieza · Tú decides cuánto vale");
    expect(r.notice).toEqual(["Reservar es gratis; al final le das al guía lo que consideres justo. Cancelación gratis en cualquier momento."]);
  });

  it("REQ-096: tarifa fija desde 10 adultos: el umbral sale del evento, EUR con MXN aprox. y 24 h", () => {
    const r = liveEventInfo({ detail: ev({ "1": 0, "9": 0, "10": 50 }), isFreeTour: true, rates, lang: "es" });
    expect(r.badge).not.toBeNull();
    expect(r.notice[1]).toBe("Desde 10 adultos aplica tarifa fija de 50 EUR (aprox. MXN $1,000).");
    expect(r.notice[2]).toBe("Cancelación con reembolso hasta 24 h antes.");
  });

  it("REQ-095: si el grupo mínimo del evento ya paga tarifa fija, no hay «Tú decides cuánto vale»", () => {
    const r = liveEventInfo({ detail: ev({ "1": 0, "4": 30 }, {}, 4), isFreeTour: true, rates, lang: "es" });
    expect(r.badge).toBeNull();
  });

  it("REQ-097: tour de pago: sin insignia, 24 h y pago a la llegada cuando aplica", () => {
    const r = liveEventInfo({ detail: ev({ "1": 25, "2": 50 }, { "1": 0, "2": 0 }), isFreeTour: false, rates, lang: "es" });
    expect(r.badge).toBeNull();
    expect(r.notice).toEqual(["Cancelación con reembolso hasta 24 h antes.", "Se paga en el punto de encuentro."]);
  });
});
