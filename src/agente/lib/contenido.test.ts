// REQ-3347: búsqueda en blog, guías de destino y ayuda para el agente.
import { describe, it, expect } from "vitest";
import { buscarContenido, type FuentesContenido } from "./contenido";

const fuentes: FuentesContenido = {
  posts: [{ slug: "que-llevar-a-cusco", pillar: "peru", title: "Qué llevar a Cusco", targetTerm: "qué llevar a Cusco", summary: "Lista para la altura", enBreve: "Lleva capas y protector solar.",
    sections: [{ h2: "¿Cómo evito el mal de altura?", answer: "Sube despacio y toma mate de coca." }], draft: false } as never],
  guias: [{ pais: "pe", ciudad: "cusco", nombre: "Cusco", titulo: "Guía de Cusco", targetTerm: "qué hacer en Cusco", enBreve: "Capital inca a 3,400 m.",
    sections: [{ h2: "¿Cuándo ir?", answer: "De mayo a septiembre, temporada seca." }] } as never],
  faq: [{ id: "pago", q: "¿Cómo pago mi reserva?", a: "Con tarjeta en la liga de pago del sitio.", tags: "pagar tarjeta" }],
};

describe("REQ-3347: contenido para Mila", () => {
  it("REQ-3347: encuentra en blog, guías y ayuda, con liga absoluta y respuestas", () => {
    const r = buscarContenido("cusco altura", fuentes, "https://travelpuzzle.com.mx");
    expect(r.map((x) => x.tipo)).toEqual(["blog", "guia"]);
    expect(r[0]).toMatchObject({ titulo: "Qué llevar a Cusco", enlace: "https://travelpuzzle.com.mx/blog/peru/que-llevar-a-cusco" });
    expect(r[0].respuestas).toContain("¿Cómo evito el mal de altura? Sube despacio y toma mate de coca.");
    expect(r[1].enlace).toBe("https://travelpuzzle.com.mx/destinos/pe/cusco");
    expect(buscarContenido("cómo pagar", fuentes, "https://x")[0]).toMatchObject({ tipo: "ayuda", titulo: "¿Cómo pago mi reserva?", enlace: "https://x/ayuda" });
  });
  it("REQ-3347: sin coincidencias regresa vacío; nunca borradores", () => {
    expect(buscarContenido("noruega", fuentes, "https://x")).toEqual([]);
    expect(buscarContenido("cusco", { ...fuentes, posts: [{ ...(fuentes.posts[0] as object), draft: true } as never], guias: [] }, "https://x")).toEqual([]);
  });
});
