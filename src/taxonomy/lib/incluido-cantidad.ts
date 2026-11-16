/**
 * REQ-10728 (regla de REQ-10707, vale para todos los proveedores por REQ-10709): las etiquetas «incluido» llevan
 * cantidad y nunca sugieren más de lo que el producto incluye. Si la cantidad no se sabe, no hay etiqueta y el
 * detalle se queda en «Incluye». Puro: solo lee los textos del producto (lista «Incluye», itinerario y duración).
 */
export type ConceptoIncluido = "desayuno" | "comida" | "cena" | "hotel" | "tren" | "autobus";

export interface EntradaIncluido {
  includes: readonly string[];
  itinerary?: readonly { title?: string; text?: string }[];
  durationDays?: number;
}

export interface EtiquetaIncluido {
  concepto: ConceptoIncluido;
  /** Número de veces o noches; "diario" para el desayuno de todos los días con hotel. */
  cantidad: number | "diario" | "turistico";
  /** Solo tren y autobús: los dos trayectos son la ida y la vuelta de una misma ruta. */
  idaYVuelta?: boolean;
  etiqueta: string;
  /** De dónde salió la cantidad: la lista «Incluye» o el itinerario día por día. */
  fuente: "incluye" | "itinerario";
}

export interface ResultadoIncluido {
  etiquetas: EtiquetaIncluido[];
  /** Conceptos que el producto menciona pero sin cantidad cierta: no llevan etiqueta. */
  sinCantidad: ConceptoIncluido[];
}

/** Depende de la opción, la categoría o una extensión que el cliente elige: no hay cantidad única. */
const DEPENDE_DE_OPCION = /seg[uú]n (la |el )?(opci[oó]n|categor[ií]a|plan)|plan alimenticio|con (la )?extensi[oó]n|opcional|cuando su nombre/i;
/** La cantidad está en el itinerario, no en la lista. */
const VER_ITINERARIO = /itinerario|en los programas que/i;
/** Frases del itinerario que dicen que algo NO va incluido. */
const NEGADO = /no (est[aá] |est[aá]n |va |van )?incluid|opcional|libre|por (su|tu) cuenta|por cuenta (propia|del)|no incluye/i;

const RE = {
  desayuno: /\bdesayunos?\b/i,
  comida: /\balmuerzos?\b/i,
  cena: /\bcenas?\b/i,
  tren: /\btren(es)?\b/i,
} as const;

function segmentos(linea: string): string[] {
  return linea.split(";").map((s) => s.trim()).filter(Boolean);
}

function frases(texto: string): string[] {
  return texto.split(/[.;]\s+|[.;]$/).map((s) => s.trim()).filter(Boolean);
}

/** Días del itinerario con al menos una frase que menciona el concepto sin negarlo. */
export function diasConConcepto(itinerary: EntradaIncluido["itinerary"], re: RegExp): number {
  let dias = 0;
  for (const dia of itinerary ?? []) {
    if (frases(dia.text ?? "").some((f) => re.test(f) && !NEGADO.test(f))) dias += 1;
  }
  return dias;
}

function plural(n: number, uno: string, varios: string): string {
  return n === 1 ? `1 ${uno}` : `${n} ${varios}`;
}

const TEXTO: Record<ConceptoIncluido, (n: number | "diario") => string> = {
  desayuno: (n) => (n === "diario" ? "Desayuno diario" : plural(n, "desayuno incluido", "desayunos incluidos")),
  comida: (n) => (n === "diario" ? "Comida diaria" : plural(n, "comida incluida", "comidas incluidas")),
  cena: (n) => (n === "diario" ? "Cena diaria" : plural(n, "cena incluida", "cenas incluidas")),
  hotel: (n) => (n === "diario" ? "Hotel incluido" : plural(n, "noche de hotel incluida", "noches de hotel incluidas")),
  tren: (n) => plural(n as number, "trayecto en tren incluido", "trayectos en tren incluidos"),
  autobus: (n) => plural(n as number, "trayecto en autobús incluido", "trayectos en autobús incluidos"),
};

type Conteo = { n: number; diario: boolean; itinerario: boolean; duda: boolean; mencion: boolean; lineas: number; redondo: boolean };
const vacio = (): Conteo => ({ n: 0, diario: false, itinerario: false, duda: false, mencion: false, lineas: 0, redondo: false });

