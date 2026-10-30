// Configuración de OpenNext para publicar el sitio en Cloudflare Workers.
// Sin caché incremental en R2 por ahora: las páginas del catálogo se leen de D1.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});
