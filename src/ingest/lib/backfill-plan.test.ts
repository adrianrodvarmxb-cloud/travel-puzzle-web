import { describe, expect, it } from "vitest";
import { matchDocument, pageOf, unclaimed, docStem, webSnapshotName, snapshotValido } from "./backfill-plan";

// Nombres de archivo de ejemplo (sin contenido): la carpeta real de PDF nunca entra al repo (REQ-748).
const FILES = [
  "a1b2c3d4-TOUR_REGULAR_USD_2027-2028_FANTASTICA_CHINA.pdf", "TOUR_GRAN_LUJO_USD_2027-2028_FANTASTICA_CHINA.pdf",
  "PC_016_-_Colombia_Esencial_Bog__Mde__Ctg_7N.pdf", "TARIFARIO_B2B___INCA_WORLD_PERU___2026___2027_2.pdf",
  "Extensi_n_Mumbai_2027_-_USD.pdf", "2027_-_USD_-_Singapur_-_Hoteles__Tours_v1.pdf", "CONDICIONES_GENERALES_2027_-_USD.pdf",
];

describe("REQ-766 respaldo retroactivo: documento original y página de cada viaje", () => {
  it("REQ-766 cada agencia encuentra su PDF por código o nombre de programa", () => {
    expect(matchDocument("fantasticachina", { ref: "FCH-R7X" }, FILES).file).toBe(FILES[0]);
    expect(matchDocument("fantasticachina", { ref: "FCH-L02" }, FILES).file).toBe(FILES[1]);
    expect(matchDocument("destinocolombia", { ref: "PC-016" }, FILES)).toMatchObject({ kind: "pdf", file: FILES[2], pageToken: "PC 016" });
    expect(matchDocument("incaworld", { ref: "PROG-TRK-01" }, FILES)).toMatchObject({ file: FILES[3], pageToken: "PROG-TRK-01" });
    expect(matchDocument("exoticescapes", { ref: "MUM3" }, FILES).file).toBe(FILES[4]);
    expect(matchDocument("turismoasiatico", { ref: "SIN-03" }, FILES).file).toBe(FILES[5]);
  });
  it("REQ-766 lo que falta se lista como hueco con el motivo; nunca se inventa", () => {
    expect(matchDocument("destinocolombia", { ref: "PC-099" }, FILES).kind).toBe("ninguno");
    expect(matchDocument("extime", { ref: "VAM" }, FILES).note).toMatch(/no hay documento original de Extime/);
    expect(matchDocument("bigbus", { ref: "NYC", source: "https://www.bigbustours.com/en/new-york/x" }, FILES)).toMatchObject({ kind: "web", url: "https://www.bigbustours.com/en/new-york/x" });
    expect(matchDocument("bigbus", { ref: "MIA", source: "miami-tour-tickets-and-passes" }, FILES).kind).toBe("ninguno");
  });
  it("REQ-766 la página es la primera que contiene el código; un PDF corto sin código es la página 1", () => {
    expect(pageOf(["portada", "LIM-01 City tour", "CUS-01"], "CUS-01")).toBe(3);
    expect(pageOf(["portada"], "X")).toBeNull();
    expect(pageOf(["a", "b"], null)).toBe(1);
    expect(pageOf(new Array(40).fill("x"), null)).toBeNull();
  });
  it("REQ-766 los documentos que ningún viaje reclama se reportan aparte", () => {
    expect(unclaimed(FILES, [{ provider: "x", ref: "r", kind: "pdf", file: FILES[0], url: null, page: 1, note: "" }])).toContain("CONDICIONES_GENERALES_2027_-_USD.pdf");
    expect(docStem("/x/a1b2c3d4-PC_016.pdf")).toBe("PC_016.pdf");
  });
});

