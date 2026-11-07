/** Guía de ciudad de prueba (solo tests; nada del sitio la importa). */
export const w = (n: number, word = "texto") => Array.from({ length: n }, () => word).join(" ");
export function sampleGuide(o: Record<string, unknown> = {}) {
  return {
    pais: "fr", ciudad: "paris", nombre: "París", targetTerm: "guia de prueba de paris",
    titulo: "Guía de París para tu primer viaje", publishedAt: "2026-11-07", author: "editorial" as const, origen: "agente-diario" as const,
    enBreve: w(45),
    sections: [
      { h2: "¿Qué ver primero?", answer: `${w(40)} según el [museo](https://www.louvre.fr/en/hours-admission/admission) 9.`, body: [w(40)] },
      { h2: "¿Cómo moverse?", answer: w(40), body: [w(40)] },
      { h2: "¿Qué reservar?", answer: `Reserva con tiempo, según el [sitio oficial](https://www.toureiffel.paris/en/preparing-your-visit/rates-and-visiting-conditions).`, body: [w(80), "Mira los [tours en París](/destinos/fr/paris)."] },
    ],
    comoLoSabemos: "Lo redactó el Equipo editorial de Travel Puzzle con apoyo de IA a partir de las fuentes públicas enlazadas.",
    ...o,
  };
}
