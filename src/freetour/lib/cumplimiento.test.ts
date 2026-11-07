/**
 * Garantía de cumplimiento FREETOUR (skill cumplimiento-freetour; auditoría docs/freetour/auditoria-2026-11-06.md).
 * Si alguien agrega código que rompe una regla, este archivo falla en CI antes de publicar.
 * Reutiliza los tests que ya cubren cada regla (los exige por ID, para que nadie los borre) y agrega los
 * escaneos que faltaban: copy visible, marcado de la ficha, /booking/messages, insignia de propina y recompensas.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { destinationTree, findCity } from "@/destinations/lib/catalog";
import { fx, tour } from "@/destinations/fixtures/destinos";
import { tourPage } from "@/destinations/lib/page-model";
import { operatedBy } from "@/tours/lib/favorite";
import { cardProvider } from "@/tours/lib/experience-card";
import { llmsTxt } from "@/seo/lib/robots";

const walk = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? (f === "node_modules" ? [] : walk(p)) : [p]; })
    : [];
const isCode = (f: string) => /\.(tsx?|jsx?|mjs)$/.test(f) && !/\.test\.|\.spec\./.test(f);
const read = (f: string) => readFileSync(f, "utf8");

/** Comentarios fuera: un comentario no llega al cliente. */
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");

/** Textos que puede ver el cliente: literales de cadena (sin las expresiones `${…}`) y texto de JSX. */
function visibleStrings(src: string): string[] {
  const code = stripComments(src);
  const literals = [...code.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)].map((m) => m[2].replace(/\$\{[^}]*\}/g, " "));
  const jsx = [...code.matchAll(/>([^<>{}]+)</g)].map((m) => m[1]);
  return [...literals, ...jsx].map((s) => s.trim()).filter(Boolean);
}

/** «FREETOUR», «Freetour», «freetours», «freetour.com», «free tour .com». «free tour» (categoría) no cuenta. */
const MENTION = /free\s*tour\s*\.\s*com|\bfreetours?\b/i;
/** Identificadores técnicos que no son copy: id del proveedor y rutas de módulos o de la API interna. */
const TECHNICAL = /^(freetour|\.{0,2}\/?(api\/)?freetour[\w/[\].{}-]*|@\/[\w/.-]*freetour[\w/.-]*|[\w./-]*\/freetour-client|\.\.?\/[\w/.-]+)$/;

/**
 * Superficies que ve el cliente. Fuera: APIs internas y de terceros, panel /admin, agente (bot interno, REQ-081),
 * scripts, sync, cliente de la API, ops, geo e ingesta; y los dos correos internos al equipo.
 */
const INTERNAL = /^src\/(app\/api|app\/admin|app\/\(auth\)|agente|scripts|freetour|lib\/api|lib\/db|lib\/mock-data|catalog|ops|geo|ingest|departures|search|taxonomy\/data|destinations\/fixtures|catalog\/fixtures)\/|\/admin\/|Admin[A-Z]\w*\.tsx$|^src\/notifications\/lib\/(manual-cancel-email|review-alert-email)\.ts$|^src\/booking\/gateway-client\.ts$|^src\/lib\/mock-data\.ts$/;

/**
 * Mención permitida (decisión del PO, 6 nov 2026; C3): solo en la ficha y solo en texto, sin logo.
 * Hoy la ficha dice «Operado por un guía local · {proveedor}» sin nombrar a FREETOUR, así que la lista va vacía.
 * Para agregar una, poner aquí el archivo y el texto exacto, con la autorización en docs/freetour/autorizaciones.md.
 */
const ALLOWED_MENTIONS: readonly { file: string; text: string }[] = [];

