import { describe, it, expect } from "vitest";
import { chunk } from "./chunk";

describe("INC-003: límite de parámetros de D1", () => {
  it("REQ-034: 300 ids se consultan en grupos de máx. 90 sin perder ninguno", () => {
    const ids = Array.from({ length: 300 }, (_, i) => i);
    const parts = chunk(ids, 90);
    expect(parts.map((p) => p.length)).toEqual([90, 90, 90, 30]);
    expect(parts.flat()).toEqual(ids);
    expect(chunk([], 90)).toEqual([]);
  });
});
