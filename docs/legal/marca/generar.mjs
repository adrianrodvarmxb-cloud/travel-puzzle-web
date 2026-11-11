// Aplica la marca Travel Puzzle (skill marca-documentos-travel-puzzle) a los acuerdos de intermediación.
// Uso: node generar.mjs <md> <docx> <titulo-proveedor> <ref> [idioma=es]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire("/opt/npm-tools/node_modules/");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Header, Footer, AlignmentType, PageNumber,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, HeadingLevel, TabStopType,
} = require("docx");
const JSZip = require("jszip");

const [, , mdPath, outPath, proveedor, ref, idioma = "es"] = process.argv;
const EN = idioma === "en";
const DIR = path.dirname(new URL(import.meta.url).pathname);
const NAVY = "2B3E8C", CLARO = "1E8CF5", LIMA = "C8DC12", GRIS = "6B7280", FILA = "EEF3FC";
const logo = fs.readFileSync(path.join(DIR, "logo.png"));
const icono = fs.readFileSync(path.join(DIR, "icono.png"));

// Texto con **negritas** y *cursivas*; quita `código` y ~~tachado~~ (deja el texto).
function runs(texto, base = {}) {
  const out = [];
  const t = texto.replace(/`([^`]*)`/g, "$1").replace(/~~([^~]*)~~/g, "$1").replace(/\\\|/g, "|");
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g;
  let i = 0, m;
  while ((m = re.exec(t))) {
    if (m.index > i) out.push(new TextRun({ text: t.slice(i, m.index), ...base }));
    const s = m[0];
    if (s.startsWith("**")) out.push(new TextRun({ text: s.slice(2, -2), bold: true, ...base }));
    else out.push(new TextRun({ text: s.slice(1, -1), italics: true, ...base }));
    i = m.index + s.length;
  }
  if (i < t.length) out.push(new TextRun({ text: t.slice(i), ...base }));
  return out;
}

const cuerpo = { font: "Calibri", size: 21 };
const p = (texto, opts = {}) => new Paragraph({ children: runs(texto, cuerpo), spacing: { after: 120, line: 276 }, ...opts });

function tabla(filas) {
  const celdas = filas.map((l) => l.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((c) => c.trim()));
  const cab = celdas[0];
  const datos = celdas.slice(2);
  const n = cab.length;
  const ancho = Math.floor(9360 / n);
  const borde = { style: BorderStyle.SINGLE, size: 4, color: "D5DBEA" };
  const bordes = { top: borde, bottom: borde, left: borde, right: borde };
  const celda = (txt, i, j, header) =>
    new TableCell({
      width: { size: ancho, type: WidthType.DXA },
      borders: bordes,
      shading: header
        ? { type: ShadingType.CLEAR, color: "auto", fill: NAVY }
        : j % 2 === 1 ? { type: ShadingType.CLEAR, color: "auto", fill: FILA } : undefined,
      margins: { top: 60, bottom: 60, left: 90, right: 90 },
      children: [new Paragraph({ children: runs(txt, { font: header ? "Arial" : "Calibri", size: header ? 17 : 18, bold: header, color: header ? "FFFFFF" : "1F2937" }) })],
    });
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: Array(n).fill(ancho),
    rows: [
      new TableRow({ tableHeader: true, children: cab.map((c, i) => celda(c, i, -1, true)) }),
      ...datos.map((r, j) => new TableRow({ children: Array.from({ length: n }, (_, i) => celda(r[i] ?? "", i, j, false)) })),
    ],
  });
}

const md = fs.readFileSync(mdPath, "utf8").split("\n");
let titulo = "";
const avisos = [];
const hijos = [];
let k = 0;
while (k < md.length) {
  const l = md[k];
  const t = l.trim();
  if (t.startsWith("# ")) { titulo = t.slice(2); k++; continue; }
  if (!t || t === "---") { k++; continue; }
  if (/^Documento vinculado a REQ-/.test(t)) { k++; continue; }
  if (hijos.length === 0 && /^\*\*[^*]+\*\*$/.test(t) && !/PARTE/.test(t)) {
    // Nombre del proveedor y avisos de borrador antes de la primera sección: van a la portada.
    if (!/^\*\*(BORRADOR|DRAFT|COURTESY)/.test(t)) { k++; continue; }
  }
  if (hijos.length === 0 && /^\*\*(BORRADOR|DRAFT|COURTESY)/.test(t)) { avisos.push(t); k++; continue; }
  if (t.startsWith("|")) {
    const filas = [];
    while (k < md.length && md[k].trim().startsWith("|")) filas.push(md[k++]);
    hijos.push(tabla(filas));
    hijos.push(new Paragraph({ children: [], spacing: { after: 80 } }));
    continue;
  }
  if (t.startsWith("### ")) {
    hijos.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t.slice(4), font: "Arial", bold: true, size: 22, color: CLARO })], spacing: { before: 200, after: 100 } }));
  } else if (t.startsWith("## ")) {
    hijos.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      keepNext: true,
      children: [new TextRun({ text: t.slice(3), font: "Arial", bold: true, size: 26, color: NAVY })],
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: CLARO, space: 2 } },
      spacing: { before: 280, after: 140 },
    }));
  } else if (t.startsWith("- ")) {
    hijos.push(new Paragraph({ children: [new TextRun({ text: "•\t", ...cuerpo, color: CLARO }), ...runs(t.slice(2), cuerpo)], indent: { left: 360, hanging: 240 }, tabStops: [{ type: TabStopType.LEFT, position: 360 }], spacing: { after: 60, line: 264 } }));
  } else if (/^\d+\.\s/.test(t)) {
    const [num, ...resto] = t.split(" ");
    hijos.push(new Paragraph({ children: [new TextRun({ text: num + "\t", ...cuerpo, bold: true, color: NAVY }), ...runs(resto.join(" "), cuerpo)], indent: { left: 400, hanging: 400 }, tabStops: [{ type: TabStopType.LEFT, position: 400 }], spacing: { after: 60, line: 264 } }));
  } else {
    hijos.push(p(t));
  }
  k++;
}

const portada = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1400, after: 400 }, children: [new ImageRun({ type: "png", data: logo, transformation: { width: 230, height: 150 } })] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: LIMA, space: 6 } },
    spacing: { after: 240 },
    children: [new TextRun({ text: titulo.toUpperCase(), font: "Arial", bold: true, size: 32, color: NAVY })],
  }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: `Travel Puzzle · ${proveedor}`, font: "Arial", size: 26, color: CLARO })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [new TextRun({ text: ref, font: "Arial", size: 18, color: GRIS })] }),
  ...avisos.map((a) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: runs(a.replace(/\*\*/g, ""), { font: "Calibri", size: 19, italics: true, color: GRIS }) })),
  new Paragraph({ pageBreakBefore: true, children: [] }),
];

const pie = (texto, extra = {}) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: texto, font: "Arial", size: 13, color: GRIS, ...extra })] });
const footer = new Footer({
  children: [
    new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 8, color: LIMA, space: 4 } }, spacing: { after: 0 }, children: [
      new TextRun({ text: "TRAVEL", font: "Arial", bold: true, size: 14, color: CLARO }),
      new TextRun({ text: "PUZZLE", font: "Arial", bold: true, size: 14, color: NAVY }),
      new TextRun({ text: EN ? " · We build your trip" : " · Armamos tu viaje", font: "Arial", italics: true, size: 14, color: CLARO }),
    ] }),
    pie("CLAUDIA LETICIA RODRÍGUEZ LAVEAGA (Travel Puzzle) · RFC ROLC6211204M2 · RNT 04100050179 · PROFECO 6635-2023", { bold: true }),
    pie("Av. Lázaro Cárdenas 300 Nte., Col. Esperanza, C.P. 34080, Victoria de Durango, Durango, México"),
    pie("travelpuzzle.com.mx · info@travelpuzzle.com.mx · +52 55 3649 0320"),
    pie(EN
      ? "Confidential document — for the parties' use only. Draft subject to legal review; not a contract until signed."
      : "Documento confidencial — uso exclusivo de las partes. Borrador sujeto a revisión legal; no constituye contrato hasta su firma."),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [
      new TextRun({ text: `${ref} · ${EN ? "Page" : "Página"} `, font: "Arial", size: 13, color: NAVY }),
      new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 13, color: NAVY }),
      new TextRun({ text: EN ? " of " : " de ", font: "Arial", size: 13, color: NAVY }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 13, color: NAVY }),
    ] }),
  ],
});
const header = new Header({
  children: [new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: NAVY, space: 4 } },
    children: [
      new ImageRun({ type: "png", data: icono, transformation: { width: 28, height: 22 } }),
      new TextRun({ text: "  TRAVEL", font: "Arial", bold: true, size: 20, color: CLARO }),
      new TextRun({ text: "PUZZLE", font: "Arial", bold: true, size: 20, color: NAVY }),
      new TextRun({ text: EN ? " · We build your trip" : " · Armamos tu viaje", font: "Arial", italics: true, size: 18, color: CLARO }),
    ],
  })],
});

const doc = new Document({
  creator: "Travel Puzzle",
  title: `${titulo} · ${proveedor}`,
  styles: { default: { document: { run: { font: "Calibri", size: 21 } } } },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1300, bottom: 1700, left: 1440, right: 1440, header: 600, footer: 500 } } },
    headers: { default: header },
    footers: { default: footer },
    children: [...portada, ...hijos],
  }],
});

const buf = await Packer.toBuffer(doc);
// Control de cambios activado (borrador para revisión del proveedor y del abogado).
const zip = await JSZip.loadAsync(buf);
let settings = await zip.file("word/settings.xml").async("string");
if (!settings.includes("<w:trackRevisions")) settings = settings.replace(/(<w:settings[^>]*>)/, "$1<w:trackRevisions/>");
zip.file("word/settings.xml", settings);
fs.writeFileSync(outPath, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
console.log("ok", outPath);
