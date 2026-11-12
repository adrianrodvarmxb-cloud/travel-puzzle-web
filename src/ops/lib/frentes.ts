// REQ-1587: frentes en curso (issues con la etiqueta `en-curso`). Lógica pura para comparar temas.

export const ETIQUETA_FRENTE = "en-curso";

const VACIAS = new Set(["acuerdo", "acuerdos", "con", "de", "del", "la", "el", "los", "las", "en", "curso", "para", "y", "por"]);

/** Tema sin acentos, mayúsculas ni signos. */
export function normalizarTema(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim();
}

function clave(t: string): string[] {
  return normalizarTema(t)
    .split(" ")
    .filter((w) => w.length > 2 && !VACIAS.has(w));
}

/** REQ-1587: el título del issue habla del mismo tema (todas las palabras clave del tema aparecen en el título). */
export function coincideFrente(tituloIssue: string, tema: string): boolean {
  const titulo = new Set(normalizarTema(tituloIssue).split(" "));
  const k = clave(tema);
  return k.length > 0 && k.every((w) => titulo.has(w));
}

/**
 * REQ-1621: cabeceras de la API de GitHub para los frentes. Una petición con cuerpo JSON tiene que declarar
 * `Content-Type: application/json` o GitHub responde «415: Request bodies must declare Content-Type».
 * En GET no se manda, para no cambiar lo que ya funcionaba.
 */
export function cabecerasFrente(token: string, tieneCuerpo: boolean): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" };
  if (tieneCuerpo) h["Content-Type"] = "application/json";
  return h;
}
