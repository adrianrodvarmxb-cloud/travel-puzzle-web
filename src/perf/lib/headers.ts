// REQ-1530: lectura pura del archivo public/_headers (formato de Cloudflare Workers Static Assets).
// Sirve para probar que cada ruta estática recibe la caché correcta.

export type HeaderRule = { pattern: string; headers: Record<string, string> };

/** Convierte el texto de `_headers` en reglas: línea sin sangría = ruta; con sangría = `Nombre: valor`. */
export function parseHeadersFile(text: string): HeaderRule[] {
  const rules: HeaderRule[] = [];
  for (const raw of text.split('\n')) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) {
      rules.push({ pattern: raw.trim(), headers: {} });
      continue;
    }
    const current = rules[rules.length - 1];
    const idx = raw.indexOf(':');
    if (!current || idx < 0) continue;
    current.headers[raw.slice(0, idx).trim().toLowerCase()] = raw.slice(idx + 1).trim();
  }
  return rules;
}

/** `*` coincide con cualquier texto (incluye `/`), como en Cloudflare. */
export function matches(pattern: string, path: string): boolean {
  const re = new RegExp('^' + pattern.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
  return re.test(path);
}

/** Cache-Control de la primera regla que coincide, o null si ninguna. */
export function cacheControlFor(rules: HeaderRule[], path: string): string | null {
  for (const r of rules) if (matches(r.pattern, path) && r.headers['cache-control']) return r.headers['cache-control'];
  return null;
}
