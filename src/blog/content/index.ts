/**
 * Registro de artículos del blog (datos en el repo; sin base nueva).
 * - A mano (`posts/`): publicar = cambiar `draft` a false en un PR, con el material del cliente aprobado y el OK del PO.
 * - Diario (`diario.json`): lo agrega solo el workflow blog-diario.yml tras pasar el validador y el humo
 *   (gate «Publica solo cada día», docs/gates-blog-diario-2026-11-06.md). REQ-984.
 */
import type { PostInput } from "../lib/schema";
import { post as cn01 } from "./posts/cn-01-visa-china-mexicanos";
import diario from "./diario.json";

export const MANUAL_POSTS: PostInput[] = [cn01];
export const DIARIO_POSTS: PostInput[] = diario as unknown as PostInput[];
export const POSTS: PostInput[] = [...MANUAL_POSTS, ...DIARIO_POSTS];
