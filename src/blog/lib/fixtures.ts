/**
 * Datos de prueba para los tests del blog. NO es contenido: no se registra en src/blog/content ni se pinta.
 * Textos neutros («texto de prueba») para no inventar datos de viaje.
 */
import type { PostInput } from "./schema";

const words = (n: number) => Array.from({ length: n }, (_, i) => `palabra${i}`).join(" ");

export function samplePost(over: Partial<PostInput> = {}): PostInput {
  return {
    slug: "articulo-de-prueba",
    pillar: "china",
    targetTerm: "termino de prueba",
    title: "Artículo de prueba: ¿cómo se valida?",
    summary: "Resumen de prueba del artículo para la tarjeta y la descripción.",
    draft: false,
    publishedAt: "2027-01-11",
    author: "claudia",
    enBreve: words(50),
    entrada: "Entrada de prueba con el [pilar de la guía](/blog/china) y un [artículo hermano](/blog/china/hermano-de-prueba).",
    sections: [1, 2, 3, 4].map((i) => ({
      h2: `¿Pregunta de prueba ${i}?`,
      answer: `Respuesta corta de prueba ${i}.`,
      body: [i === 1 ? "Ver [viajes a China](/tours?search=China) en el catálogo." : `Párrafo de prueba ${i} con **negrita**.`],
    })),
    minicaso: { text: "Situación, decisión y resultado de prueba.", illustrative: true },
    citas: [{ text: "Cita de prueba.", who: "Autora de prueba" }],
    datos: [{ text: "Dato de prueba.", source: { label: "Fuente de prueba", url: "https://example.org/fuente" }, checkedAt: "2027-01-05" }],
    comoLoSabemos: "Texto de prueba sobre el origen del contenido.",
    visual: { kind: "tabla", caption: "Tabla de prueba", head: ["A", "B"], rows: [["1", "2"]] },
    faq: [{ q: "¿Pregunta frecuente de prueba?", a: "Respuesta de prueba." }],
    cta: { kind: "whatsapp", label: "Hablar con un asesor" },
    ...over,
  };
}

const plain = (n: number) => Array.from({ length: n }, () => "texto").join(" ");

/** REQ-1050: foto de banco de prueba (Unsplash) con alt, crédito, licencia y origen. Solo para tests. */
export function sampleImage(name: string, o: { descarga?: string } = {}) {
  return {
    src: `/blog/img/entrada-diaria-de-prueba/${name}`,
    alt: `Foto de prueba ${name}`,
    credit: "Foto: Autora de Prueba / Unsplash",
    license: { name: "Unsplash License" as const, url: "https://unsplash.com/license" },
    origen: { banco: "unsplash" as const, id: `id-${name}`, pagina: `https://unsplash.com/photos/${name}`, autor: "Autora de Prueba", descarga: o.descarga ?? `https://images.unsplash.com/photo-${name}` },
  };
}

/** REQ-965: entrada del agente diario que pasa el validador (plantilla sin minicaso ni citas). Solo para tests. */
export function sampleDaily(over: Partial<PostInput> = {}): PostInput {
  return {
    slug: "entrada-diaria-de-prueba",
    pillar: "europa",
    targetTerm: "termino diario de prueba",
    title: "¿Entrada diaria de prueba?",
    summary: "Resumen de prueba de la entrada diaria.",
    draft: false,
    publishedAt: "2026-11-07",
    author: "editorial",
    origen: "agente-diario",
    mix: "pago",
    tema: { tipo: "calendario", clusterId: "T-01", fuentes: [] },
    enBreve: plain(45),
    entrada: "Parte de la guía [Viajar a Europa desde México](/blog/europa). Mira los [tours en Europa](/tours?search=Europa).",
    sections: [1, 2, 3, 4].map((i) => ({ h2: `¿Pregunta diaria ${["uno", "dos", "tres", "cuatro"][i - 1]}?`, answer: "Respuesta corta de prueba.", body: ["Párrafo de prueba con **negrita**."] })),
    datos: [{ text: "Dato de prueba con 90 días.", source: { label: "Fuente de prueba", url: "https://example.org/dato" }, checkedAt: "2026-11-06" }],
    comoLoSabemos: "Redactado por el equipo editorial con apoyo de IA a partir de las fuentes públicas enlazadas y del catálogo del sitio.",
    visual: { kind: "tabla", caption: "Tabla de prueba", head: ["A", "B"], rows: [["uno", "dos"]] },
    cta: { kind: "comercial", label: "Ver tours en Europa" },
    cover: sampleImage("portada"),
    imagenes: [{ formato: "dos", despues: 1, fotos: [sampleImage("a"), sampleImage("b")] }],
    ...over,
  };
}
