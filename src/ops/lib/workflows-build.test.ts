import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { parse } from "yaml";

type Step = { name?: string; run?: string; if?: string };
type Wf = { jobs?: Record<string, { steps?: Step[] }> };

const DIR = ".github/workflows";
const workflows = readdirSync(DIR).filter((f) => /\.ya?ml$/.test(f)).map((f) => ({ f, wf: parse(readFileSync(`${DIR}/${f}`, "utf8")) as Wf }));

// REQ-3499: data/countries.json no está en el repo (CLAUDE.md). Cualquier workflow que construya el sitio tiene que
// generarlo ANTES; si no, el build falla con «Can't resolve data/countries.json». Pasó en el primer ensayo del sync de
// Tangol (corrida 43287869528): el workflow copió el build de «Publicar en Cloudflare» pero no el paso de países.
describe("REQ-3499: todo workflow que construye el sitio genera antes la lista de países", () => {
  const conBuild = workflows.flatMap(({ f, wf }) =>
    Object.entries(wf.jobs ?? {}).map(([job, j]) => ({ f, job, steps: j.steps ?? [] })),
  ).filter(({ steps }) => steps.some((s) => /\b(npm run build|opennextjs-cloudflare build)\b/.test(s.run ?? "")));

  it("REQ-3499: hay workflows que construyen el sitio (la prueba no pasa en vacío)", () => {
    expect(conBuild.length).toBeGreaterThan(0);
  });

  for (const { f, job, steps } of conBuild) {
    // REQ-3500: segundo ingrediente que faltó en el sync de Tangol (corrida 43298923440): sin `prisma generate` el
    // build falla con «Parameter 'r' implicitly has an 'any' type». La prueba exige los DOS antes del build.
    it(`REQ-3500: ${f} (${job}) genera el cliente de Prisma antes del build`, () => {
      const build = steps.findIndex((s) => /\b(npm run build|opennextjs-cloudflare build)\b/.test(s.run ?? ""));
      const prisma = steps.findIndex((s) => /prisma generate/.test(s.run ?? ""));
      expect(prisma, `${f}: falta \`npx prisma generate\` antes del build`).toBeGreaterThanOrEqual(0);
      expect(prisma, `${f}: \`prisma generate\` va después del build`).toBeLessThan(build);
    });

    it(`REQ-3499: ${f} (${job}) genera data/countries.json antes del build`, () => {
      const build = steps.findIndex((s) => /\b(npm run build|opennextjs-cloudflare build)\b/.test(s.run ?? ""));
      const paises = steps.findIndex((s) => /countries:generate|data\/countries\.json/.test(s.run ?? ""));
      expect(paises, `${f}: falta el paso que genera data/countries.json`).toBeGreaterThanOrEqual(0);
      expect(paises, `${f}: el paso de países va después del build`).toBeLessThan(build);
    });
  }
});
