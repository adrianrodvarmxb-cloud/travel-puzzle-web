import { describe, expect, it } from "vitest";
import { validateDailyEntry, copiedFragments, factProblems, COPY_NGRAM, type DiarioCtx } from "./diario";
import { sampleDaily, samplePost } from "./fixtures";
import { parsePost, type Post, type PostInput } from "./schema";

const cal = [
  { id: "T-01", pillar: "europa", mix: "pago" as const, term: "termino diario de prueba", catalog: "/tours" },
  { id: "T-02", pillar: "europa", mix: "pago" as const, term: "otra guia distinta de viaje", catalog: "/tours" },
  { id: "T-F1", pillar: "europa", mix: "free" as const, term: "paseo libre de prueba", catalog: "/tours" },
];
const ctx = (o: Partial<DiarioCtx> = {}): DiarioCtx => ({
  today: "2026-11-07",
  existing: [],
  knownPaths: new Set(["/tours", "/destinos/fr/paris", "/destinos/fr/paris/paseo-de-prueba"]),
  primeraPieza: true,
  b1FreeTours: false,
  calendar: cal,
  ...o,
});
const run = (over: Partial<PostInput> = {}, c: Partial<DiarioCtx> = {}) => validateDailyEntry(sampleDaily(over), ctx(c));
const problems = (over: Partial<PostInput> = {}, c: Partial<DiarioCtx> = {}) => { const r = run(over, c); return r.ok ? [] : r.problems; };
const parsed = (o: Partial<PostInput>): Post => { const r = parsePost(samplePost(o)); if (!r.ok) throw new Error(r.error); return r.post; };
const s0 = sampleDaily().sections!;