describe("REQ-616 FREETOUR no aparece en el copy visible al cliente (PO 6 nov 2026; C3)", () => {
  const files = walk("src").map((f) => f.replace(/\\/g, "/")).filter((f) => isCode(f) && !INTERNAL.test(f));

  it("REQ-616: el escaneo cubre páginas, componentes, traducciones, copy y correos al cliente", () => {
    for (const must of ["src/app/page.tsx", "src/components/tours/ExperienceCard.tsx", "src/lib/translations/es.ts", "src/notifications/lib/booking-email.ts", "src/home/lib/copy.ts", "src/seo/lib/robots.ts"]) {
      expect(files, must).toContain(must);
    }
    expect(files.length).toBeGreaterThan(200);
  });

  it("REQ-616: ningún literal ni texto de JSX visible menciona FREETOUR o freetour.com (salvo la mención permitida)", () => {
    const hits = files.flatMap((f) =>
      visibleStrings(read(f))
        .filter((s) => MENTION.test(s) && !TECHNICAL.test(s))
        .filter((s) => !ALLOWED_MENTIONS.some((a) => a.file === f && s.includes(a.text)))
        .map((s) => `${f}: «${s.slice(0, 100)}»`),
    );
    expect(hits).toEqual([]);
  });

  it("REQ-616: el detector sí encuentra las menciones (control del propio escaneo)", () => {
    const sample = `const a = "Reserva con FREETOUR.com"; const b = <p>Operado por Freetour</p>; // freetour en comentario no cuenta
      const c = "free tour"; const d = "@/lib/api/freetour-client"; const e = \`\${t.isFreeTour} free tours\`;`;
    expect(visibleStrings(sample).filter((s) => MENTION.test(s) && !TECHNICAL.test(s))).toEqual(["Reserva con FREETOUR.com", "Operado por Freetour"]);
  });

  it("REQ-616: «Operado por…» y el proveedor de la tarjeta nunca nombran a FREETOUR (REQ-098, REQ-524)", () => {
    for (const p of ["FREETOUR.com", "Freetour Lima", "free tour .com"]) {
      expect(operatedBy(p, "es")).toBe("Operado por un guía local");
      expect(cardProvider(p)).toBeNull();
    }
    expect(operatedBy("Guía Ana", "es")).toBe("Operado por un guía local · Guía Ana");
  });

  it("REQ-616: llms.txt no menciona a FREETOUR", () => {
    expect(llmsTxt({ siteUrl: "https://travelpuzzle.com.mx", destinations: [{ name: "Perú", url: "https://travelpuzzle.com.mx/destinos/peru" }] })).not.toMatch(MENTION);
  });

  it("REQ-616: el sitio no sirve logos ni marcas de FREETOUR (C3)", () => {
    expect(walk("public").filter((f) => /free[\s_-]*tour/i.test(f))).toEqual([]);
  });
});

describe("REQ-615 el marcado de una ficha de FREETOUR no lleva AggregateRating, review ni enriquecimiento nuevo (Gate 2, C2)", () => {
  const site = "https://travelpuzzle.com.mx";
  // Tours con calificación y miles de reseñas del proveedor: justo lo que no debe llegar al JSON-LD.
  const tree = destinationTree({ ...fx, tours: [tour(10, 1, { title: "Centro Histórico", rating: 4.9, reviews: 2400, provider: "Guía Ana" }), tour(10, 1, { title: "Xochimilco", price: 25, rating: 4.7, reviews: 800 }), tour(10, 1, { title: "Coyoacán" })], trips: [], now: new Date("2026-11-06T12:00:00Z") });
  const city = findCity(tree, "mx", "ciudad-de-mexico")!;
  const fichas = [...city.city.freeTours, ...city.city.paidTours].map((t) => tourPage({ country: city.country, city: city.city, tour: t, siteUrl: site, lang: "es" }));

  it("REQ-615: hay fichas libres y de pago en la prueba", () => {
    expect(city.city.freeTours.length).toBeGreaterThan(0);
    expect(city.city.paidTours.length).toBeGreaterThan(0);
  });

  it.each([["aggregateRating"], ["review"], ["reviews"], ["description"], ["keywords"]])("REQ-615: ninguna ficha de FREETOUR lleva «%s» en el JSON-LD", (key) => {
    const has = (v: unknown): boolean => !!v && typeof v === "object" && (Object.prototype.hasOwnProperty.call(v, key) || Object.values(v as object).some(has));
    for (const f of fichas) expect(f.jsonLd.some(has), f.meta.canonical).toBe(false);
  });

  it("REQ-615: el operador del marcado nunca es FREETOUR (C3, C6)", () => {
    for (const f of fichas) expect(JSON.stringify(f.jsonLd)).not.toMatch(/"name":"[^"]*free\s*tour\s*\.?\s*com|"name":"freetour/i);
  });
});

