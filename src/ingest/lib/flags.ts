/**
 * REQ-543, REQ-544: bandera del archivo crudo. Se enciende solo con "true" exacto y únicamente después de crear el
 * bucket privado, agregar el binding RAW_ARCHIVE y aplicar la migración 0022 (runbook docs/runbooks/copia-exacta.md).
 */
export function rawArchiveEnabled(env: { RAW_ARCHIVE_ENABLED?: string }): boolean {
  return env.RAW_ARCHIVE_ENABLED === "true";
}

/** Bindings del archivo, o null si la bandera está apagada o falta algo (en ese caso se avisa y el sync sigue). */
// REQ-544
export function pickRawArchiveBindings<B, D>(env: { RAW_ARCHIVE_ENABLED?: string }, bindings: { RAW_ARCHIVE?: B; DB?: D }): { bucket: B; db: D } | null {
  if (!rawArchiveEnabled(env)) return null;
  if (!bindings.RAW_ARCHIVE || !bindings.DB) {
    console.error("[archivo-crudo] RAW_ARCHIVE_ENABLED=\"true\" pero falta el binding RAW_ARCHIVE o DB: no se archiva; el sync sigue");
    return null;
  }
  return { bucket: bindings.RAW_ARCHIVE, db: bindings.DB };
}
