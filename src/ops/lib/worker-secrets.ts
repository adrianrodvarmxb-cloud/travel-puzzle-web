// REQ-155 (INC-006): los secretos del Worker viajan DENTRO de la versión que se sube, se prueba y se despliega
// (`wrangler versions upload --secrets-file`), en vez de `wrangler secret put` después de publicar.
// `secret put` se niega si la última versión subida no es la desplegada (p. ej. la de un PR en prueba de humo).

/** Credenciales que vienen de los secretos de GitHub: se envían siempre que tengan valor. */
export const SECRETOS_DE_GITHUB = ["FREETOUR_EMAIL", "FREETOUR_PASSWORD", "GATEWAY_SECRET", "RESEND_API_KEY", "BANXICO_TOKEN"] as const;
/** Claves internas: se generan una sola vez y después se conservan (la versión las hereda). */
export const CLAVES_INTERNAS = ["CRON_SECRET", "AUTH_SECRET"] as const;

// REQ-155
export function armarSecretos(p: {
  env: Record<string, string | undefined>;
  existentes: readonly string[];
  generar: () => string;
}): { secretos: Record<string, string>; generados: string[] } {
  const secretos: Record<string, string> = {};
  for (const n of SECRETOS_DE_GITHUB) {
    const v = p.env[n];
    if (v) secretos[n] = v;
  }
  const generados: string[] = [];
  for (const n of CLAVES_INTERNAS) {
    if (!p.existentes.includes(n)) {
      secretos[n] = p.generar();
      generados.push(n);
    }
  }
  return { secretos, generados };
}

// REQ-155: salida de `wrangler secret list --format json`. Si no se puede leer, lanza:
// antes el workflow caía a «[]» y habría regenerado AUTH_SECRET y CRON_SECRET.
export function nombresDeSecretos(json: string): string[] {
  // Tolera texto antes o después (banner de wrangler); sin arreglo JSON, falla.
  const i = json.indexOf("["), j = json.lastIndexOf("]");
  if (i < 0 || j < i) throw new Error("No se pudo leer la lista de secretos del Worker.");
  const data: unknown = JSON.parse(json.slice(i, j + 1));
  if (!Array.isArray(data)) throw new Error("La lista de secretos del Worker no es un arreglo.");
  return data.map((x) => {
    const name = (x as { name?: unknown })?.name;
    if (typeof name !== "string" || !name) throw new Error("Registro de secreto sin nombre.");
    return name;
  });
}

/** REQ-188: llaves compartidas con otro Worker (misma cuenta). Se generan una sola vez: primero se cargan en el otro
 *  Worker y solo si eso funcionó viajan con la versión de aquí; si falla, la próxima publicación lo vuelve a intentar. */
export const CLAVES_COMPARTIDAS = [
  { nombre: "AGENTE_TOKEN", worker: "mila-zoefel", comoSeLlamaAlla: "CATALOGO_TRAVEL_PUZZLE" }, // catálogo del agente de WhatsApp
] as const;

// REQ-188
export function clavesCompartidasQueFaltan(p: { existentes: readonly string[]; generar: () => string }) {
  return CLAVES_COMPARTIDAS.filter((c) => !p.existentes.includes(c.nombre)).map((c) => ({ ...c, valor: p.generar() }));
}
