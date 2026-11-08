/**
 * Auditoría de tipos (PO, 6-11): casos REALES que salían con el formato equivocado (respaldo de producción del 5-11 e
 * imports/*.json). Cada caso falla con el clasificador anterior y pasa con la corrección en diccionario/mapeos/reglas.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "../data/index";
import { classify } from "./classify";
import { tripFormat } from "@/tours/lib/card-format";
import type { ClassifyInput } from "./types";

const ft = (categoriaId: number, precio: number, titulo: string, durationMinutes: number | null = 120): ClassifyInput =>
  ({ proveedor: "freetour", categoriaId, precio, durationMinutes, titulo });
const f = (i: ClassifyInput) => classify(i, D, M).formato;
const trip = (kind: string, titleEs: string, resumen = "", durationDays: number | null = 1) => tripFormat({ kind, priceFrom: 99, durationDays, titles: [titleEs], resumen });

describe("auditoría de tipos — casos reales", () => {
  it("REQ-532: caminata solo si es a pie; en barco, bici o vehículo es visita guiada (tour)", () => {
    expect(f(ft(12, 30, "Tour París Nocturno y Paseo en Barco por el Sena", 180))).toBe("tour");
    expect(f(ft(12, 45, "Recorrido a pie por Ámsterdam con crucero por los canales", 210))).toBe("tour");
    expect(f(ft(12, 40, "Combo Praga: Interiores del Castillo, Autobús y Barco Gratis", 180))).toBe("tour");
    expect(f(ft(12, 25, "Visita guiada a pie por el casco antiguo", 120))).toBe("caminata"); // sin cambio
  });

  it("REQ-533: audioguía, app o «por tu cuenta» en el título = autoguiado (precedencia #5), de cualquier proveedor", () => {
    expect(f(ft(12, 12, "Málaga Esencial: Tour Autoguiado por App Ontur", 90))).toBe("autoguiado");
    expect(f(ft(13, 15, "Top Lyon: Experiencia Auto Guiada por Aplicación DareMapp", 150))).toBe("autoguiado");
    expect(f(ft(21, 20, "El misterio del asesinato de Sibiu: juego de detectives autoguiado", 90))).toBe("autoguiado");
    expect(trip("tour", "Torre Eiffel hasta la cima con audioguía")).toBe("autoguiado");
    expect(trip("tour", "Mont-Saint-Michel con audioguía desde París")).toBe("autoguiado");
    expect(trip("tour", "Castillos del Loira por tu cuenta desde París")).toBe("autoguiado");
    expect(f(ft(12, 0, "Free tour por el centro histórico", 120))).toBe("pieza-libre"); // la pieza libre no cambia
  });

  it("REQ-534: «Viajes de 1 día» de FREETOUR (cat. 4) con menos de 6 h no es excursión: visita guiada o caminata", () => {
    expect(f(ft(4, 30, "Visita guiada por Medellín", 240))).toBe("visita-guiada"); // REQ-1252 (duda: sin señal)
    expect(f(ft(4, 20, "Lo mejor de Toruń: visita guiada a pie en inglés", 90))).toBe("caminata");
    // REQ-1253 corrige a REQ-865: sin nombrar la ciudad base ni una palabra de ciudad, la base «Viajes de 1 día» gana.
    expect(f(ft(4, 90, "Descubre la Magia de Cesky Krumlov", 600))).toBe("excursion-dia");
    expect(f(ft(4, 90, "Descubre la Magia de Cesky Krumlov desde Praga", 600))).toBe("excursion-dia"); // con salida sigue
    expect(f(ft(4, 90, "Excursión a Toledo", null))).toBe("excursion-dia"); // sin duración, como antes
    expect(f(ft(4, 40, "Excursión de un día al Taj Mahal", 150))).toBe("excursion-dia"); // el título manda sobre una duración mal cargada
    expect(f(ft(19, 40, "Excursión de un día a las Pirámides y la Esfinge", 300))).toBe("excursion-dia");
    expect(f(ft(10, 40, "Visita guiada por el campo en moto", 240))).toBe("tour");
    expect(f(ft(12, 40, "Tour de Día Completo por Praga", 300))).toBe("caminata"); // «día completo» en la ciudad no es excursión
    expect(f(ft(4, 40, "Excursiones con delfines Isla de Mnemba en Zanzíbar", 240))).toBe("excursion-dia");
  });

  it("REQ-535: viaje de un día que sale de la ciudad base (lo dice el resumen) = excursión de un día", () => {
    expect(trip("tour", "Versalles guiado en grupo pequeño (máx. 15)", "Medio día en Versalles con guía en grupo de hasta 15 personas, acceso prioritario y transporte desde París.")).toBe("excursion-dia");
    expect(trip("tour", "Versalles esencial guiado por la tarde", "Visita guiada de Versalles por la tarde con acceso reservado y transporte desde París, a precio reducido.")).toBe("excursion-dia");
    expect(trip("tour", "Disneyland París con transporte, 2 parques", "Transporte ida y vuelta desde París y boleto de un día.")).toBe("excursion-dia");
    expect(trip("tour", "Montaña de 7 Colores Vinicunca", "Día completo de caminata a la Montaña de Colores, a más de 5,000 metros de altura.")).toBe("excursion-dia");
    expect(trip("tour", "Tour Gastronómico en Lima", "Medio día de sabores peruanos con degustaciones guiadas en Lima.")).toBe("visita-guiada"); // REQ-1252 (duda)
    expect(trip("tour", "París en un día: Louvre, Notre-Dame y Sainte-Chapelle", "Notre-Dame, Sainte-Chapelle, Conciergerie, Louvre y Orangerie en un día, con entradas y coordinación.")).toBe("visita-guiada"); // no sale de París; REQ-1251: entradas
    expect(trip("tour", "Visita guiada al Palacio de Versalles (sin transporte)", "Para quien ya está en Versalles: visita guiada en español con acceso reservado.")).toBe("visita-guiada"); // REQ-1251
  });

  it("REQ-536: taller, clase, cata o espectáculo = Momentos de autor (en las categorías que lo permiten y en viajes)", () => {
    expect(f(ft(13, 25, "Clase Magistral de Panadería en Khiva: El Sabor de la Tradición", 60))).toBe("experiencia-unica");
    expect(f(ft(5, 35, "Experiencia de Cata de Vinos Albaneses", 150))).toBe("experiencia-unica");
    expect(f(ft(13, 40, "Pekín: Asiento VIP del espectáculo acrobático Qinlegong", 60))).toBe("experiencia-unica");
    expect(trip("tour", "Ópera Garnier guiada y taller de perfume Fragonard")).toBe("experiencia-unica");
    expect(trip("tour", "Espectáculo del Caballo Peruano de Paso")).toBe("experiencia-unica");
  });

  it("REQ-537: traslado al aeropuerto en «Tours en vehículo» (cat. 19) = traslado (va a /traslados)", () => {
    expect(f(ft(19, 40, "Traslado al Aeropuerto de Estambul", 120))).toBe("traslado");
    expect(f(ft(19, 40, "City tour en coche por Estambul", 180))).toBe("tour");
  });

  it("REQ-538: el import de Fantástica China declara la excursión a Macao como viaje de un día, no circuito", () => {
    const b = JSON.parse(readFileSync("imports/fantasticachina-2027.json", "utf8")) as { trips: { trip: { titleEs: string; kind: string; durationDays: number | null } }[] };
    const macao = b.trips.map((e) => e.trip).find((t) => t.titleEs.startsWith("Excursión de un día a Macao"))!;
    expect(macao.kind).toBe("tour");
    expect(macao.durationDays).toBe(1);
    expect(trip(macao.kind, macao.titleEs, "", macao.durationDays)).toBe("excursion-dia");
  });
});
