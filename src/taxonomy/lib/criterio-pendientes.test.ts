/**
 * Criterio firmado por el PO (6-11, 21:14) para los pendientes de la auditoría de tipos: un tipo principal + atributos y
 * temas que lo complementan. Casos REALES (respaldo de producción del 5-11 e imports/*.json).
 */
import { describe, expect, it } from "vitest";
import dictionary from "../data/dictionary.json";
import { DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "../data/index";
import { classify } from "./classify";
import { ATRIBUTOS_FACETA, ATRIBUTO_FACETA_LABEL, atributoFacetaLabel } from "./filters";
import { tourLabels } from "./copy";
import type { ClassifyInput } from "./types";

const ft = (categoriaId: number, precio: number, titulo: string, durationMinutes: number | null = 120): ClassifyInput =>
  ({ proveedor: "freetour", categoriaId, precio, durationMinutes, titulo });
const tr = (titulo: string, resumen: string, durationDays: number | null = 1, kind = "tour"): ClassifyInput =>
  ({ proveedor: "propios", categoriaId: kind, precio: 99, durationDays, titulo, resumen });
const c = (i: ClassifyInput) => classify(i, D, M);

describe("criterio del PO para los pendientes (6-11, 21:14)", () => {
  it("REQ-540: visita guiada que incluye la entrada = visita guiada (tour) con «entrada-incluida»; boletos solo sin guía", () => {
    const louvre = c(tr("Louvre: obras maestras con entrada reservada", "Entrada al Louvre con acceso reservado y orientación con guía por una ruta optimizada hacia las obras maestras."));
    expect(louvre.formato).toBe("tour");
    expect(louvre.atributos).toContain("entrada-incluida");
    const prado = c(ft(24, 30, "Visita guiada al Museo del Prado con entrada", 120));
    expect(prado.formato).toBe("tour");
    expect(prado.atributos).toContain("entrada-incluida");
    expect(c(ft(24, 20, "Entrada al Museo del Prado", 120)).formato).toBe("entradas");
    expect(c(tr("Entrada completa a Versalles: palacio, jardines y Trianon", "Boleto para el palacio, los jardines y el dominio de Trianon con la Aldea de la Reina; sin transporte.")).formato).toBe("entradas");
    const mdina = c(ft(14, 30, "Recorrido a pie por Mdina con entrada a las catacumbas"));
    expect(mdina.formato).toBe("caminata"); // a pie: el tipo es caminata y la entrada va como atributo
    expect(mdina.atributos).toContain("entrada-incluida");
  });

  it("REQ-541: recorrido a pie con degustación = caminata con tema gastronomía; Momentos de autor solo talleres, clases, catas sentadas y espectáculos", () => {
    const atenas = c(ft(5, 40, "Ruta gastronómica y a pie por Atenas", 180));
    expect(atenas.formato).toBe("caminata");
    expect(atenas.temas).toContain("gastronomia");
    const matera = c(ft(12, 40, "Visita completa a pie de Sassi di Matera con degustación", 180));
    expect(matera.formato).toBe("caminata");
    expect(matera.temas).toContain("gastronomia");
    const montmartre = c(tr("Montmartre a pie con degustaciones", "Recorrido guiado a pie por Montmartre con degustaciones gastronómicas. Guía en inglés."));
    expect(montmartre.formato).toBe("caminata");
    expect(montmartre.temas).toContain("gastronomia");
    expect(c(ft(5, 35, "Ruta de cata de vinos en Berat", 120)).formato).toBe("tour"); // ruta, no cata sentada
    expect(c(ft(5, 35, "Experiencia de Cata de Vinos Albaneses", 150)).formato).toBe("experiencia-unica");
    expect(c(ft(13, 25, "Clase Magistral de Panadería en Khiva", 60)).formato).toBe("experiencia-unica");
    expect(c(ft(13, 40, "Pekín: Asiento VIP del espectáculo acrobático Qinlegong", 60)).formato).toBe("experiencia-unica");
  });

  it("REQ-542: día completo sin salir de la ciudad = visita guiada con «dia-completo»; excursión solo si sale de la ciudad base", () => {
    const paris = c(tr("París en un día: Louvre, Notre-Dame y Sainte-Chapelle", "Notre-Dame, Sainte-Chapelle, Conciergerie, Louvre y Orangerie en un día, con entradas y coordinación."));
    expect(paris.formato).toBe("tour");
    expect(paris.atributos).toContain("dia-completo");
    const praga = c(ft(12, 40, "Tour de Día Completo por Praga", 300));
    expect(praga.formato).toBe("caminata");
    expect(praga.atributos).toContain("dia-completo");
    const versalles = c(tr("Versalles guiado en grupo pequeño (máx. 15)", "Medio día en Versalles con guía en grupo de hasta 15 personas, acceso prioritario y transporte desde París."));
    expect(versalles.formato).toBe("excursion-dia");
    expect(versalles.atributos).not.toContain("dia-completo");
    expect(c(ft(12, 25, "Visita guiada a pie por el casco antiguo", 120)).atributos).not.toContain("dia-completo");
  });

  it("REQ-543: «entrada-incluida» y «dia-completo» existen en el diccionario con es/en y quedan como facetas del filtro", () => {
    const at = (dictionary.terminos as { eje: string; slug: string; termino_es: string; termino_en: string; estado: string }[]).filter((t) => t.eje === "atributo");
    for (const slug of ["entrada-incluida", "dia-completo"]) {
      const t = at.find((x) => x.slug === slug)!;
      expect(t, slug).toBeTruthy();
      expect(t.estado).toBe("activo");
      expect(ATRIBUTO_FACETA_LABEL[slug as (typeof ATRIBUTOS_FACETA)[number]]).toEqual({ es: t.termino_es, en: t.termino_en });
    }
    expect([...ATRIBUTOS_FACETA]).toEqual(["entrada-incluida", "dia-completo"]);
    expect(atributoFacetaLabel("dia-completo", "es")).toBe("Día completo");
    expect(atributoFacetaLabel("entrada-incluida", "en")).toBe("Admission included");
  });

  it("REQ-544: la ficha muestra los atributos como chips (fuera de la foto), junto al formato", () => {
    expect(tourLabels("tour", "es", ["entrada-incluida", "privado", "dia-completo"])).toEqual(["Tour", "Entrada incluida", "Día completo"]);
    expect(tourLabels("caminata", "es", [])).toEqual(["Caminata (tour a pie)"]);
    expect(tourLabels("caminata", "es")).toEqual(["Caminata (tour a pie)"]);
  });

  it("REQ-545: «Excursiones en Kampala» (dentro de la ciudad) no es excursión de un día", () => {
    expect(c(ft(7, 45, "Excursiones en Kampala", 420)).formato).toBe("experiencia-unica");
    expect(c(ft(4, 45, "Excursión a Jinja desde Kampala", 480)).formato).toBe("excursion-dia");
  });
});

describe("criterio del PO — casos de la segunda pasada (6-11)", () => {
  it("REQ-542: «día completo» que sale de la ciudad sigue siendo excursión; «city tour», «en {ciudad}» o «por {ciudad}» son visita guiada con día completo", () => {
    expect(c(ft(4, 90, "Tour de Día Completo a Laguna Humantay", 480)).formato).toBe("excursion-dia");
    expect(c(ft(4, 90, "Día Completo en el Parque Nacional Udawalawe Safari", 600)).formato).toBe("excursion-dia");
    expect(c(tr("Versalles privado día completo con almuerzo (1-7)", "Día completo privado en Versalles con guía, almuerzo y recogida en tu alojamiento en París.")).formato).toBe("excursion-dia");
    const rio = c(ft(4, 90, "City Tour Día Completo en Río: Cristo Redentor y Pan de Azúcar", 600));
    expect(rio.formato).toBe("tour");
    expect(rio.atributos).toContain("dia-completo");
    expect(c(ft(4, 90, "Tour de día completo en Florencia: Visita guiada semiprivada", 435)).formato).toBe("tour");
    expect(c(ft(4, 90, "Visita privada de día completo por Lisboa: Belém, Alfama y pastel de nata", 480)).formato).toBe("tour");
  });

  it("REQ-541: «ruta»/«recorrido» no anulan una clase, un taller o un espectáculo", () => {
    expect(c(ft(13, 30, "Dar forma a la Ruta de la Seda: Clase magistral de alfarería y cerámica en Khiva", 120)).formato).toBe("experiencia-unica");
    expect(c(ft(13, 30, "Espectáculo temático de acción real «La Ruta Marítima de la Seda de Guangzhou»", 90)).formato).toBe("experiencia-unica");
    expect(c(ft(5, 30, "Recorrido gastronómico por la cocina árabe tradicional", 150)).formato).toBe("tour");
  });
});
