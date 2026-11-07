import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { rawArchiveEnabled, pickRawArchiveBindings } from "./flags";

describe("REQ-743 bandera RAW_ARCHIVE_ENABLED", () => {
  it("REQ-743 solo \"true\" exacto la enciende", () => {
    expect(rawArchiveEnabled({ RAW_ARCHIVE_ENABLED: "true" })).toBe(true);
    for (const v of [undefined, "", "false", "TRUE", "1"]) expect(rawArchiveEnabled({ RAW_ARCHIVE_ENABLED: v })).toBe(false);
  });
  // REQ-774 reemplaza el «declara en "false"» de REQ-743 (candado 5 del gate de copia exacta).
  it("REQ-774 wrangler.jsonc la declara en \"true\" una sola vez, junto al binding RAW_ARCHIVE", () => {
    const w = readFileSync("wrangler.jsonc", "utf8");
    expect(w.match(/"RAW_ARCHIVE_ENABLED":\s*"(true|false)"/g)).toEqual(['"RAW_ARCHIVE_ENABLED": "true"']);
    expect(w.replace(/\/\/[^\n]*/g, "")).toMatch(/\{\s*"binding":\s*"RAW_ARCHIVE",\s*"bucket_name":\s*"travel-puzzle-raw"\s*\}/);
  });
  it("REQ-744 encendida sin el binding RAW_ARCHIVE o sin D1: no hay archivo (el sync sigue) y se avisa", () => {
    const bucket = { put: async () => {} };
    const db = { prepare: () => ({}), batch: async () => [] };
    expect(pickRawArchiveBindings({ RAW_ARCHIVE_ENABLED: "false" }, { RAW_ARCHIVE: bucket, DB: db })).toBeNull();
    expect(pickRawArchiveBindings({ RAW_ARCHIVE_ENABLED: "true" }, { DB: db })).toBeNull();
    expect(pickRawArchiveBindings({ RAW_ARCHIVE_ENABLED: "true" }, { RAW_ARCHIVE: bucket, DB: db })).toEqual({ bucket, db });
  });
});
