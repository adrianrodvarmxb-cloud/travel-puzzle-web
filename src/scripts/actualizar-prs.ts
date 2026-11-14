// REQ-3515: actualiza los PR abiertos que chocan con main SOLO en STATUS.md o docs/requisitos.md.
// Lo corre .github/workflows/actualizar-prs.yml después de cada push a main (con el secreto PR_SYNC_TOKEN, para que
// el push dispare la prueba de humo del PR). Nunca hace force-push ni toca un PR con choque de código: ese lo resuelve
// su sesión. Un PR con la etiqueta `no-actualizar` se salta.
// Uso: GH_TOKEN=… npx tsx src/scripts/actualizar-prs.ts [--ensayo]
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { DOCUMENTOS_UNION, dedupeReqRows, soloDocumentos } from "../ops/lib/union-requisitos";
import { cabecerasFrente } from "../ops/lib/frentes";

const ensayo = process.argv.includes("--ensayo");
const repo = process.env.GITHUB_REPOSITORY ?? "adrianrodvarmxb-cloud/travel-puzzle-web";
const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN ?? "";

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const gitOk = (...args: string[]) => {
  try {
    git(...args);
    return true;
  } catch {
    return false;
  }
};

async function api<T>(ruta: string): Promise<T> {
  const r = await fetch(`https://api.github.com/repos/${repo}${ruta}`, { headers: cabecerasFrente(token, false) });
  if (!r.ok) throw new Error(`GitHub ${r.status} en ${ruta}`);
  return (await r.json()) as T;
}

interface PR {
  number: number;
  draft: boolean;
  mergeable_state?: string;
  labels: { name: string }[];
  head: { ref: string; repo: { full_name: string } | null };
}

function resumen(linea: string) {
  console.log(linea);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${linea}\n`);
}

async function main() {
  if (!token) throw new Error("Falta GH_TOKEN o PR_SYNC_TOKEN");
  // REQ-3513: la unión de los dos documentos va por atributos locales (la rama vieja puede no traer .gitattributes).
  writeFileSync(`${git("rev-parse", "--git-common-dir")}/info/attributes`, DOCUMENTOS_UNION.map((f) => `${f} merge=union\n`).join(""));
  git("fetch", "--quiet", "origin", "main");

  const abiertos = await api<PR[]>("/pulls?state=open&per_page=100");
  const propios = abiertos.filter((p) => p.head.repo?.full_name === repo && !p.labels.some((l) => l.name === "no-actualizar"));
  resumen(`## Actualizar PR en conflicto (REQ-3515)${ensayo ? " · ensayo, sin push" : ""}`);

  for (const resumido of propios) {
    const pr = await api<PR>(`/pulls/${resumido.number}`); // la lista no trae mergeable_state
    if (pr.mergeable_state !== "dirty") continue;
    const rama = pr.head.ref;
    git("fetch", "--quiet", "origin", rama);
    git("checkout", "--quiet", "-B", "actualizar-pr", `origin/${rama}`);
    if (!gitOk("merge", "--no-edit", "--quiet", "origin/main")) {
      const choque = git("diff", "--name-only", "--diff-filter=U").split("\n").filter(Boolean);
      gitOk("merge", "--abort");
      const tipo = soloDocumentos(choque) ? "choque de documentos que la unión no resolvió" : "choque de código";
      resumen(`- #${pr.number} (${rama}): ${tipo} en ${choque.join(", ")}; lo resuelve su sesión`);
      continue;
    }
    // Con la unión, el choque de documentos desapareció: solo hay que quitar filas REQ repetidas.
    let quitadas = 0;
    for (const f of DOCUMENTOS_UNION) {
      const unido = readFileSync(f, "utf8");
      const r = dedupeReqRows(unido, git("show", `origin/${rama}:${f}`), git("show", `origin/main:${f}`));
      quitadas += r.removed.length;
      if (r.text !== unido) writeFileSync(f, r.text);
    }
    if (quitadas) {
      git("add", ...DOCUMENTOS_UNION);
      git("commit", "--quiet", "--amend", "--no-edit");
    }
    try {
      execFileSync("npx", ["vitest", "run", "src/ops/requisitos-unicos.test.ts"], { stdio: "pipe" });
    } catch {
      resumen(`- #${pr.number} (${rama}): la unión dejó folios repetidos; no se empuja`);
      continue;
    }
    // Push normal, nunca forzado: si la sesión dueña empujó mientras tanto, GitHub lo rechaza y el PR queda para la siguiente corrida.
    if (!ensayo && !gitOk("push", "--quiet", "origin", `HEAD:refs/heads/${rama}`)) {
      resumen(`- #${pr.number} (${rama}): la rama se movió durante la corrida; queda para la siguiente`);
      continue;
    }
    resumen(`- #${pr.number} (${rama}): actualizado con main${quitadas ? ` (${quitadas} filas REQ repetidas quitadas)` : ""}${ensayo ? " (ensayo)" : ""}`);
  }
}

main().catch((e) => {
  resumen(`Error: ${(e as Error).message}`);
  process.exit(1);
});
