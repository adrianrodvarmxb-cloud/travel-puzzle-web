// REQ-1587: aparta folios REQ de forma atómica en GitHub y revisa que una rama no choque con main.
// Uso:
//   npx tsx src/scripts/folio.ts apartar [n] ["motivo"]          → aparta n folios (1 por omisión) y los imprime
//   npx tsx src/scripts/folio.ts apartar --exacto REQ-N ["motivo"] → aparta un folio concreto (falla si ya es de otra sesión)
//   npx tsx src/scripts/folio.ts revisar                          → compara docs/requisitos.md de HEAD con origin/main
// El registro vive en la rama `folios/registro` (archivo folios.tsv). Cada reserva es un commit empujado SIN force:
// si otra sesión empujó antes, GitHub lo rechaza (no es fast-forward), se relee y se reintenta. No toca main ni tu rama.
import { execFileSync } from "node:child_process";
import {
  ARCHIVO_REGISTRO,
  CORTE_RESERVA,
  RAMA_REGISTRO,
  apartarExacto,
  apartarFolios,
  choques,
  leerFolios,
  leerReservas,
  maxFolio,
  sinReserva,
  type Registro,
} from "../ops/lib/folios";

const REQ = "docs/requisitos.md";
const REF_LOCAL = `refs/remotes/origin/${RAMA_REGISTRO}`;

function git(args: string[], entrada?: string): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    input: entrada,
    stdio: [entrada === undefined ? "ignore" : "pipe", "pipe", "pipe"],
  });
}

function mostrar(rev: string, ruta = REQ): string {
  try {
    return git(["show", `${rev}:${ruta}`]);
  } catch {
    return "";
  }
}

function traerRegistro(): void {
  try {
    git(["fetch", "--quiet", "--no-tags", "origin", `+refs/heads/${RAMA_REGISTRO}:${REF_LOCAL}`]);
  } catch {
    // La rama aún no existe: el primer `apartar` la crea.
  }
}

const registroGit: Registro = {
  leer: () => {
    traerRegistro();
    let base: string | null = null;
    try {
      base = git(["rev-parse", "--verify", "--quiet", REF_LOCAL]).trim() || null;
    } catch {
      base = null;
    }
    return { texto: base ? mostrar(base, ARCHIVO_REGISTRO) : "", base };
  },
  escribir: (texto, base) => {
    // Commit fuera del árbol de trabajo: blob → árbol → commit con padre `base`.
    const blob = git(["hash-object", "-w", "--stdin"], texto).trim();
    const arbol = git(["mktree"], `100644 blob ${blob}\t${ARCHIVO_REGISTRO}\n`).trim();
    const padre = base ? ["-p", base] : [];
    const commit = git(["commit-tree", arbol, ...padre, "-m", "folios: reserva (REQ-1587)"]).trim();
    try {
      git(["push", "--quiet", "--no-verify", "origin", `${commit}:refs/heads/${RAMA_REGISTRO}`]);
      return true;
    } catch (e) {
      const msg = String((e as { stderr?: string }).stderr ?? e);
      if (/non-fast-forward|fetch first|rejected|stale/i.test(msg)) return false;
      throw new Error(`No se pudo escribir el registro de folios: ${msg.trim()}`);
    }
  },
};

function datos(motivo: string) {
  const rama = git(["rev-parse", "--abbrev-ref", "HEAD"]).trim();
  return { rama, fecha: new Date().toISOString().slice(0, 16).replace("T", " "), motivo };
}

function apartar(args: string[]): void {
  const i = args.indexOf("--exacto");
  if (i >= 0) {
    const id = args[i + 1];
    if (!/^REQ-\d+$/.test(id ?? "")) throw new Error("Uso: apartar --exacto REQ-1234 [\"motivo\"]");
    if (!apartarExacto(id, registroGit, datos(args[i + 2] ?? ""))) {
      console.error(`${id} ya está apartado por otra sesión. Usa \`apartar\` para tomar el siguiente libre.`);
      process.exit(1);
    }
    console.log(id);
    return;
  }
  const n = Math.max(1, Number(args[0] ?? 1) || 1);
  // Mayor folio en main y en TODAS las ramas remotas: así tampoco choca con trabajo aún sin fusionar.
  git(["fetch", "--quiet", "--prune", "--no-tags", "origin"]);
  const ramas = git(["for-each-ref", "--format=%(refname:short)", "refs/remotes/origin"])
    .split("\n")
    .filter((r) => r && !r.endsWith("/HEAD"));
  const usados = new Set<string>();
  for (const r of ramas) for (const id of leerFolios(mostrar(r)).keys()) usados.add(id);
  const desde = Math.max(maxFolio(usados) + 1, CORTE_RESERVA);
  for (const id of apartarFolios(n, desde, registroGit, datos(args[1] ?? ""))) console.log(id);
}

function revisar(): void {
  const main = mostrar("origin/main");
  if (!main) {
    console.error(`No encuentro origin/main. Corre antes: git fetch origin main +refs/heads/${RAMA_REGISTRO}:${REF_LOCAL}`);
    process.exit(2);
  }
  const reservados = leerReservas(registroGit.leer().texto);
  const rama = leerFolios(mostrar("HEAD"));
  const enMain = leerFolios(main);
  const c = choques(rama, enMain);
  const nuevos = [...rama.keys()].filter((id) => !enMain.has(id));
  const faltan = sinReserva(nuevos, reservados);
  for (const x of c) console.error(`CHOQUE ${x.id}: en esta rama «${x.rama.slice(0, 80)}», en main «${x.main.slice(0, 80)}»`);
  for (const id of faltan) console.error(`SIN APARTAR ${id}: apártalo con \`npx tsx src/scripts/folio.ts apartar --exacto ${id}\` o toma uno nuevo`);
  if (c.length || faltan.length) {
    console.error(`REQ-1587: ${c.length} choque(s) y ${faltan.length} folio(s) sin apartar. Renumera con folios apartados.`);
    process.exit(1);
  }
  console.log(`REQ-1587: folios en orden (${nuevos.length} nuevos frente a main, ninguno choca).`);
}

const [cmd, ...resto] = process.argv.slice(2);
if (cmd === "apartar") apartar(resto);
else if (cmd === "revisar") revisar();
else {
  console.error("Uso: folio.ts apartar [n] [\"motivo\"] | apartar --exacto REQ-N [\"motivo\"] | revisar");
  process.exit(1);
}
