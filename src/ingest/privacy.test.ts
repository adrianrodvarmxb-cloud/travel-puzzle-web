import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { IMAGE_KEY_RE } from "@/trips/lib/image";
import { isArchiveKey, rawKey, sourceKey } from "./lib/raw-keys";

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx|js|mjs)$/.test(f) ? [p] : []; });
const H = "c".repeat(64);

describe("REQ-747 ninguna ruta pública sirve el archivo crudo (raw/ ni source/)", () => {
  it("REQ-747 solo src/ingest y el cron del sync tocan el binding RAW_ARCHIVE; ninguna página, API pública, middleware ni worker", () => {
    const files = [...walk("src"), "worker.ts"].filter((f) => !f.endsWith(".test.ts"));
    const users = files.filter((f) => !f.startsWith("src/ingest/") && /RAW_ARCHIVE\b|ingest\/deps/.test(readFileSync(f, "utf8")));
    expect(users).toEqual(["src/app/api/cron/sync-tours/route.ts"]);
    // Dentro de src/ingest, solo deps.ts toma el binding del entorno.
    const binders = walk("src/ingest").filter((f) => !f.endsWith(".test.ts") && /getCloudflareContext/.test(readFileSync(f, "utf8")));
    expect(binders).toEqual(["src/ingest/deps.ts"]);
  });
  it("REQ-747 el cron solo escribe: el puerto del bucket no tiene get ni list", () => {
    const src = readFileSync("src/ingest/raw-archive.ts", "utf8");
    const port = /export interface R2PutLike \{([\s\S]*?)\n\}/.exec(src)![1];
    expect(port).toMatch(/put\(/);
    expect(port).not.toMatch(/\b(get|list|head)\(/);
    expect(readFileSync("src/app/api/cron/sync-tours/route.ts", "utf8")).toMatch(/Bearer \$\{process\.env\.CRON_SECRET\}/);
  });
  it("REQ-747 el servidor de fotos rechaza claves del archivo crudo", () => {
    for (const k of [rawKey("freetour", 1, H), sourceKey("extime", "a.pdf", H), "raw/x.jpg", "source/a/1-b.jpg"]) {
      expect(isArchiveKey(k) || !k.startsWith("trips/")).toBe(true);
      expect(IMAGE_KEY_RE.test(k)).toBe(false);
    }
  });
  // REQ-771 reemplaza el «sin binding aún» de REQ-747: el bucket ya existe (candado 1) y el binding entra con la bandera apagada.
  it("REQ-771 wrangler.jsonc declara el binding RAW_ARCHIVE → travel-puzzle-raw una sola vez, sin dominio ni ruta pública", () => {
    const w = readFileSync("wrangler.jsonc", "utf8").replace(/\/\/[^\n]*/g, "");
    const r2 = w.match(/"r2_buckets":\s*\[([\s\S]*?)\]/)?.[1] ?? "";
    expect(r2).toMatch(/\{\s*"binding":\s*"RAW_ARCHIVE",\s*"bucket_name":\s*"travel-puzzle-raw"\s*\}/);
    expect(w.match(/travel-puzzle-raw/g)?.length).toBe(1);
    expect(w.match(/"RAW_ARCHIVE"/g)?.length).toBe(1);
    expect(w).not.toMatch(/raw\.travelpuzzle|r2\.dev/);
  });
  it("REQ-771 con el binding, la bandera sigue apagada (se enciende en su propio PR)", () => {
    expect(readFileSync("wrangler.jsonc", "utf8")).toMatch(/"RAW_ARCHIVE_ENABLED":\s*"false"/);
  });
});

describe("REQ-748 netos, comisiones y copias exactas nunca en el repo", () => {
  const SENSITIVE = /(^net$|^neto|^net[A-Z_]|^precioNeto|commission|comisi[oó]n|^markup|^margen|^margin|^cost[oe]?$)/i;
  const keysOf = (v: unknown, out: string[] = []): string[] => {
    if (Array.isArray(v)) v.forEach((x) => keysOf(x, out));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { out.push(k); keysOf(x, out); }
    return out;
  };
  it("REQ-748 ningún imports/*.json trae campos de neto, comisión, margen o costo", () => {
    for (const f of readdirSync("imports").filter((x) => x.endsWith(".json"))) {
      const bad = keysOf(JSON.parse(readFileSync(`imports/${f}`, "utf8"))).filter((k) => SENSITIVE.test(k));
      expect(bad, f).toEqual([]);
    }
  });
  it("REQ-748 no hay objetos del archivo crudo ni documentos originales commiteados", () => {
    for (const dir of ["imports", "docs", "tests", "src"]) {
      const all = readdirSync(dir, { recursive: true }) as string[];
      expect(all.filter((p) => /(^|\/)(raw|source)\/[^/]+\/[^/]+\/?[0-9a-f]{8,}/.test(p) || /\.pdf$/i.test(p)), dir).toEqual([]);
    }
  });
});
