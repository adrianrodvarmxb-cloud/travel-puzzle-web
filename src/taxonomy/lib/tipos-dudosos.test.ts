/**
 * Tipos dudosos (PO, 6 nov 2026, 22:36: «decide como los referentes»). Casos REALES del respaldo de producción del
 * 5-11 (FREETOUR de pago, id externo en cada caso): título es | en y resumen es + en como los arma `tourToInput`.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "../data/index";
import { classify } from "./classify";
import { combinado } from "./combined";
import { tourToInput } from "./run-plan";

const ft = (categoryId: number, durationMinutes: number | null, titleEs: string, titleEn: string, briefEs = "", briefEn = "", city: Record<string, string> | null = null) =>
  classify(tourToInput({ id: "x", categoryId, priceValue: 50, durationMinutes, titleEs, titleEn, briefEs, briefEn, guideLanguages: null, rating: null, reviewsNumber: 0, cityTr: city }), D, M);

describe("REQ-865/866: «Viajes de 1 día» de FREETOUR de 6 h o más (como GetYourGuide: excursión = sale de la ciudad base)", () => {
  // REQ-1253 (INC-008) corrige a REQ-865: D20 solo saca de «excursión» lo que NO sale de la ciudad. Hace falta una señal de
  // que se queda (el título nombra la ciudad base o dice «city tour», «en un día», «por el centro»…); la falta de una
  // palabra de salida ya no basta.
  it("REQ-1253: los 4 casos del PO salen de la ciudad base → Excursión de un día", () => {
    expect(ft(4, 480, "Excursión en grupo: Molinos de viento, Edam, Volendam y Marken", "Group Day Trip: Windmills, Edam, Volendam & Marken", "", "", { es: "Ámsterdam", en: "Amsterdam" }).formato).toBe("excursion-dia");
    expect(ft(4, 420, "Campo de exterminio de Treblinka", "Treblinka Extermination Camp", "", "", { es: "Varsovia", en: "Warsaw" }).formato).toBe("excursion-dia");
    expect(ft(4, 540, "Zipaquirá y Andres Carne de Res en Chía", "Zipaquira and Andres Carne de Res in Chia", "", "", { es: "Bogotá", en: "Bogota" }).formato).toBe("excursion-dia");
    expect(ft(4, 600, "Acceso anticipado a la excursión por el Círculo Dorado y la Laguna Secreta", "Early access Golden Circle and Secret Lagoon", "", "", { es: "Reikiavik", en: "Reykjavik" }).formato).toBe("excursion-dia");
    // sin el dato de la ciudad, la base «Viajes de 1 día» también gana
    expect(ft(4, 480, "Campo de exterminio de Treblinka", "Treblinka Extermination Camp").formato).toBe("excursion-dia");
  });

  it("REQ-1253: 6 h o más que nombran la ciudad base sin salir → Visita guiada (o Tour con transporte) con «dia-completo»", () => {
    const dubai = ft(4, 360, "Recorrido Turístico por Dubái", "Dubai Sightseeing Tour", "Descubre lo mejor de Dubái en un día", "Discover the best of Dubai in one day", { es: "Dubái", en: "Dubai" });
    expect(dubai.formato).toBe("visita-guiada");
    expect(dubai.atributos).toContain("dia-completo");
    const pekin = ft(4, 600, "Pekín Tour: Templo del Cielo, Palacio de Verano y Hutongs", "Beijing Tour: Temple of Heaven, Summer Palace, & Hutongs", "Únase a esta excursión para descubrir los tesoros de Pekín", "Join this tour to discover the treasures of Beijing!", { es: "Pekín", en: "Beijing" });
    expect(pekin.formato).toBe("visita-guiada"); // templo, palacio
    expect(pekin.atributos).toContain("dia-completo");
    // nombra la ciudad sin forma de city tour: gana la base y va a la lista de dudas
    const cairo = ft(4, 480, "Museo Egipcio, Copto e Islámico de El Cairo", "Egyptian Museum, Coptic & Islamic Cairo", "Disfrute de nuestra emocionante excursión de un día y descubra las maravillas del antiguo Egipto en el Museo Egipcio.", "Experience our thrilling day-long excursion", { es: "El Cairo", en: "Cairo" });
    expect(cairo.formato).toBe("excursion-dia");
    expect(cairo.reglaFormato.startsWith("duda:")).toBe(true);
    expect(ft(4, 480, "Tour de Bogota: la Candelaria, Monserrate, Museo del Oro, Museo Botero", "Bogotá Tour: La Candelaria, Monserrate, the Gold Museum, the Botero Museum", "Descubre Bogotá con nosotros, desde el encanto de \"La Candelaria\" hasta dos destacados museos.", "Discover Bogota with us, from the charm of \"La Candelaria\" to two outstanding museums.", { es: "Bogotá", en: "Bogota" }).formato).toBe("visita-guiada");
    expect(ft(4, 420, "Tour de Bogotá en bicicleta, día completo", "Bogota bike tour, full day", "", "", { es: "Bogotá", en: "Bogota" }).formato).toBe("tour"); // REQ-1250: transporte
    // nombra la ciudad base pero dice que sale: excursión
    expect(ft(4, 480, "Excursión a Toledo desde Madrid", "Toledo day trip from Madrid", "", "", { es: "Madrid", en: "Madrid" }).formato).toBe("excursion-dia");
  });

  it("REQ-866: con señal de salida sigue como excursión — «desde», «a [otro lugar]», «day trip», transporte o recogida incluidos, «cerca de»", () => {
    // título con «desde» / «from» (caso de control)
    expect(ft(4, 480, "Excursión a Toledo desde Madrid", "Toledo day trip from Madrid").formato).toBe("excursion-dia");
    // 42539 · «Excursión … de un día al Parque Nacional de Arusha» / «Day Trip»
    expect(ft(4, 420, "Excursión asequible de un día al Parque Nacional de Arusha", "Affordable Arusha National Park Day Trip").formato).toBe("excursion-dia");
    // «a [otro lugar]» tras tour, recorrido o visita (no «a pie»)
    expect(ft(4, 540, "Tour a la Catedral de Sal y al Parque Temático Jaime Duque y Zipaquirá", "Salt Cathedral and Jaime Duque Park Tour").formato).toBe("excursion-dia");
    expect(ft(4, 360, "Recorrido al Campo de Concentración Terezin", "Terezin Concentration Camp Tour").formato).toBe("excursion-dia");
    expect(ft(4, 400, "Tour a pie de día completo por el centro", "Full-day walking tour").formato).not.toBe("excursion-dia");
    // 61953 · «PickUp» en el título (transporte incluido)
    expect(ft(4, 600, "Nuevo y más barato; Mina de Sal de Zipaquirá y Laguna de Guatavita, PickUp", "New & Cheapest; Zipaquira Salt Mine & Guatavita Lagoon, PickUp").formato).toBe("excursion-dia");
    // 67403 · el resumen dice «cerca de Cartagena»
    expect(ft(4, 420, "Barú: Un paraíso Natural en Cartagena", "Baru: A Natural Paradise in Cartagena", "Únete a mí y descubre Barú, un paraíso natural cerca de Cartagena.", "Join me and discover Baru, a natural paradise near Cartagena.").formato).toBe("excursion-dia");
    // resumen: transporte incluido / recogida en el hotel
    expect(ft(4, 540, "Valle Sagrado completo", "Full Sacred Valley", "Transporte de ida y vuelta incluido.", "").formato).toBe("excursion-dia");
    expect(ft(4, 540, "Valle Sagrado completo", "Full Sacred Valley", "", "Hotel pickup and drop-off.").formato).toBe("excursion-dia");
  });

  it("REQ-866: lo que no es de 6 h o más no cambia (menos de 6 h, sin duración, circuitos)", () => {
    expect(ft(4, null, "Lo mejor de Toledo", "Best of Toledo").formato).toBe("excursion-dia"); // sin duración: como antes
    expect(ft(4, 240, "Visita guiada por Medellín", "Medellín guided tour").formato).toBe("visita-guiada"); // REQ-534; REQ-1252 (duda)
    expect(ft(4, 2880, "Ruta de 2 días por el desierto", "2-day desert route").formato).toBe("circuito");
  });
});

describe("REQ-867…870: actividades combinadas — el tipo principal domina y la otra va como tema", () => {
  it("REQ-867: tapas + flamenco → Momentos de autor (espectáculo) con tema gastronomía", () => {
    // 2047 · 3 h · cat. 12 (antes: caminata)
    const sabores = ft(12, 180, "Sabores de Madrid y Show de Flamenco", "Flavours of Madrid & Flamenco Show Tour", "Usted tomará una visita al espectáculo de flamenco apasionado y degustar unos deliciosos churros", "You'll take a visit to a passionate flamenco show and taste some delicious choco-churros on this fancy walking tour of Madrid.");
    expect(sabores.formato).toBe("experiencia-unica");
    expect(sabores.temas).toContain("gastronomia");
    // 290 · 5 h · cat. 5 (antes: tour)
    const ruta = ft(5, 300, "Ruta de Tapas y Flamenco en Madrid", "Tapas and Flamenco Crawl Madrid");
    expect(ruta.formato).toBe("experiencia-unica");
    expect(ruta.temas).toEqual(expect.arrayContaining(["gastronomia", "noche-espectaculos"]));
  });

  it("REQ-868: recorrido con cata o degustación → Caminata (a pie) o Visita guiada, con tema gastronomía", () => {
    // 83965 · 2 h · cat. 12
    const temple = ft(12, 120, "Tour por Temple Bar con Cata de Cerveza", "Temple Bar Tour with Beer Tasting");
    expect(temple.formato).toBe("caminata");
    expect(temple.temas).toContain("gastronomia");
    // 113344 · 2 h 30 · cat. 5 (antes: Momentos de autor por «cata»)
    const vinedo = ft(5, 150, "Visita a Viñedo y Cata de Vinos Tour", "Winery Tour and Wine Tasting Tour");
    expect(vinedo.formato).toBe("visita-guiada"); // REQ-1251: viñedo/bodega como sitio
    expect(vinedo.temas).toContain("gastronomia");
  });

  it("REQ-869: entre recorrido, espectáculo y clase domina lo que abre el título; la otra queda como tema", () => {
    // 54097 · concierto primero
    const organo = ft(13, 120, "Concierto de Gran Órgano en Budapest con visita al Tesoro", "Grand Organ Concert in Budapest with Treasury Visit");
    expect(organo.formato).toBe("experiencia-unica");
    expect(organo.temas).toContain("noche-espectaculos");
    // 45453 · crucero primero (cat. 7 Vida nocturna, antes Momentos de autor)
    const han = ft(7, 45, "Crucero por el río Han y danza Cham en crucero", "Han River Cruise & Cham Dancing by Cruise");
    expect(han.formato).toBe("tour");
    expect(han.temas).toContain("noche-espectaculos");
    // 73101 · visita a pie primero, taller después (cat. 12)
    const munich = ft(12, 150, "Visita guiada por las calles de Múnich y taller de plantillas con un artista local", "Munich Street Art Tour & Stencil Workshop with Local Artist");
    expect(munich.formato).toBe("caminata");
    expect(munich.temas).toContain("talleres-aprendizaje");
  });

  it("REQ-870: un combinado no se salta las precedencias de antes (excursión con salida, autoguiado, pieza libre)", () => {
    // 4026 · sale de Marrakech: sigue excursión aunque abra con «Clase de cocina»
    expect(ft(5, 480, "Clase de Cocina Bereber y Tour de Pueblos desde Marrakech", "Berber Cooking Class & Berber village Tour from Marrakech").formato).toBe("excursion-dia");
    expect(ft(12, 75, "Secretos culinarios de Bolonia: juego de exploración autoguiado y recorrido a pie", "Bologna culinary secrets: self-guided game and walk").formato).toBe("autoguiado");
    expect(classify({ proveedor: "freetour", categoriaId: 12, precio: 0, durationMinutes: 180, titulo: "Sabores de Madrid y Show de Flamenco" }, D, M).formato).toBe("pieza-libre");
  });

  it("REQ-867…869: «combinado» solo cuando hay dos actividades distintas; comidas incluidas no cuentan", () => {
    expect(combinado("Excursión de un día a Hue con almuerzo", D)).toBeNull();
    expect(combinado("Visita guiada a pie por el casco antiguo", D)).toBeNull();
    expect(combinado("Ruta de Tapas y Flamenco en Madrid", D)).toMatchObject({ principal: "espectaculo", secundarias: ["gastronomia"] });
    expect(combinado("Tour por Temple Bar con Cata de Cerveza", D)).toMatchObject({ principal: "recorrido", secundarias: ["gastronomia"] });
  });
});