describe("REQ-10534 Extime: el viaje se liga al Excel del programa que contiene su código", () => {
  const XLS = ["2026_Extime_Travel_Program_from_November_1st_2026.xlsx", "2027_Extime_Travel_Program_from_April_1st_2027.xlsx"];
  const tiene: Record<string, string[]> = { [XLS[0]]: ["VAM", "PAR"], [XLS[1]]: ["PAR", "VER"] };
  const contiene = (f: string, ref: string) => (tiene[docStem(f)] ?? []).includes(ref);
  it("REQ-10534 elige el primer programa (invierno) que trae el código, con el código como renglón a buscar", () => {
    expect(matchDocument("extime", { ref: "VAM" }, XLS, contiene)).toMatchObject({ kind: "xlsx", file: XLS[0], pageToken: "VAM" });
    expect(matchDocument("extime", { ref: "PAR" }, XLS, contiene).file).toBe(XLS[0]);
  });
  it("REQ-10534 si solo viene en el de verano, liga ese", () => {
    expect(matchDocument("extime", { ref: "VER" }, XLS, contiene)).toMatchObject({ kind: "xlsx", file: XLS[1] });
  });
  it("REQ-10534 sin el código en ningún programa queda como hueco; nunca se inventa", () => {
    expect(matchDocument("extime", { ref: "ZZZ" }, XLS, contiene)).toMatchObject({ kind: "ninguno", file: null });
    expect(matchDocument("extime", { ref: "VAM" }, XLS).kind).toBe("ninguno");
  });
});

describe("REQ-10575 Big Bus: la copia HTML de la página del producto es su documento original", () => {
  const URL_NY = "https://www.bigbustours.com/en/new-york/new-york-tour-tickets-and-passes";
  it("REQ-10575 el nombre de la copia sale de la URL (sin www, sin query ni diagonal final) y es el mismo con o sin www", () => {
    expect(webSnapshotName(URL_NY)).toBe("bigbus_web_en_new-york_new-york-tour-tickets-and-passes.html");
    expect(webSnapshotName("https://bigbustours.com/en/new-york/new-york-tour-tickets-and-passes/?utm=x#a")).toBe(webSnapshotName(URL_NY));
    expect(webSnapshotName("https://bigbustours.com/en/boston")).toBe("bigbus_web_en_boston.html");
  });
  it("REQ-10575 con la copia en la carpeta, el viaje se liga a ese archivo HTML y conserva la URL", () => {
    const files = [...FILES, `0a1b2c3d-${webSnapshotName(URL_NY)}`];
    expect(matchDocument("bigbus", { ref: "NYC", source: URL_NY }, files)).toEqual({ kind: "web", file: `0a1b2c3d-${webSnapshotName(URL_NY)}`, url: URL_NY, pageToken: null, note: "" });
  });
  it("REQ-10575 sin la copia sigue como pendiente de guardar; sin URL completa, hueco (nunca se adivina)", () => {
    expect(matchDocument("bigbus", { ref: "NYC", source: URL_NY }, FILES)).toMatchObject({ kind: "web", file: null, url: URL_NY });
    expect(matchDocument("bigbus", { ref: "MIA", source: "miami-tour-tickets-and-passes" }, FILES).kind).toBe("ninguno");
  });
  it("REQ-10575 solo se guarda una respuesta 200 en HTML de bigbustours.com con página completa", () => {
    const html = `<!doctype html><html><head><title>Big Bus</title></head><body>${"x".repeat(3000)}</body></html>`;
    expect(snapshotValido({ status: 200, contentType: "text/html; charset=utf-8", finalUrl: URL_NY, body: html })).toEqual({ ok: true, motivo: "" });
    expect(snapshotValido({ status: 404, contentType: "text/html", finalUrl: URL_NY, body: html }).ok).toBe(false);
    expect(snapshotValido({ status: 200, contentType: "application/json", finalUrl: URL_NY, body: html }).ok).toBe(false);
    expect(snapshotValido({ status: 200, contentType: "text/html", finalUrl: "https://captcha.example.com/x", body: html }).ok).toBe(false);
    expect(snapshotValido({ status: 200, contentType: "text/html", finalUrl: URL_NY, body: "<html></html>" }).ok).toBe(false);
  });
});
