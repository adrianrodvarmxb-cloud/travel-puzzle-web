import { describe, expect, it } from "vitest";
import { formatDate } from "./dates";

describe("fechas del blog", () => {
  it("REQ-255: fecha legible calculada sin Intl (INC-001)", () => {
    expect(formatDate("2027-01-18", "es")).toBe("18 de enero de 2027");
    expect(formatDate("2027-03-01", "en")).toBe("March 1, 2027");
    expect(formatDate("no-fecha", "es")).toBe("no-fecha");
  });
});