describe("validador de la entrada diaria", () => {
  it("REQ-965: la entrada de ejemplo pasa", () => {
    const r = run();
    expect(r.ok ? [] : r.problems).toEqual([]);
  });

  it("REQ-965: rechaza si falta un bloque obligatorio de la plantilla del agente o trae minicaso o citas", () => {
    expect(problems({ datos: [] })).toContain("falta el bloque 8: al menos un dato con fuente");
    expect(problems({ visual: undefined })).toContain("falta el bloque 10: tabla");
    expect(problems({ minicaso: { text: "Situación de prueba.", illustrative: true } })).toContain("bloque 6 (minicaso) prohibido en una entrada del agente: requiere material del cliente");
    expect(problems({ citas: [{ text: "Cita.", who: "Alguien" }] })).toContain("bloque 7 (citas) prohibido en una entrada del agente: requiere material del cliente");
    expect(problems({ sections: s0.slice(0, 3) }).join(" ")).toMatch(/sections/);
    expect(problems({ comoLoSabemos: "Lo escribimos tras una entrevista con el equipo." })).toContain("bloque 9 «Cómo lo sabemos» debe decir que se usó IA y no afirmar entrevistas ni aprobaciones");
    expect(problems({ enBreve: "Muy corto." }).join(" ")).toMatch(/En breve/);
  });

  it("REQ-979: autor «Equipo editorial», origen agente-diario, mezcla y tema declarados", () => {
    expect(problems({ author: "claudia" })).toContain("el autor de una entrada del agente es «editorial» (Equipo editorial de Travel Puzzle)");
    expect(problems({ origen: "manual" })).toContain("origen debe ser «agente-diario»");
    expect(problems({ draft: true })).toContain("una entrada del agente se publica (draft: false)");
    expect(problems({ mix: undefined })).toContain("falta mix (pago o free)");
  });

  it("REQ-966: cifra o afirmación fáctica sin enlace en la misma unidad de texto", () => {
    const withDigit = [{ ...s0[0], answer: "Son 90 días de estancia." }, ...s0.slice(1)];
    expect(problems({ sections: withDigit })).toContain("cifra o afirmación sin fuente enlazada en sections[0].answer: «Son 90 días de estancia.»");
    const sourced = [{ ...s0[0], answer: "Son 90 días según la [embajada](https://example.org/embajada)." }, ...s0.slice(1)];
    expect(problems({ sections: sourced })).toEqual([]);
    const catalog = [{ ...s0[0], body: ["El [paseo de prueba](/destinos/fr/paris/paseo-de-prueba) dura 2 h."] }, ...s0.slice(1)];
    expect(problems({ sections: catalog })).toEqual([]);
    const req = [{ ...s0[0], list: ["El pasaporte es obligatorio para entrar."] }, ...s0.slice(1)];
    expect(problems({ sections: req })[0]).toMatch(/^cifra o afirmación sin fuente enlazada en sections\[0\]\.list\[0\]/);
    expect(problems({ visual: { kind: "tabla", caption: "Tabla", head: ["A", "B"], rows: [["Estancia", "90 días"]] } })).toContain("la tabla trae cifras: falta visual.source con su fuente");
    const daily = parsePost(sampleDaily());
    if (!daily.ok) throw new Error(daily.error);
    expect(factProblems({ ...daily.post, enBreve: "Texto sin cifras." })).toEqual([]);
  });

  it("REQ-967 + REQ-963: vocabulario prohibido, huecos, experiencia propia y promesas que no existen", () => {
    const bad = (t: string) => problems({ sections: [{ ...s0[0], body: [t] }, ...s0.slice(1)] });
    expect(bad("Lo opera FREETOUR en la ciudad.").join(" ")).toMatch(/vocabulario prohibido/);
    expect(bad("Lo recomiendan los expertos.").join(" ")).toMatch(/vocabulario prohibido/);
    expect(bad("Falta esto [CLIENTE: dato].").join(" ")).toMatch(/vocabulario del blog diario/);
    expect(bad("Nuestros clientes lo prefieren.").join(" ")).toMatch(/vocabulario del blog diario/);
    expect(bad("En nuestra experiencia conviene ir temprano.").join(" ")).toMatch(/vocabulario del blog diario/);
    expect(bad("Reserva y paga en línea hoy.").join(" ")).toMatch(/vocabulario del blog diario/);
    expect(bad("Mira [este sitio](https://www.freetour.com/es/paris).").join(" ")).toMatch(/vocabulario prohibido/);
  });

  it("REQ-968: un enlace interno que no resuelve o la falta del pilar, del hermano o de la página comercial", () => {
    const broken = [{ ...s0[0], body: ["Ve la [ciudad](/destinos/xx/no-existe)."] }, ...s0.slice(1)];
    expect(problems({ sections: broken })).toContain("enlace que no resuelve: /destinos/xx/no-existe");
    expect(problems({ entrada: "Mira los [tours en Europa](/tours?search=Europa)." })).toContain("falta enlace al pilar /blog/europa");
    const sib = parsed({ slug: "hermano", targetTerm: "hermano publicado", pillar: "europa", publishedAt: "2026-11-01" });
    expect(problems({}, { existing: [sib] })).toContain("falta enlace a un artículo hermano");
    const linked = { entrada: `${sampleDaily().entrada} Lee también la [guía hermana](/blog/europa/hermano).` };
    expect(problems(linked, { existing: [sib] })).toEqual([]);
    expect(problems({ entrada: "Parte de la guía [Viajar a Europa desde México](/blog/europa)." })).toContain("falta enlace a la página comercial");
    const draftSib = parsed({ slug: "borrador", targetTerm: "borrador europa", pillar: "europa", draft: true });
    expect(problems({ entrada: `${sampleDaily().entrada} [Borrador](/blog/europa/borrador).` }, { existing: [draftSib] })).toContain("enlace que no resuelve: /blog/europa/borrador");
  });

  it("REQ-969 + REQ-962: fecha real del día, sin updatedAt y sin romper la mezcla", () => {
    expect(problems({ publishedAt: "2026-11-06" })).toContain("publishedAt debe ser la fecha de hoy (2026-11-07)");
    expect(problems({ updatedAt: "2026-11-07" })).toContain("una entrada nueva no lleva updatedAt");
    const days = ["2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"];
    const eight = days.map((d, i) => parsed({ slug: `p${i}`, targetTerm: `pago ${"abcdefgh"[i]}`, pillar: "peru", publishedAt: d, mix: "pago", origen: "agente-diario" }));
    expect(problems({}, { existing: eight }).join(" ")).toMatch(/mezcla 80\/20/);
  });

  it("REQ-983: una entrada free se rechaza mientras B1 no esté autorizado", () => {
    const free = { mix: "free" as const, targetTerm: "paseo libre de prueba", tema: { tipo: "calendario" as const, clusterId: "T-F1", fuentes: [] } };
    expect(problems(free)).toContain("free tour bloqueado: falta la autorización B1 del proveedor por escrito (registro de autorizaciones, pregunta 7)");
    expect(problems(free, { b1FreeTours: true })).toEqual([]);
  });

  it("REQ-970: término o slug repetido, o casi igual a otro artículo, pilar u otro ID del calendario", () => {
    const same = parsed({ slug: "otro", targetTerm: "Término diario de prueba", pillar: "china" });
    expect(problems({}, { existing: [same] }).join(" ")).toMatch(/término repetido o casi igual: otro/);
    expect(problems({ targetTerm: "viajar a europa desde mexico", tema: { tipo: "trending", fuentes: sampleDaily().tema!.fuentes } }).join(" ")).toMatch(/pilar europa/);
    expect(problems({ targetTerm: "otras guias distintas de viaje", tema: { tipo: "trending", fuentes: trending } }).join(" ")).toMatch(/T-02/);
  });

  it("REQ-964: trending con 2 fuentes recientes de dominios distintos; calendario con ID pendiente que coincide", () => {
    expect(problems({ targetTerm: "noticia de prueba", tema: { tipo: "trending", fuentes: trending } })).toEqual([]);
    expect(problems({ targetTerm: "noticia de prueba", tema: { tipo: "trending", fuentes: trending.slice(0, 1) } })).toContain("tema trending: necesita 2 o más fuentes de dominios distintos publicadas en los 14 días previos (tiene 1)");
    expect(problems({ targetTerm: "noticia de prueba", tema: { tipo: "trending", fuentes: [trending[0], { ...trending[1], url: "https://uno.example.org/otra" }] } }).join(" ")).toMatch(/tiene 1/);
    expect(problems({ targetTerm: "noticia de prueba", tema: { tipo: "trending", fuentes: [trending[0], { ...trending[1], fecha: "2026-10-01" }] } }).join(" ")).toMatch(/tiene 1/);
    expect(problems({ tema: { tipo: "calendario", clusterId: "NO-EXISTE", fuentes: [] } })).toContain("tema calendario: el ID NO-EXISTE no está en el calendario");
    expect(problems({ tema: { tipo: "calendario", clusterId: "T-02", fuentes: [] } })).toContain("tema calendario: el término debe ser el del ID T-02 («otra guia distinta de viaje»)");
    const used = { ...parsed({ slug: "usado", targetTerm: "algo viejo", pillar: "china" }), tema: { tipo: "calendario" as const, clusterId: "T-01", fuentes: [] } };
    expect(problems({}, { existing: [used] })).toContain("tema calendario: el ID T-01 ya se usó (usado)");
  });

  it("REQ-963: C2 — no se copian 12 palabras seguidas de la ficha enlazada (los títulos entre «» sí)", () => {
    expect(COPY_NGRAM).toBe(12);
    const ficha = "Este recorrido a pie te lleva por las calles del centro histórico con un guía local que cuenta la historia de cada plaza y cada iglesia";
    const copied = [{ ...s0[0], body: ["El [paseo de prueba](/destinos/fr/paris/paseo-de-prueba): recorrido a pie te lleva por las calles del centro histórico con un guía local que cuenta la historia."] }, ...s0.slice(1)];
    expect(problems({ sections: copied }, { fichaTexts: { "/destinos/fr/paris/paseo-de-prueba": ficha } }).join(" ")).toMatch(/C2: texto copiado de \/destinos\/fr\/paris\/paseo-de-prueba/);
    expect(copiedFragments("Se llama «Este recorrido a pie te lleva por las calles del centro histórico con un guía local» y dura poco.", ficha)).toEqual([]);
  });
});

const trending = [
  { label: "Fuente uno", url: "https://uno.example.org/nota", fecha: "2026-11-05" },
  { label: "Fuente dos", url: "https://dos.example.com/nota", fecha: "2026-11-01" },
];

describe("imágenes en el validador del diario", () => {
  it("REQ-1051: una entrada del agente sin portada o sin fotos en el cuerpo NO se publica", () => {
    expect(problems({ cover: undefined })).toContain("falta la portada (hero) con licencia");
    expect(problems({ imagenes: [] })).toContain("el cuerpo necesita de 2 a 4 fotos (tiene 0)");
  });
});
