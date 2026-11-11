// REQ-1587: frentes en curso como issues de GitHub con la etiqueta `en-curso` (API REST).
// Uso:
//   npx tsx src/scripts/frente.ts buscar "Acuerdo Tangol"     → lista frentes abiertos del mismo tema (sale con 3 si hay)
//   npx tsx src/scripts/frente.ts abrir "Acuerdo Tangol" [detalle] → abre el frente si nadie lo tiene (si ya existe, sale con 3)
//   npx tsx src/scripts/frente.ts nota <n> "Borrador vigente: r-123"  → agrega una nota (p. ej. el borrador vigente de Gmail)
//   npx tsx src/scripts/frente.ts cerrar <n>                  → cierra el frente al terminar
// Token: GH_TOKEN o GITHUB_TOKEN. Repo: GITHUB_REPOSITORY o el remoto origin.
import { execFileSync } from "node:child_process";
import { ETIQUETA_FRENTE, coincideFrente } from "../ops/lib/frentes";

function repo(): string {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const url = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }).trim();
  const m = url.match(/github\.com[:/](.+?\/.+?)(?:\.git)?$/);
  if (!m) throw new Error(`No reconozco el remoto: ${url}`);
  return m[1];
}

async function api(ruta: string, init: RequestInit = {}): Promise<unknown> {
  const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  if (!token) throw new Error("Falta GH_TOKEN o GITHUB_TOKEN");
  const r = await fetch(`https://api.github.com/repos/${repo()}${ruta}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", ...(init.headers ?? {}) },
  });
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${await r.text()}`);
  return r.json();
}

interface Issue {
  number: number;
  title: string;
  html_url: string;
  pull_request?: unknown;
}

async function abiertos(tema: string): Promise<Issue[]> {
  const lista = (await api(`/issues?labels=${ETIQUETA_FRENTE}&state=open&per_page=100`)) as Issue[];
  return lista.filter((i) => !i.pull_request && coincideFrente(i.title, tema));
}

async function main(): Promise<void> {
  const [cmd, a, b] = process.argv.slice(2);
  if (cmd === "buscar" && a) {
    const hay = await abiertos(a);
    for (const i of hay) console.log(`#${i.number} ${i.title} ${i.html_url}`);
    if (hay.length) process.exit(3);
    console.log("Nadie trabaja ese frente. Ábrelo con: frente.ts abrir \"<tema>\"");
  } else if (cmd === "abrir" && a) {
    const hay = await abiertos(a);
    if (hay.length) {
      for (const i of hay) console.log(`Ya existe: #${i.number} ${i.title} ${i.html_url}`);
      process.exit(3);
    }
    const rama = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" }).trim();
    const nuevo = (await api("/issues", {
      method: "POST",
      body: JSON.stringify({
        title: `EN CURSO: ${a}`,
        labels: [ETIQUETA_FRENTE],
        body: `Frente en curso (REQ-1587). Rama: \`${rama}\`.\n\n${b ?? ""}\n\nAl terminar: \`npx tsx src/scripts/frente.ts cerrar <n>\`.`,
      }),
    })) as Issue;
    console.log(`#${nuevo.number} ${nuevo.html_url}`);
  } else if (cmd === "nota" && a && b) {
    await api(`/issues/${Number(a)}/comments`, { method: "POST", body: JSON.stringify({ body: b }) });
    console.log(`Nota agregada a #${a}`);
  } else if (cmd === "cerrar" && a) {
    await api(`/issues/${Number(a)}`, { method: "PATCH", body: JSON.stringify({ state: "closed", state_reason: "completed" }) });
    console.log(`#${a} cerrado`);
  } else {
    console.error('Uso: frente.ts buscar "<tema>" | abrir "<tema>" [detalle] | nota <n> "<texto>" | cerrar <n>');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(String(e));
  process.exit(1);
});
