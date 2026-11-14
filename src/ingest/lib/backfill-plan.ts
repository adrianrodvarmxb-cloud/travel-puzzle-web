/**
 * Ola R4 · respaldo retroactivo, SOLO preparado (REQ-766). Puro.
 * Qué documento original le corresponde a cada viaje importado y en qué página está, a partir de los nombres de los
 * archivos que el PO compartió (PDF) o de la URL del producto (página web). Lo que no se encuentra se lista como hueco.
 */

export type DocKind = "pdf" | "xlsx" | "web" | "ninguno";
export interface DocMatch { kind: DocKind; file: string | null; url: string | null; pageToken: string | null; note: string }

type Rule = { ref: RegExp; doc: RegExp; pageToken?: (ref: string) => string | null };

/** Nombre del archivo sin el prefijo de 8 hex que agrega la carpeta de adjuntos. */
export const docStem = (file: string) => file.split("/").pop()!.replace(/^[0-9a-f]{8}-/, "");

const RULES: Record<string, Rule[]> = {
  exoticescapes: [
    { ref: /^TO7$/, doc: /^Triangulo_de_Oro_2027/ }, { ref: /^TOB9$/, doc: /^Triangulo_de_Oro_y_Benar/ }, { ref: /^TOK10$/, doc: /^Triangulo_de_Oro_y_Kathmand/ },
    { ref: /^NOR9$/, doc: /^Norte_de_la_India/ }, { ref: /^RAJ10$/, doc: /^Rajasthan_2027/ }, { ref: /^RJB12$/, doc: /^Rajasthan_y_Benar/ },
    { ref: /^RKB12$/, doc: /^Rajasthan_Khajuraho/ }, { ref: /^RCE12$/, doc: /^Rajasthan_con_encanto/ }, { ref: /^SRI8$/, doc: /^Sri_Lanka/ },
    { ref: /^MUJ8$/, doc: /India_entre_mujeres/ }, { ref: /^INS8$/, doc: /Instagrameable/ }, { ref: /^HOLI27$/, doc: /^Happy_Holi/ },
    { ref: /^DIW26$/, doc: /^Diwali_2026/ }, { ref: /^AMR3$/, doc: /^Extensi_n_Amritsar/ }, { ref: /^MUM3$/, doc: /^Extensi_n_Mumbai/ },
  ],
  turismoasiatico: [
    { ref: /^MYS-01$/, doc: /^SIC_Malasia/ }, { ref: /^BOR-01$/, doc: /^SIC_BORNEO/ }, { ref: /^SGP-PRE$/, doc: /^SIC_PRE-Ext_Singapur/ },
    { ref: /^SIN-\d+$/, doc: /Singapur_-_Hoteles/ }, { ref: /^KUL-\d+$/, doc: /Kuala_Lumpur_-_Hoteles/ },
  ],
  destinocolombia: [{ ref: /^PC-\d{3}$/, doc: /^PC_/, pageToken: (r) => r.replace("-", " ") }],
  fantasticachina: [{ ref: /^FCH-R/, doc: /^TOUR_REGULAR.*FANTASTICA_CHINA/ }, { ref: /^FCH-L/, doc: /^TOUR_GRAN_LUJO.*FANTASTICA_CHINA/ }],
  incaworld: [{ ref: /^[A-Z]+(-[A-Z]+)?-\d+$/, doc: /^TARIFARIO_B2B.*INCA_WORLD/, pageToken: (r) => r }],
};

// REQ-766
/**
 * REQ-10534: `contiene` lo inyecta quien lee los archivos (la lib sigue pura). Extime manda su programa en Excel
 * (invierno y verano): el viaje se liga al primer programa cuyo contenido trae su código; sin `contiene` no se adivina.
 */
