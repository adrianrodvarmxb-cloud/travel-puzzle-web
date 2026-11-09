/**
 * Raíz con I/O de las redes del día (REQ-1075, REQ-1080, REQ-1081). Recibe todo por parámetro (fetch, config, URL
 * del sitio) y publica red por red: si una falla, las demás siguen; sin bandera o sin tokens, queda «manual».
 */
import type { Post } from "@/blog/lib/schema";
import { decidirPublicacion } from "./lib/tope";
import { postPath } from "@/blog/lib/registry";
import { plainText } from "@/blog/lib/inline";
import { socialPack, socialProblems, utmUrl, type SocialPack } from "./lib/textos";
import { laminaUrl } from "./lib/laminas";
import { facebookPostRequest, paginaTokenUrl, tokenDePagina, instagramChildRequest, instagramCarouselRequest, instagramSingleRequest, instagramPublishRequest, linkedinPostRequest, type FormRequest, type RedesConfig, type RedName } from "./lib/api";

type Fetch = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ ok: boolean; status: number; text: () => Promise<string>; headers?: { get: (k: string) => string | null } }>;
export type Resultado = { red: RedName; estado: "publicado" | "manual" | "fallo"; detalle: string };

async function sendForm(f: Fetch, r: FormRequest): Promise<Record<string, unknown>> {
  const res = await f(r.url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(r.form).toString() });
  const txt = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${txt.slice(0, 300)}`);
  return JSON.parse(txt || "{}");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type Historial = { yaPublicadoEnRed(red: RedName): Promise<boolean>; publicadasHoyEnRed(red: RedName): Promise<number>; registrar(red: RedName): Promise<void> };

export async function runRedes(o: { post: Post; siteUrl: string; config: RedesConfig; fetch: Fetch; wait?: (ms: number) => Promise<void>; historial?: Historial }): Promise<{ pack: SocialPack; problemas: string[]; resultados: Resultado[]; laminas: string[] }> {
  const site = o.siteUrl.replace(/\/+$/, "");
  const url = `${site}${postPath(o.post)}`;
  const pack = socialPack(o.post, site);
  const problemas = socialProblems(pack, o.post, site);
  const laminas = pack.instagram.laminas.map((_, i) => laminaUrl(o.post.slug, i + 1, site));
  const wait = o.wait ?? sleep;
  const out: Resultado[] = [];
  const bad = (red: RedName) => problemas.filter((p) => p.startsWith(`${red}:`));

  // REQ-1080: cada red en su propio try; una falla no detiene a las demás.
  const tryRed = async (red: RedName, cfg: RedesConfig[RedName], go: () => Promise<string>) => {
    if (cfg.mode === "manual") return out.push({ red, estado: "manual", detalle: cfg.motivo });
    if (bad(red).length) return out.push({ red, estado: "fallo", detalle: `no pasa las reglas: ${bad(red).join("; ")}` });
    // REQ-1090: sin historial no se publica (falla cerrada); con historial, se aplica el tope y no se repite el artículo.
    if (!o.historial) return out.push({ red, estado: "fallo", detalle: "sin registro de publicaciones (REQ-1090); no se publica" });
    try {
      const d = decidirPublicacion({ yaPublicadoEnRed: await o.historial.yaPublicadoEnRed(red), publicadasHoyEnRed: await o.historial.publicadasHoyEnRed(red) });
      if (!d.publicar) return out.push({ red, estado: "manual", detalle: d.motivo });
    } catch (e) { return out.push({ red, estado: "fallo", detalle: `no se pudo leer el registro: ${(e as Error).message}` }); }
    try { const detalle = await go(); await o.historial.registrar(red); out.push({ red, estado: "publicado", detalle }); } catch (e) { out.push({ red, estado: "fallo", detalle: (e as Error).message }); }
  };

  await tryRed("linkedin", o.config.linkedin, async () => {
    const c = o.config.linkedin; if (c.mode !== "auto") return "";
    const r = linkedinPostRequest(c, pack.linkedin, { url: utmUrl(url, "linkedin"), title: o.post.title, description: o.post.summary });
    const res = await o.fetch(r.url, { method: "POST", headers: r.headers, body: JSON.stringify(r.json) });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return `post ${res.headers?.get("x-restli-id") ?? "creado"}`;
  });

  await tryRed("facebook", o.config.facebook, async () => {
    const c = o.config.facebook; if (c.mode !== "auto") return "";
    // REQ-1085: Meta rechaza (403 #200) publicar con el token de usuario de sistema; se pide el token de página primero.
    const tp = await o.fetch(paginaTokenUrl(c));
    const pageToken = tokenDePagina(JSON.parse((await tp.text()) || "{}") as Record<string, unknown>);
    const j = await sendForm(o.fetch, facebookPostRequest({ ...c, token: pageToken }, pack.facebook.replace(utmUrl(url, "facebook"), "").trim(), utmUrl(url, "facebook")));
    return `post ${String(j.id ?? "")}`;
  });

  await tryRed("instagram", o.config.instagram, async () => {
    const c = o.config.instagram; if (c.mode !== "auto") return "";
    for (const l of laminas) { const h = await o.fetch(l, { method: "HEAD" }); if (!h.ok) throw new Error(`la lámina no es pública todavía (${h.status}): ${l}`); }
    let creation: string;
    if (laminas.length === 1) creation = String((await sendForm(o.fetch, instagramSingleRequest(c, laminas[0], pack.instagram.caption))).id);
    else {
      const kids: string[] = [];
      for (const l of laminas) kids.push(String((await sendForm(o.fetch, instagramChildRequest(c, l))).id));
      creation = String((await sendForm(o.fetch, instagramCarouselRequest(c, kids, pack.instagram.caption))).id);
    }
    // Instagram procesa el contenedor antes de publicarlo: se espera a status_code FINISHED (máx. ~2 min).
    for (let i = 0; i < 12; i++) {
      const s = await o.fetch(`https://graph.facebook.com/${c.graph}/${creation}?fields=status_code&access_token=${encodeURIComponent(c.token)}`);
      const st = s.ok ? String((JSON.parse(await s.text()) as { status_code?: string }).status_code) : "";
      if (st === "FINISHED") break;
      if (st === "ERROR") throw new Error("Instagram marcó el contenedor con ERROR");
      await wait(10_000);
    }
    const j = await sendForm(o.fetch, instagramPublishRequest(c, creation));
    return `media ${String(j.id ?? "")}`;
  });

  return { pack, problemas, resultados: out, laminas };
}

/** REQ-1081: texto del issue «Redes del día», listo para copiar y pegar. */
export function issueRedesDelDia(o: { post: Post; pack: SocialPack; resultados: Resultado[]; laminas: string[]; url: string }): string {
  const row = (r: Resultado) => `| ${r.red} | ${r.estado} | ${r.detalle.replace(/\|/g, "/")} |`;
  return [
    `**${o.post.title}** — ${o.url}`, "",
    "| Red | Estado | Detalle |", "|---|---|---|", ...o.resultados.map(row), "",
    "### LinkedIn (página de empresa)", "```", o.pack.linkedin, "```", "",
    "### Facebook (página)", "```", o.pack.facebook, "```", "",
    "### Instagram (cuenta business)", "Carrusel (en este orden):", ...o.laminas.map((l, i) => `${i + 1}. ${l}`), "", "Caption:", "```", o.pack.instagram.caption, "```", "",
    `Resumen del artículo: ${plainText(o.post.summary)}`,
  ].join("\n");
}
