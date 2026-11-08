import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import contrato from "../data/contrato-diccionario.json";
import { DEFAULT_DICTIONARY } from "../data";
import { FORMATO_LABEL } from "./filters";
import { FORMATOS } from "./types";
import { buildSynonyms } from "@/search/lib/synonyms";
import { fold } from "@/search/lib/normalize";
import { taxonomySearchInput } from "@/search/lib/taxonomy-terms";

// REQ-1348 (PO 7-11 15:20: «confirma que todo el diccionario se consideró… y que se considere en lo posterior»):
// contrato fila por fila entre docs/taxonomia-diccionario.csv y el código. Si una fila no cumple, el test la nombra.
type Ev = { tipo: string; [k: string]: unknown };
type Fila = { fila: number; tabla: string; slug: string; termino: string; estadoCsv: string; cumplimiento: string; evidencia: Ev[]; nota: string; folio?: string };
const filas = (contrato as { filas: Fila[] }).filas;

function csvRows(): string[][] {
  const text = readFileSync("docs/taxonomia-diccionario.csv", "utf8").replace(/^﻿/, "");
  const rows: string[][] = []; let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true; else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.length > 1);
}
const [head, ...csv] = csvRows();
const col = (n: string) => head.indexOf(n);

const raw = JSON.parse(readFileSync("data/search-synonyms.json", "utf8"));
const tax = taxonomySearchInput(DEFAULT_DICTIONARY, true);
const syn = buildSynonyms(raw, tax.terms, tax.legacy).map;
const wrangler = readFileSync("wrangler.jsonc", "utf8");
const freetour = JSON.parse(readFileSync("src/taxonomy/data/mapping/freetour.json", "utf8")) as { categorias: { id: string; formato: string; estado: string }[] };

/** null = la evidencia se cumple; si no, el motivo. */
function check(e: Ev): string | null {
  switch (e.tipo) {
    case "termino": {
      const t = DEFAULT_DICTIONARY.terminos.find((x) => x.eje === e.eje && x.slug === e.slug);
      return !t ? `no hay término ${e.eje}:${e.slug} en el diccionario` : (e.estados as string[]).includes(t.estado) ? null : `${e.eje}:${e.slug} está «${t.estado}», se esperaba ${(e.estados as string[]).join("/")}`;
    }
    case "etiqueta": return (FORMATO_LABEL as Record<string, unknown>)[e.slug as string] ? null : `sin etiqueta ni chip para ${e.slug}`;
    case "codigo": return existsSync(e.archivo as string) && readFileSync(e.archivo as string, "utf8").includes(e.contiene as string) ? null : `${e.archivo} no contiene «${e.contiene}»`;
    case "bandera": return new RegExp(`"${e.nombre}":\\s*"${e.valor}"`).test(wrangler) ? null : `wrangler.jsonc no tiene ${e.nombre}="${e.valor}"`;
    case "sinonimo": return (syn.get(fold(e.de as string)) ?? []).includes(fold(e.a as string)) ? null : `el buscador no lleva «${e.de}» a «${e.a}»`;
    case "mapeo": {
      const c = freetour.categorias.find((x) => x.id === e.id);
      if (!c) return `la categoría ${e.proveedor}:${e.id} no está en el mapeo`;
      if (!(FORMATOS as readonly string[]).includes(c.formato)) return `${e.proveedor}:${e.id} cae en «${c.formato}», que no es un formato del diccionario`;
      return c.formato === e.formato ? null : `${e.proveedor}:${e.id} cae en «${c.formato}», se esperaba «${e.formato}»`;
    }
    case "historico": return freetour.categorias.find((x) => x.id === e.id)?.estado === "historico" ? null : `${e.proveedor}:${e.id} no está como histórico`;
    case "mapeoProveedor": return existsSync(`src/taxonomy/data/mapping/${e.archivo}`) ? null : `falta src/taxonomy/data/mapping/${e.archivo}`;
    case "legadoSinDestino": return DEFAULT_DICTIONARY.legado?.find((l) => l.termino === e.termino)?.sinonimo_de.length === 0 ? null : `«${e.termino}» ya tiene destino en el legado`;
    default: return `evidencia desconocida: ${e.tipo}`;
  }
}
const nombre = (f: Fila) => `fila ${f.fila} ${f.tabla}:${f.slug} («${f.estadoCsv}»)`;

