// REQ-10746: aplicar UNA sola migración de D1 por corrida. Puro: lee el listado de `wrangler d1 migrations list`
// y decide si el archivo pedido es la más baja pendiente. El workflow `.github/workflows/migracion-una.yml` ejecuta
// el SQL con `wrangler d1 execute --file` y la registra en `d1_migrations` igual que lo haría `migrations apply`,
// para que las demás sigan pendientes (una por corrida: lección de INC-025).

const NOMBRE = /^\d{4}_[A-Za-z0-9_-]+\.sql$/;

// REQ-10746: nombres de migración del listado de wrangler, en el orden en que aparecen (ascendente).
export function pendientesDeListado(listado: string): string[] {
  const vistos = new Set<string>();
  for (const m of listado.matchAll(/\b(\d{4}_[A-Za-z0-9_-]+\.sql)\b/g)) vistos.add(m[1]);
  return [...vistos].sort();
}

export type Eleccion = { ok: true; archivo: string } | { ok: false; motivo: string; nada?: true };

// REQ-10746: la pedida debe ser la más baja pendiente; si no está pendiente, no hay nada que hacer (no es error).
export function elegirMigracion(listado: string, archivo: string): Eleccion {
  if (!NOMBRE.test(archivo)) return { ok: false, motivo: `nombre inválido: ${archivo}` };
  const pendientes = pendientesDeListado(listado);
  if (!pendientes.includes(archivo)) return { ok: false, motivo: `${archivo} no está pendiente (ya aplicada o no existe)`, nada: true };
  if (pendientes[0] !== archivo) return { ok: false, motivo: `${archivo} no es la más baja pendiente; antes va ${pendientes[0]}` };
  return { ok: true, archivo };
}

// REQ-10746: mismo registro que deja `wrangler d1 migrations apply` (tabla d1_migrations: id, name, applied_at).
export function sqlMarcarAplicada(archivo: string): string {
  if (!NOMBRE.test(archivo)) throw new Error(`nombre inválido: ${archivo}`);
  return `INSERT INTO d1_migrations (name) VALUES ('${archivo}')`;
}
