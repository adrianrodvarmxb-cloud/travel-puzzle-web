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