describe("REQ-1348: contrato diccionario ↔ código, fila por fila", () => {
  it("REQ-1348: el contrato cubre las 145 filas del CSV, en orden y con el mismo slug y estado", () => {
    expect(csv).toHaveLength(145);
    const fallas = csv.flatMap((r, i) => {
      const f = filas[i];
      return !f || f.slug !== r[col("slug")] || f.estadoCsv !== r[col("estado")] || f.fila !== i + 1 ? [`fila ${i + 1} ${r[col("slug")]}: sin entrada igual en el contrato`] : [];
    });
    expect(fallas).toEqual([]);
    expect(filas).toHaveLength(145);
  });
  it("REQ-1348: toda evidencia declarada se cumple en el código", () => {
    const fallas = filas.flatMap((f) => f.evidencia.flatMap((e) => { const m = check(e); return m ? [`${nombre(f)}: ${m}`] : []; }));
    expect(fallas).toEqual([]);
  });
  it("REQ-1348: «activo…» tiene implementación (regla, etiqueta, filtro, faceta o mapeo), o un folio que la espera", () => {
    const activo = (f: Fila) => /^(activo|activa|mapeado|se mantiene)/.test(f.estadoCsv);
    const impl = new Set(["etiqueta", "codigo", "mapeo", "mapeoProveedor", "historico"]);
    const fallas = filas.filter(activo).flatMap((f) =>
      f.cumplimiento === "OK" && f.evidencia.some((e) => impl.has(e.tipo) || e.tipo === "termino") ? [] :
      f.cumplimiento !== "OK" && f.folio ? [] : [`${nombre(f)}: sin implementación ni folio`]);
    expect(fallas).toEqual([]);
  });
  it("REQ-1348: «tras bandera» tiene su bandera (variable de wrangler o estado tras_bandera/oculto del diccionario)", () => {
    const fallas = filas.filter((f) => /^tras /.test(f.estadoCsv)).flatMap((f) =>
      f.evidencia.some((e) => e.tipo === "bandera" || (e.tipo === "termino" && (e.estados as string[]).some((s) => ["tras_bandera", "oculto", "activo"].includes(s)))) ? [] : [`${nombre(f)}: sin bandera`]);
    expect(fallas.filter((x) => !x.startsWith("fila 143 "))).toEqual([]);
  });
  it("REQ-1348: «sobra/fusionado» tiene sus sinónimos en el buscador (tras REQ-1357)", () => {
    const fallas = filas.filter((f) => /sobra|fusionado/.test(f.estadoCsv)).flatMap((f) => (f.evidencia.some((e) => e.tipo === "sinonimo") ? [] : [`${nombre(f)}: sin sinónimo en el buscador`]));
    expect(fallas).toEqual([]);
  });
  it("REQ-1348: las 29 categorías de FREETOUR caen cada una en un solo formato del diccionario", () => {
    const activas = csv.filter((r) => r[col("tabla")] === "mapeo-freetour" && r[col("estado")] === "mapeado").map((r) => r[col("freetour_categoryIds")]);
    expect(activas).toHaveLength(29);
    for (const id of activas) {
      const cs = freetour.categorias.filter((c) => c.id === id);
      expect(cs, `freetour:${id}`).toHaveLength(1);
      expect(FORMATOS as readonly string[], `freetour:${id}`).toContain(cs[0].formato);
    }
  });
  it("REQ-1348: lo que falta es exactamente lo conocido (una falta nueva hace fallar este test)", () => {
    const faltas = filas.filter((f) => f.cumplimiento === "FALTA").map((f) => `${f.fila}:${f.slug}:${f.folio}`);
    expect(faltas).toEqual([
      // los 12 temas sin chip ni filtro (revisión manual; «urbano» es base, no filtro)
      "16:cultural:REQ-1317",
      ...["gastronomia", "naturaleza", "montana-senderismo", "aventura", "playa-mar", "noche-espectaculos", "religioso", "bienestar", "talleres-aprendizaje", "deportivo", "parques-ocio"].map((s, i) => `${18 + i}:${s}:REQ-1317`),
      "57:medio:REQ-1351", "59:nocturno:REQ-1351", "143:idiomatico:REQ-1348",
    ]);
  });
});
