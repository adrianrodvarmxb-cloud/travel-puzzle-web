import { describe, expect, it } from "vitest";
import { TABLA_DIFICULTAD_TANGOL, dificultadDesdeTexto, nivelPorAltura, resumenDificultad } from "./difficulty";

// REQ-10656 (construye la decisión 12, REQ-10591): la dificultad que Tangol manda como texto libre cae en la escala
// 1–5 del diccionario por una tabla de equivalencias; lo que la tabla no reconoce va a dudas y no se muestra.
describe("REQ-10656: equivalencias de dificultad de Tangol a la escala 1–5", () => {
  it("REQ-10656: «Fácil», «Baja» y «<p>Baja</p>» caen igual", () => {
    const esperado = { nivel: 1, regla: "termino:facil" };
    for (const t of ["Fácil", "Baja", "<p>Baja</p>", "Bajo.", "- Baja.", "**Bajo", "<p>**Bajo</p>", "*baja", "BAJA.", "Facil", "Fácii", "Leve", "baja exigencia"]) {
      expect(dificultadDesdeTexto(t), t).toMatchObject(esperado);
    }
  });
  it("REQ-10656: «Para toda la familia» y «No necesita» son nivel 1", () => {
    expect(dificultadDesdeTexto("<p>Para toda la familia</p>")?.nivel).toBe(1);
    expect(dificultadDesdeTexto("<p>Baja, para toda la familia</p>")?.nivel).toBe(1);
    expect(dificultadDesdeTexto("<p>No necesita</p>")?.nivel).toBe(1);
  });
  it("REQ-10656: media y moderado son 3; los rangos bajo-medio son 2 y medio-alto son 4", () => {
    for (const t of ["Media", "Medio", "Moderado", "<p>Moderada</p>", "Mediano", "*Mediana", "-Medio", "**Caminata moderada", "<p>Exigencia media.</p>", "- Media (Caminata leve de 3 horas de duración)"]) {
      expect(dificultadDesdeTexto(t)?.nivel, t).toBe(3);
    }
    for (const t of ["Fácil/Moderado", "Fácil a Moderado", "Baja/Media.", "<p>Baja - Media</p>", "**Bajo/moderado"]) {
      expect(dificultadDesdeTexto(t)?.nivel, t).toBe(2);
    }
    for (const t of ["Media - Alta", "Medio - Alto", "Medio-alto", "Moderado/Alto", "Medio-Difícil.", "<p>Moderada y Alta</p>", "**Moderado / difícil", "Dificultad media a alta. Se recomienda tener buena condición física."]) {
      expect(dificultadDesdeTexto(t)?.nivel, t).toBe(4);
    }
  });
  it("REQ-10656: «Alta» y «Exigente» son 4 (Exigente); el 5 solo con «muy» o altura de 4,500 m", () => {
    for (const t of ["Alta", "ALTA", "<p>Alto</p>", "<p>Exigente - Alto</p>", "<p>Alto, Exigente.</p>", "ALTA\r\n* Duración. 6/7 hs totales \r\n* Desnivel: 650 mts"]) {
      expect(dificultadDesdeTexto(t)?.nivel, t).toBe(4);
    }
    expect(dificultadDesdeTexto("Muy alta")?.nivel).toBe(5);
    expect(dificultadDesdeTexto("Muy exigente")?.nivel).toBe(5);
  });
  it("REQ-10656: «Dificultad: X / Altura: N msnm» toma el mayor entre el término y la altura (REQ-1519: desde 3,500 m = 4)", () => {
    expect(dificultadDesdeTexto("Dificultad: Media / Altura: 2.400 msnm.")).toMatchObject({ nivel: 3, altura: 2400 });
    expect(dificultadDesdeTexto("Dificultad: Baja / Altura: 2.500 msnm.")).toMatchObject({ nivel: 3, altura: 2500, regla: "altura" });
    expect(dificultadDesdeTexto("Dificultad: Baja / Altura: 3.500 msnm")).toMatchObject({ nivel: 4, altura: 3500 });
    expect(dificultadDesdeTexto("Dificultad: Media / Altura: 4.300 msnm.")).toMatchObject({ nivel: 4, altura: 4300 });
    expect(dificultadDesdeTexto("<p>Dificultad: Media. 5 Km Aprox / Altura: 3.200 msnm.</p>")).toMatchObject({ nivel: 3, altura: 3200 });
    expect(dificultadDesdeTexto("<p>- Dificultad: Media. - Altura: 2.400 msnm.</p>")?.nivel).toBe(3);
    expect(nivelPorAltura(4500)).toBe(5);
    expect(nivelPorAltura(1200)).toBeNull();
  });
  it("REQ-10656: una etiqueta («Nivel de Dificultad: Moderado.», «Grado de Dificultad: Medio») se lee aunque siga texto largo", () => {
    expect(dificultadDesdeTexto("Nivel de Dificultad: Moderado. Requiere buena condición física para afrontar una subida constante de 400 metros de desnivel.\r\n\r\nEdad Mínima: 12 años.")?.nivel).toBe(3);
    expect(dificultadDesdeTexto("-Grado de Dificultad: Medio. Este circuito ofrece la oportunidad de disfrutar de un pedaleo tranquilo.")?.nivel).toBe(3);
    expect(dificultadDesdeTexto("<p>-Grado de Dificultad: Baja/Media. El 80% del circuito es en bajada.</p>")?.nivel).toBe(2);
    expect(dificultadDesdeTexto("Nivel Medio/Alto: requiere experiencia previa en trekking y buen estado físico.\r\nAscensos exigentes.")?.nivel).toBe(4);
    expect(dificultadDesdeTexto("Baja. Largas horas en vehículo.")?.nivel).toBe(1);
    expect(dificultadDesdeTexto("Fácil - Edad mínima 4 años")?.nivel).toBe(1);
  });
  it("REQ-10656: lo desconocido va a dudas: sin nivel, con el texto limpio, y no se muestra", () => {
    for (const t of [
      "45 Min Aproximadamente. Dependerá del Hotel.",
      "Edad mínima: 18 años.",
      "<p>Acorde a la actividad</p>",
      "<p>Dependiendo el sendero, puede presentar dificultares bajas, intermedias o avanzadas</p>",
      "Se requiere experiencia previa para realizar esta actividad.",
      "Estado Físico aceptable",
      "<p>Experiencia: Nivel 2 Requiere el uso de elementos técnicos sin experiencia previa. Experiencia Física: Nivel 3</p>",
      "⚠️ No recomendable para niños pequeños\r\n⚠️ No apto para embarazadas",
      "* Duración. 9 hs totales \r\n* Desnivel: 300 mts",
      "Bajo - EXCURSIÓN NO RECOMENDADAS PARA PERSONAS EMBARAZADAS O CON MOVILIDAD REDUCIDA",
    ]) {
      const r = dificultadDesdeTexto(t);
      expect(r, t).not.toBeNull();
      expect(r?.nivel, t).toBeNull();
      expect(r?.regla, t).toBe("duda");
      expect(r?.texto.length, t).toBeGreaterThan(0);
    }
  });
  it("REQ-10656: sin texto no hay dato ni duda", () => {
    expect(dificultadDesdeTexto(null)).toBeNull();
    expect(dificultadDesdeTexto("")).toBeNull();
    expect(dificultadDesdeTexto("<p> </p>")).toBeNull();
  });
  it("REQ-10656: la tabla no tiene términos repetidos y cada fila apunta a un nivel 1–5", () => {
    const vistos = new Set<string>();
    for (const fila of TABLA_DIFICULTAD_TANGOL) {
      expect(fila.nivel).toBeGreaterThanOrEqual(1);
      expect(fila.nivel).toBeLessThanOrEqual(5);
      for (const p of fila.palabras) {
        expect(vistos.has(p), p).toBe(false);
        vistos.add(p);
      }
    }
  });
  it("REQ-10656: el resumen cuenta por nivel y junta las dudas con su frecuencia, sin inventar niveles", () => {
    const r = resumenDificultad([
      { texto: "Fácil", n: 119 }, { texto: "<p>Baja</p>", n: 29 }, { texto: "Media", n: 18 }, { texto: "Alta", n: 8 },
      { texto: "Acorde a la actividad", n: 1 }, { texto: null, n: 558 },
    ]);
    expect(r.porNivel).toEqual({ 1: 148, 2: 0, 3: 18, 4: 8, 5: 0 });
    expect(r.sinDato).toBe(558);
    expect(r.dudas).toEqual([{ texto: "Acorde a la actividad", n: 1 }]);
    expect(r.filas.find((f) => f.texto === "<p>Baja</p>")).toMatchObject({ nivel: 1, n: 29, regla: "termino:facil" });
  });
});
