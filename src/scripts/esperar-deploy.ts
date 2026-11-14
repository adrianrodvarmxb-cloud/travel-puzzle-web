/**
 * REQ-10521 (INC-017): espera a que el commit del blog quede publicado en producción.
 *   npx tsx src/scripts/esperar-deploy.ts <sha del merge> --desde <ISO> [--minutos 60] [--motivo archivo]
 * Revisa cada 30 s las corridas de «Publicar en Cloudflare» en main creadas desde --desde; una corrida cuenta si su
 * commit es el del merge o lo contiene (API compare). Sale con 0 cuando una de ellas termina en verde, con 1 si una
 * que lo contiene falla sin otra pendiente o si se acaba el tiempo (el motivo queda en --motivo).
 */
import { writeFileSync } from "node:fs";
import { estadoPublicacion, type RunDeploy } from "../ops/lib/seguimiento-deploy";

type Run = { id: number; head_sha: string; status: string; conclusion: string | null; created_at: string };

const args = process.argv.slice(2);
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const sha = args[0] ?? "";
const desde = opt("--desde") ?? "";
const minutos = Number(opt("--minutos") ?? "60");
const archivoMotivo = opt("--motivo");
const repo = process.env.GITHUB_REPOSITORY ?? process.env.REPO ?? "";
const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN ?? "";

async function api<T>(ruta: string): Promise<T> {
  const r = await fetch(`https://api.github.com/repos/${repo}${ruta}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } });
  if (!r.ok) throw new Error(`GitHub ${r.status} en ${ruta}`);
  return (await r.json()) as T;
}

const incluyeCache = new Map<string, boolean>();
async function incluye(head: string): Promise<boolean> {
  if (head === sha) return true;
  if (!incluyeCache.has(head)) {
    const c = await api<{ status: string }>(`/compare/${sha}...${head}`);
    incluyeCache.set(head, c.status === "ahead" || c.status === "identical");
  }
  return incluyeCache.get(head)!;
}

function salir(codigo: number, texto: string): never {
  console.log(texto);
  if (codigo !== 0 && archivoMotivo) writeFileSync(archivoMotivo, `- ${texto}\n`);
  process.exit(codigo);
}

(async () => {
  if (!/^[0-9a-f]{40}$/.test(sha) || !desde || !repo || !token) salir(1, "uso: esperar-deploy.ts <sha> --desde <ISO> (faltan sha, desde, repo o token)");
  const fin = Date.now() + minutos * 60_000;
  for (;;) {
    let estado;
    try {
      const { workflow_runs } = await api<{ workflow_runs: Run[] }>("/actions/workflows/deploy-cloudflare.yml/runs?branch=main&per_page=20");
      const runs: RunDeploy[] = [];
      for (const r of workflow_runs.filter((x) => x.created_at >= desde)) runs.push({ id: r.id, status: r.status, conclusion: r.conclusion, incluye: await incluye(r.head_sha) });
      estado = estadoPublicacion(runs);
      console.log(`${new Date().toISOString()} ${estado.estado} · ${runs.map((r) => `${r.id}:${r.status}/${r.conclusion ?? "-"}${r.incluye ? "" : "(sin el commit)"}`).join(" ")}`);
    } catch (e) {
      console.log(`aviso: ${(e as Error).message}; se reintenta`);
    }
    if (estado?.estado === "verde") salir(0, `Deploy ${estado.id} en verde con el commit ${sha.slice(0, 7)}.`);
    if (estado?.estado === "fallo") salir(1, `el deploy ${estado.id} con el commit terminó: ${estado.conclusion} (con su regreso automático si falló el humo de producción)`);
    if (Date.now() > fin) salir(1, `ningún deploy publicó el commit ${sha.slice(0, 7)} en ${minutos} min`);
    await new Promise((r) => setTimeout(r, 30_000));
  }
})();
