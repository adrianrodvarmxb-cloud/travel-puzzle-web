/**
 * ARTÍCULO DE EJEMPLO EN BORRADOR (draft: true). No se pinta en producción ni entra al sitemap.
 * Sirve para ver la plantilla de 14 bloques en el preview (BLOG_SHOW_DRAFTS="true").
 * Todo lo que falta va como [PO: …]; nada se rellena. Plan del blog: CN-01, pilar China, semana 2.
 */
import type { PostInput } from "../../lib/schema";

export const post: PostInput = {
  slug: "visa-china-para-mexicanos",
  pillar: "china",
  targetTerm: "visa china para mexicanos",
  title: "¿Los mexicanos necesitan visa para China?",
  summary: "Qué pide China a los viajeros mexicanos, cómo se tramita y qué excepciones hay. [PO: verificar con la fuente oficial vigente]",
  draft: true,
  publishedAt: "2027-01-18",
  author: "claudia",
  enBreve:
    "[PO: respuesta de 40 a 80 palabras con la fuente oficial vigente (embajada o consulado de China en México) y la fecha en que se verificó. Hoy los medios se contradicen: Expansión (26 may 2026) dice que sí se necesita visa y El Imparcial (20 ene 2026) cita una estancia de 240 horas sin visa.]",
  entrada:
    "[PO: el dolor del viajero en 2 o 3 frases, desde la entrevista.] Este artículo es parte de la guía [Viajar a China desde México](/blog/china). Si ya sabes a dónde quieres ir, mira los [viajes a China](/tours?search=China).",
  sections: [
    { h2: "¿Qué tipo de visa piden a un turista mexicano?", answer: "[PO: respuesta en 1 o 2 frases con la fuente oficial.]", body: [] },
    { h2: "¿Cómo es la solicitud?", answer: "[PO: pasos de la solicitud según la fuente oficial vigente.]", body: [] },
    { h2: "¿Cuánto cuesta y dónde se paga?", answer: "[PO: solo la tarifa oficial vigente, con su fuente; nunca una cifra estimada.]", body: [] },
    { h2: "¿Con cuánta anticipación conviene tramitarla?", answer: "[PO: criterio de Claudia, de la entrevista.]", body: [] },
    { h2: "¿Hay excepciones?", answer: "[PO: tránsito de 240 horas, Hong Kong y Macao, según la fuente oficial.]", body: [] },
    { h2: "¿Qué revisamos antes de que viajes?", answer: "[PO: qué revisa Travel Puzzle con el viajero, de la entrevista.]", body: [] },
  ],
  minicaso: { text: "[PO: caso de un viajero que tramitó la visa con Travel Puzzle, sin su nombre: situación, decisión y resultado.]", illustrative: false },
  citas: [{ text: "[PO: cita de Claudia con el minuto de la grabación.]", who: "Claudia Rodríguez" }],
  comoLoSabemos:
    "[PO: de dónde sale el contenido. Mientras sea borrador no se afirma entrevista ni aprobación. Propuesta: «Escrito por Claudia Rodríguez con apoyo de IA para la estructura; requisitos verificados en [fuente] el [fecha]».]",
  visual: {
    kind: "tabla",
    caption: "Visa de turista, tránsito y Hong Kong o Macao [PO: llenar con la fuente oficial]",
    head: ["Caso", "Quién", "Cuánto tiempo", "Qué se necesita"],
    rows: [
      ["Visa de turista", "[PO: …]", "[PO: …]", "[PO: …]"],
      ["Tránsito sin visa", "[PO: …]", "[PO: …]", "[PO: …]"],
      ["Hong Kong o Macao", "[PO: …]", "[PO: …]", "[PO: …]"],
    ],
  },
  faq: [
    { q: "¿La visa de Estados Unidos sirve para entrar a China?", a: "[PO: respuesta con fuente oficial.]" },
    { q: "¿Puedo entrar por Hong Kong?", a: "[PO: respuesta con fuente oficial.]" },
  ],
  cta: { kind: "whatsapp", label: "Hablar con un asesor" },
};