/** Cuenta una comida (almuerzo o cena) dentro de un segmento de «Incluye». */
function contarAlimento(seg: string, re: RegExp, palabra: "almuerzo" | "cena", c: Conteo): void {
  if (!re.test(seg)) return;
  c.mencion = true;
  if (DEPENDE_DE_OPCION.test(seg)) { c.duda = true; return; }
  if (VER_ITINERARIO.test(seg)) { c.itinerario = true; return; }
  const conNumero = new RegExp(`(\\d+)\\s+${palabra}s?\\b`, "i").exec(seg);
  if (conNumero) { c.n += Number(conNumero[1]); return; }
  const porNoche = new RegExp(`(\\d+)\\s+noches?\\b.*\\b${palabra}\\b`, "i").exec(seg);
  if (porNoche) { c.n += Number(porNoche[1]); return; }
  if (new RegExp(`\\b${palabra}s\\b`, "i").test(seg)) { c.duda = true; return; } // plural sin número
  c.n += 1;
}

const REDONDO = /ida y vuelta|subida y bajada|de ida .* y de regreso/i;

/** Una ruta «A – B – A» (sale y vuelve al mismo punto) es una ida y vuelta. */
function rutaRedonda(linea: string): boolean {
  const paradas = linea.replace(/^(boletos? de )?(tren(es)?|bus( tur[ií]stico)?|autob[uú]s)\s+/i, "").split(/\s[–-]\s|–/).map((x) => x.trim().toLowerCase());
  return paradas.length === 3 && paradas[0] === paradas[2].split(/\s+(en|por|con)\s+/)[0];
}

/** Trayectos de un medio en una línea que empieza por ese medio: ida y vuelta = 2, ruta A–B = 1 por tramo. */
function trayectos(linea: string): number | undefined {
  if (REDONDO.test(linea)) return 2;
  const partes = linea.split(/\s[–-]\s|–/).length - 1;
  if (partes >= 1) return partes;
  return undefined;
}

