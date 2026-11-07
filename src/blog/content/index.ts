/**
 * Registro de artículos del blog (datos en el repo; sin base nueva). Publicar = cambiar `draft` a false en un PR,
 * con el material del cliente aprobado, los tests en verde y el OK del PO.
 * Hoy: cero publicados; un ejemplo en borrador.
 */
import type { PostInput } from "../lib/schema";
import { post as cn01 } from "./posts/cn-01-visa-china-mexicanos";

export const POSTS: PostInput[] = [cn01];
