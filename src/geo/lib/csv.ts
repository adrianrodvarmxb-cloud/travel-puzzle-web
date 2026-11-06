/** CSV mínimo para los archivos de overrides revisados por PR. Puro. Las líneas que empiezan con # son comentarios. */

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** REQ-136: texto CSV con encabezado → filas como objetos. */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = (text ?? "").split(/\r?\n/).filter((l) => l.trim() && !l.trimStart().startsWith("#"));
  if (!lines.length) return [];
  const header = splitLine(lines[0]);
  return lines.slice(1).map((l) => {
    const cells = splitLine(l);
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""]));
  });
}

/** Entero positivo o null. */
export function toId(v: string | undefined): number | null {
  const n = Number(v);
  return v && Number.isInteger(n) && n > 0 ? n : null;
}
