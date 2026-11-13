import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DIRECTORIO_APROBADO, sqlCarga, resumenCarga } from "./directorio";
import { proveedorDeCorreo } from "./identificar";

const doc = readFileSync(join(process.cwd(), "docs/proveedores/borrador-directorio-2026-11-07.md"), "utf8");

describe("REQ-1656: carga del directorio aprobado", () => {
  it("REQ-1656: un renglón por empresa, ids únicos en minúsculas", () => {
    const ids = DIRECTORIO_APROBADO.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it("REQ-1656: FREETOUR no se carga; la identificación lo sigue descartando por dominio (regla B3)", () => {
    expect(DIRECTORIO_APROBADO.some((p) => /freetour/i.test(p.id + p.nombre + p.dominios.join(" ") + p.correos.join(" ")))).toBe(false);
    expect(DIRECTORIO_APROBADO.every((p) => !p.bloqueado)).toBe(true);
    const contactos = DIRECTORIO_APROBADO.map((p) => ({ id: p.id, correos: p.correos, dominios: p.dominios }));
    expect(proveedorDeCorreo(["i.merino@freetour.com"], contactos)).toBeNull();
    expect(proveedorDeCorreo(["reservas5@destinocolombia.com"], contactos)).toBe("destino-colombia");
  });

  it("REQ-1656: cada dominio y cada correo del documento aprobado está en la carga, y nada más", () => {
    const docDominios = new Set([...doc.matchAll(/\|\s*[^|]*\|\s*([a-z0-9.-]+\.[a-z]{2,})(?:\s*\(|\s*·|\s*\|)/gi)].map((m) => m[1].toLowerCase()));
    const cargados = new Set(DIRECTORIO_APROBADO.flatMap((p) => p.dominios));
    for (const d of docDominios) expect(cargados, d).toContain(d);
    const correos = DIRECTORIO_APROBADO.flatMap((p) => [...p.correos, ...p.correosInvalidos]);
    for (const c of correos) {
      const [u, dom] = c.split("@");
      // El documento abrevia «rositsag@ · tradesupport@bigbustours.com»: basta con que aparezcan el usuario y el dominio.
      expect(doc.includes(c) || (doc.includes(`${u}@`) && doc.includes(dom)), c).toBe(true);
    }
    for (const d of cargados) expect(doc.toLowerCase(), d).toContain(d);
  });

  it("REQ-1656: nunca un dominio de correo gratuito como dominio propio", () => {
    for (const p of DIRECTORIO_APROBADO) for (const d of p.dominios) expect(d).not.toMatch(/^(gmail|hotmail|outlook|yahoo|live)\./);
  });

  it("REQ-1656: el correo que rebotó (Asian Spirit) va como inválido y no como correo activo", () => {
    const a = DIRECTORIO_APROBADO.find((p) => p.id === "asian-spirit")!;
    expect(a.correosInvalidos).toContain("latamasianspirit@gmail.com");
    expect(a.correos).not.toContain("latamasianspirit@gmail.com");
  });

  it("REQ-1656: las plataformas de la sección 3 (aún «¿entran?») no se cargan", () => {
    for (const n of ["Bedsonline", "RIU", "Expedia", "Booking", "Aeroméxico"]) expect(DIRECTORIO_APROBADO.some((p) => p.nombre.includes(n))).toBe(false);
  });

  it("REQ-1656: los 8 publicados (los 7 del directorio y Tangol, que se carga el 12 nov) quedan marcados; todos arrancan «por contactar» (Mila no escribe sola, REQ-1297)", () => {
    expect(DIRECTORIO_APROBADO.filter((p) => p.publicado).map((p) => p.id).sort()).toEqual(
      ["big-bus-tours", "destino-colombia", "exotic-escapes", "extime-travel", "fantastica-china", "inca-world-peru", "tangol", "turismo-asiatico"]);
    const sql = sqlCarga(DIRECTORIO_APROBADO, "2026-11-12T18:00:00.000Z");
    expect(sql).not.toMatch(/'contactado'|'respondio'|'en_alta'|'activo'/);
  });

  it("REQ-1656: cobro según REQ-1666 (DMC: cobra Travel Puzzle; plataforma: cobra ella) y Big Bus como plataforma (REQ-1586)", () => {
    for (const p of DIRECTORIO_APROBADO) {
      if (p.tipo === "dmc") expect(p.cobro, p.id).toBe("travelpuzzle");
      if (p.tipo === "plataforma") expect(p.cobro, p.id).toBe("proveedor");
    }
    expect(DIRECTORIO_APROBADO.find((p) => p.id === "big-bus-tours")!.tipo).toBe("plataforma");
    expect(DIRECTORIO_APROBADO.find((p) => p.id === "civitatis")!.tipo).toBe("plataforma");
  });

  it("REQ-1656: el SQL solo inserta (INSERT OR IGNORE), no pisa filas existentes y escapa comillas", () => {
    const sql = sqlCarga([{ ...DIRECTORIO_APROBADO[0], id: "x", nombre: "O'Brien" }], "2026-11-12T18:00:00.000Z");
    expect(sql).toMatch(/^INSERT OR IGNORE INTO "Proveedor"/);
    expect(sql).toContain("'O''Brien'");
    expect(sql).not.toMatch(/\b(UPDATE|DELETE|DROP)\b/);
    const todo = sqlCarga(DIRECTORIO_APROBADO, "2026-11-12T18:00:00.000Z");
    expect(todo.split("\n").filter((l) => l.startsWith("INSERT"))).toHaveLength(DIRECTORIO_APROBADO.length);
  });

  it("REQ-1656: el resumen cuenta publicados, en conversación y bloqueados (ninguno)", () => {
    const r = resumenCarga(DIRECTORIO_APROBADO);
    expect(r.total).toBe(DIRECTORIO_APROBADO.length);
    expect(r.publicados).toBe(8);
    expect(r.bloqueados).toBe(0);
  });
});
