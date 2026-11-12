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

/** REQ-3450: idioma de la página del blog (es sin prefijo; /en/… con LOCALE_URLS_ENABLED). Otro idioma, null (404). */
export async function blogLanguage(): Promise<{ lang: "es" | "en"; hreflang: boolean } | null> {
  const { destinosLanguage } = await import("@/destinations/server");
  const { lang, hreflang } = await destinosLanguage();
  return lang === "es" || lang === "en" ? { lang, hreflang } : null;
}
