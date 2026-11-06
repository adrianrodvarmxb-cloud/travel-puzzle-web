import { describe, it, expect } from "vitest";
import { primeraPiezaBadge, PRIMERA_PIEZA_BADGE } from "./badge";

const freeMap = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 };
const fixedFrom5 = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 60, "6": 70 };

describe("REQ-095: insignia «🧩 Primera Pieza · Tú decides cuánto vale»", () => {
  it("REQ-095: el texto exacto", () => {
    expect(PRIMERA_PIEZA_BADGE).toBe("🧩 Primera Pieza · Tú decides cuánto vale");
  });
  it("REQ-095: free tour con fullPricePerGroup = 0 para el grupo elegido → sí", () => {
    expect(primeraPiezaBadge({ isFreeTour: true, fullPricePerGroup: freeMap, groupSize: 2 })).toBe(PRIMERA_PIEZA_BADGE);
    expect(primeraPiezaBadge({ isFreeTour: true, fullPricePerGroup: fixedFrom5, groupSize: 4 })).toBe(PRIMERA_PIEZA_BADGE);
  });
  it("REQ-095: un tour con tarifa fija para el grupo elegido no muestra «Tú decides cuánto vale»", () => {
    expect(primeraPiezaBadge({ isFreeTour: true, fullPricePerGroup: fixedFrom5, groupSize: 5 })).toBeNull();
    expect(primeraPiezaBadge({ isFreeTour: true, fullPricePerGroup: fixedFrom5, groupSize: 6 })).toBeNull();
  });
  it("REQ-095: tour de pago nunca lleva la insignia", () => {
    expect(primeraPiezaBadge({ isFreeTour: false, fullPricePerGroup: freeMap, groupSize: 2 })).toBeNull();
  });
  it("REQ-095: grupo sin precio en el evento: solo si todo el evento es 0", () => {
    expect(primeraPiezaBadge({ isFreeTour: true, fullPricePerGroup: freeMap, groupSize: 9 })).toBe(PRIMERA_PIEZA_BADGE);
    expect(primeraPiezaBadge({ isFreeTour: true, fullPricePerGroup: fixedFrom5, groupSize: 9 })).toBeNull();
    expect(primeraPiezaBadge({ isFreeTour: true, fullPricePerGroup: {}, groupSize: 2 })).toBe(PRIMERA_PIEZA_BADGE);
  });
});