export function matchDocument(provider: string, entry: { ref: string; source?: unknown }, files: string[], contiene?: (file: string, ref: string) => boolean): DocMatch {
  if (provider === "extime" && contiene) {
    const programas = files.filter((f) => /Extime_Travel_Program/.test(docStem(f))).sort();
    const file = programas.find((f) => contiene(f, entry.ref)) ?? null;
    return file
      ? { kind: "xlsx", file, url: null, pageToken: entry.ref, note: "" }
      : { kind: "ninguno", file: null, url: null, pageToken: null, note: "el código no aparece en los programas de Extime" };
  }
  if (provider === "bigbus") {
    const url = typeof entry.source === "string" && /^https?:\/\//.test(entry.source) ? entry.source : null;
    if (!url) return { kind: "ninguno", file: null, url: null, pageToken: null, note: "source sin URL completa: falta la página original" };
    // REQ-10575: la copia HTML guardada de la página del producto es su documento original.
    const name = webSnapshotName(url);
    const file = files.find((f) => docStem(f) === name) ?? null;
    return file
      ? { kind: "web", file, url, pageToken: null, note: "" }
      : { kind: "web", file: null, url, pageToken: null, note: "página del producto: falta guardar su copia (HTML) para subirla" };
  }
  for (const r of RULES[provider] ?? []) {
    if (!r.ref.test(entry.ref)) continue;
    const doc = provider === "destinocolombia" ? new RegExp(`^PC_${entry.ref.slice(3)}_`) : r.doc;
    const file = files.find((f) => doc.test(docStem(f))) ?? null;
    if (file) return { kind: "pdf", file, url: null, pageToken: r.pageToken?.(entry.ref) ?? null, note: "" };
    return { kind: "ninguno", file: null, url: null, pageToken: null, note: `no está el PDF que corresponde (${doc.source})` };
  }
  return { kind: "ninguno", file: null, url: null, pageToken: null, note: provider === "extime" ? "no hay documento original de Extime (programa invierno 2026-27 / verano 2027)" : "sin regla de documento" };
}

/**
 * REQ-10575: nombre del archivo con la copia HTML de una página de producto (Big Bus). Determinista: el mismo para la
 * URL con o sin www, query, ancla o diagonal final, así el respaldo encuentra la copia sin adivinar.
 */
// REQ-10575
export function webSnapshotName(url: string): string {
  const u = new URL(url);
  const path = u.pathname.toLowerCase().replace(/\/+$/, "").split("/").filter(Boolean).join("_").replace(/[^a-z0-9_-]/g, "-");
  return `bigbus_web_${path || "inicio"}.html`;
}

/** REQ-10575: solo se guarda como original una página completa (200, HTML, de bigbustours.com); un error o captcha no. */
// REQ-10575
export function snapshotValido(r: { status: number; contentType: string | null; finalUrl: string; body: string }): { ok: boolean; motivo: string } {
  if (r.status !== 200) return { ok: false, motivo: `respondió ${r.status}` };
  if (!/text\/html/i.test(r.contentType ?? "")) return { ok: false, motivo: `no es HTML (${r.contentType ?? "sin tipo"})` };
  let host = "";
  try { host = new URL(r.finalUrl).hostname.replace(/^www\./, ""); } catch { /* URL inválida */ }
  if (host !== "bigbustours.com") return { ok: false, motivo: `terminó en otro sitio (${host || r.finalUrl})` };
  if (!/<html[\s>]/i.test(r.body) || r.body.length < 2000) return { ok: false, motivo: "página incompleta" };
  return { ok: true, motivo: "" };
}

/** Página (1-based) del primer texto de página que contiene el token; un PDF de una sola ficha es la página 1. */
// REQ-766
export function pageOf(pages: string[], token: string | null): number | null {
  if (!token) return pages.length > 0 && pages.length <= 12 ? 1 : null;
  const i = pages.findIndex((p) => p.includes(token));
  return i >= 0 ? i + 1 : null;
}

export interface InventoryRow { provider: string; ref: string; kind: DocKind; file: string | null; url: string | null; page: number | null; note: string }

/** Documentos que nadie reclama (p. ej. condiciones generales): se suben como documento de la agencia si el PO lo pide. */
export function unclaimed(files: string[], rows: InventoryRow[]): string[] {
  const used = new Set(rows.map((r) => r.file).filter(Boolean));
  return files.filter((f) => !used.has(f));
}