describe("REQ-617 /booking/messages solo pasa por el filtro de enlaces y 5000 caracteres (A5)", () => {
  it("REQ-617: todo código que llame a /booking/messages usa checkProviderMessage (o hasLink en la pasarela)", () => {
    const files = [...walk("src"), ...walk("gateway"), "worker.ts"].map((f) => f.replace(/\\/g, "/")).filter(isCode);
    const callers = files.filter((f) => f !== "src/booking/lib/provider-message.ts" && /booking\/messages|["'`]\/messages["'`]|sendProviderMessage|op:\s*["'`]message/i.test(stripComments(read(f))));
    const unguarded = callers.filter((f) => !/checkProviderMessage|hasLink/.test(read(f)));
    expect(unguarded).toEqual([]);
  });
});

describe("REQ-614 la insignia de propina solo sale con fullPricePerGroup = 0 (D1, D2)", () => {
  it("REQ-614: el texto de la insignia solo se pinta a través de primeraPiezaBadge (nadie usa la constante directo)", () => {
    const users = walk("src").map((f) => f.replace(/\\/g, "/")).filter((f) => isCode(f) && f !== "src/tours/lib/badge.ts" && /PRIMERA_PIEZA_BADGE|Tú decides cuánto vale/.test(stripComments(read(f))));
    expect(users).toEqual([]);
  });
});

describe("REQ-618 recompensas y venta cruzada no promueven tours de FREETOUR (B3, B4)", () => {
  const files = walk("src").map((f) => f.replace(/\\/g, "/")).filter(isCode);

  it("REQ-618: la UI de Puzzle Rewards no se monta en ninguna página sin la guarda de REQ-082", () => {
    const mounts = files.filter((f) => !f.startsWith("src/components/home/RewardsBanner/") && f !== "src/components/home/index.ts" && /RewardsBanner|RewardsChallenges/.test(stripComments(read(f))));
    expect(mounts.filter((f) => !/rewards-guard/.test(read(f)))).toEqual([]);
  });

  it("REQ-618: todo código que otorgue premios, piezas o descuentos pasa por rewards-guard", () => {
    const granters = files.filter((f) => f !== "src/freetour/lib/rewards-guard.ts" && /\b(grantReward|awardReward|otorgar(Premio|Recompensa)|addPoints|creditPoints|cashback)\b/i.test(stripComments(read(f))));
    expect(granters.filter((f) => !/rewards-guard/.test(read(f)))).toEqual([]);
  });

  it("REQ-618: la venta cruzada (correos y «Arma tu viaje») excluye FREETOUR en su origen", () => {
    expect(read("src/notifications/lib/cross-sell.ts")).toMatch(/isFreetourOffer/);
    expect(read("src/booking/notify.ts")).toMatch(/filterPostTourOffers/);
    expect(read("src/companions/lib/nearby.ts")).toMatch(/EXCLUDED_PROVIDERS = \["freetour"\]/);
  });
});

describe("REQ-618 los tests que ya cubren cada regla siguen ahí (no se borran ni se saltan)", () => {
  const required: [string, string[]][] = [
    ["src/notifications/lib/booking-email.test.ts", ["REQ-079", "REQ-610", "REQ-611"]], // A2: 9 campos
    ["src/tours/lib/badge.test.ts", ["REQ-095"]], // D2: insignia oculta si fullPricePerGroup > 0
    ["src/booking/lib/provider-message.test.ts", ["REQ-083"]], // A5: sin enlaces
    ["src/freetour/lib/rewards-guard.test.ts", ["REQ-082"]], // B4
    ["src/freetour/lib/promo-policy.test.ts", ["REQ-081"]], // B2/B3: post-tour y chatbot
    ["src/notifications/lib/cross-sell.test.ts", ["REQ-263"]], // venta cruzada sin FREETOUR
    ["src/companions/lib/nearby.test.ts", ["REQ-320", "REQ-321"]], // «Arma tu viaje» sin FREETOUR
    ["src/reviews/lib/platform-everywhere.test.ts", ["REQ-171"]], // reseñas que nombran la plataforma
    ["src/booking/service.test.ts", ["REQ-612"]], // G2: datos mínimos
    ["src/seo/lib/jsonld.test.ts", ["REQ-615"]], // Gate 2
    ["src/booking/lib/event-check.test.ts", ["REQ-620"]], // D2: umbral por evento (tours de pago)
    ["src/notifications/lib/status-emails.test.ts", ["REQ-621"]], // D3/A3: reembolso en rechazo y cancelación
    ["src/notifications/lib/booking-email.test.ts", ["REQ-622"]], // D1/D3: pago sin propina y con 24 h
  ];
  it.each(required)("REQ-618: %s", (file, ids) => {
    const src = read(file);
    for (const id of ids) expect(src, `${file} sin ${id}`).toMatch(new RegExp(`it(\\.each\\([^)]*\\))?\\(\\s*["'\`]${id}`));
    expect(src).not.toMatch(/\b(it|describe)\.(skip|todo)\(|\bxit\(/);
  });
});

describe("REQ-619 la auditoría de cumplimiento es legible y completa", () => {
  const doc = read("docs/freetour/auditoria-2026-11-06.md");
  const rows = doc.split("\n").filter((l) => /^\|\s*\d+\s*\|/.test(l)).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
  const VERDICTS = ["PERMITIDO", "PROHIBIDO", "AMBIGUO-PEDIR POR ESCRITO", "OBLIGATORIO FALTANTE"];

  it("REQ-619: cada fila tiene elemento, regla A–I, veredicto válido y ajuste", () => {
    expect(rows.length).toBeGreaterThan(30);
    for (const [n, elemento, regla, veredicto, ajuste] of rows) {
      expect(elemento, `fila ${n}`).not.toBe("");
      expect(regla, `fila ${n}`).toMatch(/\b[A-I]\d?\b|Gate|PO/);
      expect(VERDICTS, `fila ${n}: «${veredicto}»`).toContain(veredicto.replace(/\*/g, ""));
      expect(ajuste, `fila ${n}`).not.toBe("");
    }
  });

  it("REQ-619: lo PROHIBIDO u OBLIGATORIO FALTANTE cita el REQ o el PR que lo corrige", () => {
    for (const [n, , , veredicto, ajuste] of rows) {
      if (/PROHIBIDO|OBLIGATORIO FALTANTE/.test(veredicto)) expect(ajuste, `fila ${n}`).toMatch(/REQ-\d{3}|PR #\d+|candado/i);
    }
  });
});
