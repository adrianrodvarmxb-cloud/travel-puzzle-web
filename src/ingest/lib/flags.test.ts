import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { rawArchiveEnabled, pickRawArchiveBindings } from "./flags";

describe("REQ-543 bandera RAW_ARCHIVE_ENABLED (apagada)", () => {
  it("REQ-543 solo \"true\" exacto la enciende", () => {
    expect(rawArchiveEnabled({ RAW_ARCHIVE_ENABLED: "true" })).toBe(true);
    for (const v of [undefined, "", "false", "TRUE", "1"]) expect(rawArchiveEnabled({ RAW_ARCHIVE_ENABLED: v })).toBe(false);
  });
  it("REQ-543 wrangler.jsonc la declara en \"false\"", () => {
    expect(readFileSync("wrangler.jsonc", "utf8")).toMatch(/"RAW_ARCHIVE_ENABLED":\s*"false"/);
  });
  it("REQ-544 encendida sin el binding RAW_ARCHIVE o sin D1: no hay archivo (el sync sigue) y se avisa", () => {
    const bucket = { put: async () => {} };
    const db = { prepare: () => ({}), batch: async () => [] };
    expect(pickRawArchiveBindings({ RAW_ARCHIVE_ENABLED: "false" }, { RAW_ARCHIVE: bucket, DB: db })).toBeNull();
    expect(pickRawArchiveBindings({ RAW_ARCHIVE_ENABLED: "true" }, { DB: db })).toBeNull();
    expect(pickRawArchiveBindings({ RAW_ARCHIVE_ENABLED: "true" }, { RAW_ARCHIVE: bucket, DB: db })).toEqual({ bucket, db });
  });
});
