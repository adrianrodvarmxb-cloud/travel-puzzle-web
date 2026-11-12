import { describe, expect, it } from "vitest";
import { peopleLabel } from "./people-label";

describe("REQ-1626: número de personas con singular y plural", () => {
  it("REQ-1626: 1 → «1 persona»; 0 y 2+ → «personas»", () => {
    expect(peopleLabel(1)).toBe("1 persona");
    expect(peopleLabel(0)).toBe("0 personas");
    expect(peopleLabel(2)).toBe("2 personas");
    expect(peopleLabel(19)).toBe("19 personas");
  });
});