export function etiquetasIncluido(input: EntradaIncluido): ResultadoIncluido {
  const des = vacio(), com = vacio(), cen = vacio(), tren = vacio(), bus = vacio();
  const noches: number[] = [];
  let hotel = false, hotelDuda = false, busTuristico = false;

  for (const linea of input.includes) {
    for (const seg of segmentos(linea)) {
      if (/^con (la )?extensi[oó]n/i.test(seg)) continue; // lo de una extensión que el cliente elige no es del viaje base
      const depende = DEPENDE_DE_OPCION.test(seg);
      // Desayuno: con hotel es diario; con número, ese número.
      if (RE.desayuno.test(seg) || /media pensi[oó]n|pensi[oó]n completa/i.test(seg)) {
        des.mencion = true;
        const n = /(\d+)\s+desayunos?\b/i.exec(seg);
        if (/plan alimenticio|con (la )?extensi[oó]n|opcional/i.test(seg)) des.duda = true;
        else if (n) des.n += Number(n[1]);
        else des.diario = true;
      }
      contarAlimento(seg, RE.comida, "almuerzo", com);
      contarAlimento(seg, RE.cena, "cena", cen);
      if (/pensi[oó]n completa/i.test(seg)) { com.mencion = cen.mencion = true; if (depende) com.duda = cen.duda = true; else com.itinerario = cen.itinerario = true; }
      else if (/media pensi[oó]n/i.test(seg) && /comidas/i.test(seg)) { com.mencion = true; if (depende) com.duda = true; else com.itinerario = true; }

      // Hotel: noches explícitas; si no, noches = días − 1.
      // «Recogida en tu hotel» o «traslado aeropuerto – hotel» no son hospedaje.
      if (/\b\d+\s+noches?\b|alojamiento|^hoteles?\b|\ben hotel(es)?\b/i.test(seg) && !/^(recogida|regreso|traslados?)\b/i.test(seg)) {
        hotel = true;
        const sinSubprograma = seg.replace(/\d+\s+d[ií]as y \d+\s+noches?/gi, ""); // «programa de 3 días y 2 noches» va dentro del total
        const nums = [...sinSubprograma.matchAll(/(\d+)\s+noches?\b/gi)].map((m) => Number(m[1]));
        const mas = [...seg.matchAll(/(?:,| y)\s+(\d+)\s+en\b/gi)].map((m) => Number(m[1]));
        noches.push(...nums, ...mas);
      }
      // Tren y autobús: solo líneas que empiezan por el medio (un «city tour en bus» es la actividad, no un trayecto).
      if (/^(boletos? de )?tren(es)?\b/i.test(seg) || /\by trenes\b|\bo trenes\b/i.test(seg)) {
        tren.mencion = true;
        if (depende || /\bo trenes\b|\bo vuelos\b/i.test(seg)) tren.duda = true;
        else if (VER_ITINERARIO.test(seg)) tren.itinerario = true;
        else { const t = trayectos(seg.split(/ y vuelos?\b/i)[0]); if (t) { tren.n += t; tren.lineas += 1; tren.redondo = REDONDO.test(seg) || rutaRedonda(seg); } else tren.duda = true; }
      }
      if (/^(boletos? de )?(bus|autob[uú]s)\b/i.test(seg)) {
        bus.mencion = true;
        // REQ-10733: el bus turístico hop-on hop-off no tiene trayectos que contar; lleva su propia etiqueta.
        if (/hop-on/i.test(seg)) { busTuristico = true; continue; }
        const t = depende ? undefined : trayectos(seg);
        if (t) { bus.n += t; bus.lineas += 1; bus.redondo = REDONDO.test(seg) || rutaRedonda(seg); } else bus.duda = true;
      }
    }
  }

  const etiquetas: EtiquetaIncluido[] = [];
  const sinCantidad: ConceptoIncluido[] = [];
  const cerrar = (concepto: ConceptoIncluido, c: Conteo, re?: RegExp) => {
    if (!c.mencion) return;
    if (c.diario && !c.duda) { etiquetas.push({ concepto, cantidad: "diario", etiqueta: TEXTO[concepto]("diario"), fuente: "incluye" }); return; }
    if (c.itinerario && re) {
      const dias = diasConConcepto(input.itinerary, re);
      // La lista remite al itinerario: manda el conteo día por día; sin itinerario no hay cantidad.
      if (dias > 0 && !c.duda) { etiquetas.push({ concepto, cantidad: dias, etiqueta: TEXTO[concepto](dias), fuente: "itinerario" }); return; }
      sinCantidad.push(concepto); return;
    }
    if (c.n > 0 && !c.duda) {
      const idaYVuelta = c.n === 2 && c.lineas === 1 && c.redondo;
      const etiqueta = idaYVuelta ? (concepto === "tren" ? "Tren de ida y vuelta incluido" : "Autobús de ida y vuelta incluido") : TEXTO[concepto](c.n);
      etiquetas.push({ concepto, cantidad: c.n, etiqueta, fuente: "incluye", ...(idaYVuelta ? { idaYVuelta } : {}) });
      return;
    }
    sinCantidad.push(concepto);
  };
  cerrar("desayuno", des);
  cerrar("comida", com, RE.comida);
  cerrar("cena", cen, RE.cena);

  if (hotel) {
    const dias = input.durationDays ?? 0;
    const suma = noches.reduce((a, b) => a + b, 0);
    let n: number | undefined;
    if (noches.length === 1) n = dias === 0 || noches[0] <= dias - 1 ? noches[0] : undefined;
    else if (noches.length > 1) n = suma === dias - 1 ? suma : undefined;
    else if (dias >= 2) n = dias - 1;
    if (noches.length > 0 && n === undefined) hotelDuda = true;
    // Noches a bordo (crucero o tren nocturno) no son noches de hotel: sin cantidad cierta, sin etiqueta.
    if ((input.itinerary ?? []).some((d) => /(alojamiento|noche) a bordo/i.test(d.text ?? ""))) hotelDuda = true;
    if (n && n > 0 && !hotelDuda) etiquetas.push({ concepto: "hotel", cantidad: n, etiqueta: TEXTO.hotel(n), fuente: "incluye" });
    else sinCantidad.push("hotel");
  }
  cerrar("tren", tren, RE.tren);
  cerrar("autobus", bus);
  // REQ-10733 (excepción firmada por el PO a la regla de cantidad, vale para todo hop-on hop-off de cualquier proveedor).
  if (busTuristico && !etiquetas.some((e) => e.concepto === "autobus")) {
    etiquetas.push({ concepto: "autobus", cantidad: "turistico", etiqueta: "Autobús turístico incluido", fuente: "incluye" });
    const i = sinCantidad.indexOf("autobus");
    if (i >= 0) sinCantidad.splice(i, 1);
  }
  return { etiquetas, sinCantidad };
}
