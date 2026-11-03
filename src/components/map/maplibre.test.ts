import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { MAPLIBRE_VERSION, MAPLIBRE_WORKER_URL } from "./maplibre";

describe("worker de MapLibre", () => {
  it("la versión instalada coincide con el worker publicado en /public", () => {
    const pkg = JSON.parse(readFileSync("node_modules/maplibre-gl/package.json", "utf8"));
    expect(pkg.version).toBe(MAPLIBRE_VERSION);
    expect(existsSync(`public${MAPLIBRE_WORKER_URL}`)).toBe(true);
  });
});
