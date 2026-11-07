/** REQ-743: arma el archivo crudo real (R2 privado RAW_ARCHIVE + D1) para el cron, o undefined si no aplica. */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createR2RawArchive, type R2PutLike, type RawArchive, type RawArchiveD1 } from "./raw-archive";
import { pickRawArchiveBindings } from "./lib/flags";

export function rawArchiveFromEnv(vars: { RAW_ARCHIVE_ENABLED?: string }): RawArchive | undefined {
  try {
    const { env } = getCloudflareContext();
    const b = pickRawArchiveBindings(vars, env as unknown as { RAW_ARCHIVE?: R2PutLike; DB?: RawArchiveD1 });
    return b ? createR2RawArchive(b) : undefined;
  } catch (e) {
    console.error("[archivo-crudo] sin contexto de Cloudflare:", (e as Error).message);
    return undefined;
  }
}
