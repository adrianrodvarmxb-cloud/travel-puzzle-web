/** I/O del blog para las páginas: banderas desde process.env y registro validado. */
import { blogEnv, loadPosts, loadVisiblePosts } from "./load";

export function blogState() {
  const env = process.env as Record<string, string | undefined>;
  const flags = blogEnv(env);
  return {
    flags,
    visible: loadVisiblePosts(flags),
    all: flags.enabled ? loadPosts() : [],
    siteUrl: (env.SITE_URL || "https://travelpuzzle.com.mx").replace(/\/+$/, ""),
    whatsapp: /^\d{10,15}$/.test(env.WHATSAPP_NUMBER ?? "") ? (env.WHATSAPP_NUMBER as string) : null,
    nosotros: env.NOSOTROS_ENABLED === "true",
  };
}
