import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";

type Db = { exec: (s: string) => void; prepare: (s: string) => { all: (...v: unknown[]) => unknown[] } };
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (p: string) => Db };
const FILE = "migrations/0009_freetour_payments.sql";
const SQL = readFileSync(FILE, "utf8");

// REQ-939: la migración de pagos de FREETOUR solo agrega columnas e índice, y su número no choca con otra.
describe("REQ-939 migración 0009: columnas de pago en FreetourBooking", () => {
  it("REQ-939: solo agrega (sin DROP/UPDATE/DELETE/RENAME) y conserva los datos", () => {
    const code = SQL.replace(/--[^\n]*/g, "");
    expect(code).not.toMatch(/\b(DROP|UPDATE|DELETE|INSERT|RENAME)\b/i);
    const d = new DatabaseSync(":memory:");
    d.exec(readFileSync("migrations/0002_freetour_bookings.sql", "utf8"));
    d.exec(`INSERT INTO "FreetourBooking" ("refNumber","eventId","adults","children","price","email","firstName","lastName","status","manageToken","updatedAt") VALUES ('R1',1,2,0,0,'a@b.c','A','B','active','tok',CURRENT_TIMESTAMP)`);
    d.exec(SQL);
    const cols = (d.prepare(`PRAGMA table_info("FreetourBooking")`).all() as { name: string }[]).map((c) => c.name);
    expect(cols).toEqual(expect.arrayContaining(["fullPrice", "currency", "checkoutSessionId", "paymentUrl", "paymentStatus", "paymentExpiresAt", "paymentCheckedAt"]));
    expect(d.prepare(`SELECT "refNumber","paymentStatus" FROM "FreetourBooking"`).all()).toEqual([{ refNumber: "R1", paymentStatus: null }]);
  });
  it("REQ-939: ningún otro archivo usa el número 0009", () => {
    expect(readdirSync("migrations").filter((f) => f.startsWith("0009_"))).toEqual(["0009_freetour_payments.sql"]);
  });
});
