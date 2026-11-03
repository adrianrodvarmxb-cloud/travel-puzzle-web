/** Bloques de un documento legal, listos para mostrarse. Función pura. */
export type LegalBlock =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "list"; items: string[] };

/** Id para enlazar un título: minúsculas, sin acentos ni signos. */
export function slug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Convierte el texto marcado ("## ", "### ", "- ") en bloques; los incisos seguidos forman una lista. */
export function toBlocks(markup: string): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  for (const raw of markup.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("### ")) blocks.push({ type: "h3", text: line.slice(4).trim() });
    else if (line.startsWith("## ")) blocks.push({ type: "h2", text: line.slice(3).trim() });
    else if (line.startsWith("- ")) {
      const item = line.slice(2).trim();
      const last = blocks[blocks.length - 1];
      if (last?.type === "list") last.items.push(item);
      else blocks.push({ type: "list", items: [item] });
    } else blocks.push({ type: "p", text: line });
  }
  return blocks;
}
