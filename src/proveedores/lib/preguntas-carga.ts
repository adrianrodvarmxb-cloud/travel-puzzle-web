/**
 * REQ-10813 (plan REQ-3457 §3 «Carga inicial: preguntas abiertas por proveedor» y §8; G5-A: «Primero los 7 publicados»).
 * Puro: la lista inicial de preguntas abiertas de los 7 proveedores publicados, el SQL de carga (solo la columna
 * `preguntas` de la 0033, REQ-10649) y su punto de regreso. Las preguntas salen de lo que ya se les pidió por correo
 * (hilos del 11 y 12 nov 2026 y borradores del 19 nov en el Proyecto de Claude, `claude/primeros-correos-proveedores-2026-11-19.md`);
 * lo ya recibido no se vuelve a pedir. Nunca montos, porcentajes, cuentas ni datos fiscales (`sinMontos`).
 * Sin red, sin base, sin reloj: quien carga (`src/scripts/carga-preguntas.ts`) simula por defecto.
 */
import type { Pregunta, Tema } from "./preguntas";
import type { ProveedorSemilla } from "./directorio";

/** Los 7 publicados de la firma G5-A (12 nov 2026). Tangol también está publicado, pero va por API y no se le escribe por esta vía. */
export const PUBLICADOS_G5 = ["big-bus-tours", "destino-colombia", "exotic-escapes", "extime-travel", "fantastica-china", "inca-world-peru", "turismo-asiatico"] as const;
export type PublicadoG5 = (typeof PUBLICADOS_G5)[number];

const p = (proveedor: PublicadoG5, n: number, tema: Tema, desde: string, es: string, en: string, req: string | null = null): Pregunta =>
  ({ id: `${proveedor}:${String(n).padStart(2, "0")}`, tema, es, en, req, desde, cerrada: null });

// REQ-10813
export const PREGUNTAS_INICIALES: Record<PublicadoG5, Pregunta[]> = {
  "big-bus-tours": [
    p("big-bus-tours", 1, "cancelacion", "2026-11-11",
      "Reglas de cancelación y cambio de fecha por producto, y cómo procesan los reembolsos.",
      "Cancellation and date-change rules per product, and how refunds are processed."),
    p("big-bus-tours", 2, "pago", "2026-11-11",
      "Cómo se liquidan las reservas hechas por el Partner Booking Platform y si algo cambia cuando Ventrata OCTO esté activo.",
      "How we settle bookings made through the Partner Booking Platform, and whether anything changes once Ventrata OCTO is live."),
    p("big-bus-tours", 3, "tarifas", "2026-11-11",
      "Permiso por escrito para usar sus fotos oficiales y su logo en travelpuzzle.com.mx (hoy usamos fotos de archivo).",
      "Written permission to use your official photos and logo on travelpuzzle.com.mx (today we only use stock photos)."),
    p("big-bus-tours", 4, "alta", "2026-11-11",
      "Sus términos y condiciones para socios y sus comentarios al acuerdo de intermediación (ES/EN) del 11 de noviembre.",
      "Your partner terms and conditions, and your comments on the intermediation agreement (ES/EN) sent on 11 November.", "REQ-1366"),
    p("big-bus-tours", 5, "alta", "2026-11-11",
      "Datos legales de la empresa y los nombres y domicilios que deben aparecer en el acuerdo.",
      "Your company's legal details and the names and addresses that should appear in the agreement."),
  ],
  "destino-colombia": [
    p("destino-colombia", 1, "cancelacion", "2026-11-11",
      "La política de cancelación exacta por circuito (sus términos de 2023 no la definen) y la cancelación de hoteles por plan.",
      "The exact cancellation policy per circuit (your 2023 terms do not define it) and hotel cancellation per plan."),
    p("destino-colombia", 2, "calendario", "2026-11-11",
      "Las tarifas para compras después del 15 de diciembre de 2026 (nos dijeron que las compartirían la semana siguiente al 13 de noviembre).",
      "Rates for purchases after 15 December 2026 (you mentioned you would share them the week after 13 November)."),
    p("destino-colombia", 3, "pago", "2026-11-11",
      "Plazo y moneda de la factura por reserva.",
      "Payment term and currency of the invoice per booking."),
    p("destino-colombia", 4, "alta", "2026-11-11",
      "La versión 2026 de sus términos y condiciones, marcando lo que cambió frente a 2023.",
      "The 2026 version of your terms and conditions, marking what changed from 2023."),
    p("destino-colombia", 5, "alta", "2026-11-11",
      "Sus comentarios al acuerdo de intermediación tras revisarlo con su representante legal, incluidas las cláusulas 3.6 y 8.2.",
      "Your comments on the intermediation agreement after reviewing it with your legal representative, including clauses 3.6 and 8.2."),
  ],
  "exotic-escapes": [
    p("exotic-escapes", 1, "tarifas", "2026-11-11",
      "Vuelos internos: quién emite el boleto, tarifa, reglas de cambio y cancelación, y quién reembolsa si la aerolínea cambia.",
      "Domestic flights: who issues the ticket, fare, change and cancellation rules, and who refunds if the airline changes.", "REQ-1375"),
    p("exotic-escapes", 2, "cancelacion", "2026-11-11",
      "Confirmar si Sri Lanka cancela sin cargo con más de 21 días (el tarifario 2027/28 dice 21; nuestra base dice 22) y la política para agencias (cláusula 4.5).",
      "Confirm whether Sri Lanka cancels free of charge beyond 21 days (the 2027/28 rate sheet says 21; our records say 22) and the agency policy (clause 4.5).", "REQ-1376"),
    p("exotic-escapes", 3, "calendario", "2026-11-11",
      "Fechas del Festival de Kandy y el precio de la temporada de Navidad en India.",
      "Dates of the Kandy Festival and the Christmas-season price in India."),
    p("exotic-escapes", 4, "tarifas", "2026-11-11",
      "Confirmar que las actualizaciones de tarifas nos llegarán por correo (cláusula 8.2).",
      "Confirm that rate updates will reach us by email (clause 8.2)."),
    p("exotic-escapes", 5, "alta", "2026-11-11",
      "Permiso de fotos con crédito (cláusula 6.1), datos legales de la empresa y el Anexo 2 (documentos de la parte B).",
      "Photo permission with credit (clause 6.1), your company's legal details and Annex 2 (party B documents).", "REQ-1378"),
  ],
  "extime-travel": [
    p("extime-travel", 1, "tarifas", "2026-11-11",
      "Las fotos de los 20 productos que les listamos, con la línea de crédito que quieren que usemos.",
      "The images for the 20 products we listed, with the credit line you want us to use."),
    p("extime-travel", 2, "calendario", "2026-11-11",
      "El idioma de operación de los 46 productos que les señalamos.",
      "The operating language of the 46 products we flagged."),
    p("extime-travel", 3, "cancelacion", "2026-11-11",
      "El programa de 5 días y 4 noches: cuál es la versión vigente, porque difiere entre sus documentos.",
      "The 5-day/4-night programme: which version is current, since it differs between your documents."),
    p("extime-travel", 4, "pago", "2026-11-11",
      "Una nueva fecha para la llamada que propusimos para el 17 o 18 de noviembre, si no se realizó.",
      "A new slot for the call we proposed for 17–18 November, if it did not take place."),
    p("extime-travel", 5, "alta", "2026-11-11",
      "Sus comentarios al acuerdo de intermediación que les enviamos el 11 de noviembre.",
      "Your comments on the intermediation agreement we sent on 11 November.", "REQ-1398"),
  ],
  "fantastica-china": [
    p("fantastica-china", 1, "pago", "2026-11-12",
      "Confirmar que el plazo de pago va en la factura de cada reserva y solo por transferencia, y el correo al que debemos mandar las reservas.",
      "Confirm that the payment term goes on each booking's invoice and by bank transfer only, and the email address where we should send bookings.", "REQ-1675"),
    p("fantastica-china", 2, "calendario", "2026-11-12",
      "Si hay salidas del 18 al 30 de enero, y los recargos por fecha (Feria de Cantón y salidas fuera de lunes, martes y jueves) con sus fechas 2027.",
      "Whether there are departures from 18 to 30 January, and the date surcharges (Canton Fair and departures outside Monday, Tuesday and Thursday) with their 2027 dates."),
    p("fantastica-china", 3, "cancelacion", "2026-11-12",
      "Qué pasa con la reubicación del viajero si una aerolínea cambia un vuelo interno.",
      "What happens with the traveller's rebooking if an airline changes a domestic flight."),
    p("fantastica-china", 4, "tarifas", "2026-11-12",
      "Confirmar por escrito la regla de la cláusula 8.2: las tarifas contratadas no cambian salvo variación del tipo de cambio o reservas de última hora.",
      "Confirm in writing the rule of clause 8.2: contracted rates do not change except for exchange-rate variation or last-minute bookings."),
    p("fantastica-china", 5, "alta", "2026-11-12",
      "Datos legales de la empresa y permiso de fotos con crédito.",
      "Your company's legal details and photo permission with credit."),
  ],
  "inca-world-peru": [
    p("inca-world-peru", 1, "cancelacion", "2026-11-19",
      "La penalidad de cancelación entre 61 y 31 días antes de la llegada (la tabla del tarifario salta de 62 a 16 días).",
      "The cancellation penalty between 61 and 31 days before arrival (the rate sheet table jumps from 62 to 16 days)."),
    p("inca-world-peru", 2, "tarifas", "2026-11-19",
      "Vigencia del tarifario, si el precio base es por persona en habitación doble, y los productos que aparecen sin tarifa.",
      "Validity of the rate sheet, whether the base price is per person in a double room, and the products that appear without a rate."),
    p("inca-world-peru", 3, "calendario", "2026-11-19",
      "La anticipación mínima para reservar por producto (vemos 10 y 60 días según el caso), la duración corregida de «Descubriendo el Perú» (que quedaron de enviarnos el 5 de noviembre) y la de «Siguiendo la Ruta del Sur»: el itinerario del PDF termina el día 8 con 7 noches de hotel, pero la portada dice 9 días / 8 noches.",
      "Minimum booking lead time per product (we see 10 and 60 days depending on the case), the corrected duration of «Descubriendo el Perú» (which you offered to send on 5 November) and that of «Siguiendo la Ruta del Sur»: the PDF itinerary ends on day 8 with 7 hotel nights, but the cover says 9 days / 8 nights."),
    p("inca-world-peru", 4, "pago", "2026-11-19",
      "El contacto operativo de reservas (además del teléfono 24/7 que ya tenemos) y las fotos oficiales que nos ofrecieron el 9 de noviembre.",
      "The operational booking contact (besides the 24/7 phone we already have) and the official photos offered on 9 November.", "REQ-1524"),
    p("inca-world-peru", 5, "alta", "2026-11-19",
      "La forma y el plazo de pago de cada reserva, y si tienen API, portal o listado en Excel.",
      "Payment method and terms for each booking, and whether you have an API, portal or Excel listing.", "REQ-10574"),
  ],
  "turismo-asiatico": [
    p("turismo-asiatico", 1, "tarifas", "2026-11-19",
      "Cuándo tendrán el precio de los hoteles que siguen en TBA en los tarifarios de Singapur y Kuala Lumpur.",
      "When you will have rates for the hotels still marked TBA in the Singapore and Kuala Lumpur rate sheets."),
    p("turismo-asiatico", 2, "cancelacion", "2026-11-19",
      "Confirmar si la tabla de cancelación de sus términos y condiciones 2026 aplica también a los 8 tours de día de Singapur y Kuala Lumpur.",
      "Please confirm whether the cancellation table in your 2026 terms and conditions also applies to the 8 day tours in Singapore and Kuala Lumpur."),
    p("turismo-asiatico", 3, "calendario", "2026-11-19",
      "Confirmar las salidas en domingo y los vuelos internos Kuala Lumpur–Sandakan (quién los emite y a qué tarifa).",
      "Confirm Sunday departures and the Kuala Lumpur–Sandakan domestic flights (who issues them and at what fare)."),
    p("turismo-asiatico", 4, "pago", "2026-11-19",
      "Si el almuerzo de los tours de Kuala Lumpur y Melaka está incluido: el itinerario lo menciona y el tarifario lo cobra como extra.",
      "Whether lunch is included in the Kuala Lumpur and Melaka tours: the itinerary mentions it and the rate sheet charges it as an extra."),
    p("turismo-asiatico", 5, "alta", "2026-11-19",
      "El acuerdo de intermediación para revisión y firma, datos legales (licencia KPL) y permiso de fotos con crédito.",
      "The intermediation agreement for review and signature, legal details (KPL licence) and photo permission with credit."),
  ],
};

/** Montos, porcentajes, cuentas y datos fiscales no viajan en una pregunta (plan §8; REQ-10718: netos solo en el Proyecto). */
// REQ-10813
export function sinMontos(texto: string): boolean {
  const monto = /(\$|€|£|\b(?:USD|EUR|MXN|THB|RMB|CNY|PEN|COP|MYR|SGD))\s*\d|\d\s*(?:USD|EUR|MXN|THB|RMB|CNY|PEN|COP|MYR|SGD|por ciento|percent)\b|\d\s*%/i;
  const cuenta = /\b\d{7,}\b|\b(?:cuenta|account|IBAN|SWIFT|CLABE)\b[^.]*\d{4,}/i;
  const fiscal = /\b(?:RFC|RUT|CLABE|IBAN|SWIFT|NIT|CURP)\b/;
  return !monto.test(texto) && !cuenta.test(texto) && !fiscal.test(texto);
}

const q = (v: string): string => `'${v.replace(/'/g, "''")}'`;

/** Un UPDATE por proveedor, solo `preguntas` y `updatedAt`, y solo si sigue publicado. Nada se inserta ni se borra. */
// REQ-10813
export function sqlCargaPreguntas(carga: Partial<Record<string, Pregunta[]>>, hoyIso: string): string {
  const ahora = /^\d{4}-\d{2}-\d{2}$/.test(hoyIso) ? `${hoyIso}T00:00:00.000+00:00` : hoyIso;
  return Object.entries(carga)
    .filter((e): e is [string, Pregunta[]] => Array.isArray(e[1]))
    .map(([id, lista]) => `UPDATE "Proveedor" SET "preguntas" = ${q(JSON.stringify(lista))}, "updatedAt" = ${q(ahora)} WHERE "id" = ${q(id)} AND "publicado" = 1;`)
    .join("\n");
}

/** Punto de regreso: respaldo de solo lectura antes y, si hace falta, la columna vuelve a '[]' (REQ-10649). */
// REQ-10813
export function sqlRegresoPreguntas(ids: readonly string[]): { respaldo: string; regreso: string } {
  return {
    respaldo: `SELECT "id", "preguntas" FROM "Proveedor" WHERE "id" IN (${ids.map(q).join(", ")});`,
    regreso: ids.map((id) => `UPDATE "Proveedor" SET "preguntas" = '[]' WHERE "id" = ${q(id)};`).join("\n"),
  };
}

/**
 * Antes de cargar: cada proveedor existe y está publicado en el directorio, su columna sigue vacía (no se pisa lo
 * cargado; cerrar preguntas conserva el historial, G3-A) y ningún texto trae montos. Devuelve los motivos; vacío = ok.
 */
// REQ-10813
export function validarCarga(carga: Partial<Record<string, Pregunta[]>>, directorio: readonly Pick<ProveedorSemilla, "id" | "publicado">[], actuales: Record<string, string | null | undefined>, revisiones: Partial<Record<string, RevisionCompleta | null>> = REVISIONES): string[] {
  const motivos: string[] = [];
  for (const [id, lista] of Object.entries(carga)) {
    if (!lista) continue;
    const d = directorio.find((x) => x.id === id);
    if (!d || !d.publicado) motivos.push(`${id}: no está publicado en el directorio`);
    const actual = (actuales[id] ?? "[]").trim();
    if (actual && actual !== "[]") motivos.push(`${id}: ya tiene preguntas cargadas; no se pisan`);
    const sinRevision = motivoSinRevision(id, revisiones[id]); // REQ-10850
    if (sinRevision) motivos.push(sinRevision);
    for (const pr of lista) if (!sinMontos(pr.es) || !sinMontos(pr.en)) motivos.push(`${pr.id}: trae un monto, porcentaje, cuenta o dato fiscal`);
  }
  return motivos;
}

/**
 * REQ-10850 (PO, 21-11-2026 16:02 CDMX): «necesito que asegures que a ningún proveedor se le vaya a enviar ese cuestionario
 * sin antes haber revisado todo [...] y contestar esas preguntas y en caso de que si falte algo entonces sí se les puede mandar».
 * Registro de la revisión completa de cada proveedor antes de cargarle preguntas: TODOS sus hilos de correo (cuerpo y
 * adjuntos), sus documentos, su contrato con control de cambios y su expediente. Lo que ya está contestado en esas fuentes
 * se quita de su lista. Sin revisión completa registrada aquí, `validarCarga` no deja cargar nada a ese proveedor.
 */
export interface RevisionCompleta {
  fecha: string; // AAAA-MM-DD
  hilos: number; // hilos de correo leídos completos (por dominio, cuentas alternas y nombre)
  adjuntos: boolean; // adjuntos y enlaces compartidos leídos
  contrato: boolean; // contrato o acuerdo, con su control de cambios, revisado
  expediente: string; // ruta del expediente en el Proyecto que lo registra
  contestadas: number; // preguntas quitadas porque ya estaban contestadas
  /** id de la pregunta quitada → dónde está la respuesta (correo, documento o expediente, con fecha). */
  quitadas: Record<string, string>;
}

// REQ-10850: se llena proveedor por proveedor al terminar su revisión; null = sin revisar = no se carga.
export const REVISIONES: Record<PublicadoG5, RevisionCompleta | null> = {
  // 21-11-2026: hilo principal (27 correos, 16 sep a 11 nov), acuerdo enviado el 11 nov sin respuesta, casos de Trade Support y recibos; sin correos nuevos desde el 11 nov. Las 5 siguen abiertas.
  "big-bus-tours": { fecha: "2026-11-21", hilos: 4, adjuntos: true, contrato: true, expediente: "proveedores/big-bus-expediente-2026-11-18.md", contestadas: 0, quitadas: {} },
  // 21-11-2026: hilo principal (3 al 13 nov), comunicado del IVA y sus términos y condiciones de noviembre 2023 (PDF leído completo); acuerdo enviado el 11 nov, en revisión con su representante legal.
  "destino-colombia": {
    fecha: "2026-11-21", hilos: 2, adjuntos: true, contrato: true, expediente: "proveedores/destino-colombia-expediente-2026-11-17.md", contestadas: 2,
    quitadas: {
      "destino-colombia:01": "Términos y condiciones (nov 2023, adjunto del 6 nov): tours y traslados con menos de 48 h, 100 %; hoteles según cada hotel, informado al confirmar; no hay política fija por circuito",
      "destino-colombia:03": "Términos y condiciones (nov 2023): todas las reservas se prepagan en USD en las fechas de la liquidación; correo del 6 nov: pago total antes del ingreso",
    },
  },
  // 21-11-2026: hilo único (12 correos, 24 ago a 19 nov), Condiciones generales 2027 y 15 tarifarios; acuerdo v2 enviado el 16 nov y v4 en el Proyecto.
  "exotic-escapes": {
    fecha: "2026-11-21", hilos: 1, adjuntos: true, contrato: true, expediente: "proveedores/exotic-escapes-expediente-2026-11-15.md", contestadas: 3,
    quitadas: {
      "exotic-escapes:01": "Correo de Priya Chauhan del 19 nov 2026: emite Exotic o su proveedor autorizado y asiste con cambios o reembolsos según la aerolínea",
      "exotic-escapes:02": "Correo de Priya Chauhan del 19 nov 2026: Sri Lanka tiene la misma cancelación que India; la de agencias ya está en sus Condiciones generales 2027",
      "exotic-escapes:04": "Correo de Priya Chauhan del 19 nov 2026: acepta la cláusula 8.2",
    },
  },
  // 21-11-2026: hilo del programa de verano 2027 (4 a 6 nov), hilo de la v2 (11 y 16 nov, nuestros), aviso de cancelación del 22 oct con su hoja de cálculo y programas de verano e invierno (leídos), T&C B2B 2026.
  "extime-travel": { fecha: "2026-11-21", hilos: 4, adjuntos: true, contrato: true, expediente: "proveedores/extime-expediente-2026-11-15.md", contestadas: 0, quitadas: {} },
  // 21-11-2026: los 5 hilos (2026-2027 y temporadas anteriores), tarifarios 2027-2028 leídos (condiciones completas) y acuerdo v2 con control de cambios; respuestas del 12, 17 y 19 nov.
  "fantastica-china": {
    fecha: "2026-11-21", hilos: 5, adjuntos: true, contrato: true, expediente: "proveedores/fantastica-china-expediente-2026-11-15.md", contestadas: 5,
    quitadas: {
      "fantastica-china:01": "Correo de Beibei del 12 nov 2026: la fecha límite va en la factura de cada reserva, solo transferencia; las reservas se mandan a Beibei",
      "fantastica-china:02": "Tarifario Tour Regular 2027-2028: sin salidas del 18 al 30 ene 2028 (Año Nuevo Chino); Feria de Cantón del 6 al 26 abr y del 7 al 28 oct 2027; suplemento por otros días de la semana",
      "fantastica-china:03": "Correo de Beibei del 12 nov 2026: Fantástica China reubica al viajero si la aerolínea cambia o cancela",
      "fantastica-china:04": "Tarifario 2027-2028, notas 14 y 15, confirmado por Beibei el 12 nov 2026: fuera de esas notas las tarifas no cambian",
      "fantastica-china:05": "Fotos autorizadas con crédito el 4 nov 2026; razón social dada por Zhou Fan el 17 y 19 nov; los datos legales completos llegan con la firma del acuerdo (Anexo 2), ya pedida",
    },
  },
  // 26-11-2026, revisión PARCIAL (sigue bloqueada por `adjuntos: false`): los 4 hilos con centralincaworldtravel@ (3 de
  // presentación de 2024-2025 sin respuesta y el hilo «Seguimiento a nuestra reunión» con 8 correos, 24 jul 2024 y 3 a 9 nov 2026),
  // sin correos de incaworldperu@/incaworldtravel@ ni del dominio; leídos los 4 programas PDF compartidos por Drive (Descubriendo
  // el Perú 9D, Maravilla del Perú 12D/11N, Misterios 11D/10N y Ruta del Sur) y la constancia GERCETUR (datos legales); anexo
  // `legal/anexo-acuerdo-inca-world-peru-2026-11.md` revisado (acuerdo NO enviado: ningún correo lo lleva). Lo que falta leer es el
  // tarifario B2B 2026-2027 (PDF de 23 MB del 4 nov): Gmail no lo entrega por API arriba de 12 MB y no está en Drive; César dice
  // que sus condiciones de reserva, pago, modificación y cancelación van ahí. Hasta leerlo, no se carga nada (REQ-10850).
  "inca-world-peru": {
    fecha: "2026-11-26", hilos: 4, adjuntos: false, contrato: true, expediente: "proveedores/inca-world-peru-expediente-2026-11-26.md", contestadas: 3,
    quitadas: {
      "inca-world-peru:01": "Correo de César Pilares del 5 nov 2026, punto 4: no hay penalidad fija de 61 a 31 días; entradas a Machu Picchu y otros ingresos no reembolsables una vez comprados, boletos de tren según el operador ferroviario, los demás servicios según los proveedores y los gastos incurridos, hoteles con política especial se informan al confirmar",
      "inca-world-peru:02": "Correo de César Pilares del 5 nov 2026, puntos 1, 2 y 6: vigencia 1 ene a 31 dic 2027; precio por persona en doble desde 2 pasajeros, hotel 3 estrellas, sencilla al mismo valor que la doble; los productos sin tarifa (MP-04 a MP-06, CUS-TR11/TR12, ICA-01, PROG-TRK-05 y suplementos) se cotizan caso por caso",
      "inca-world-peru:04": "Correo de César Pilares del 5 nov 2026, punto 7 (reservas: centralincaworldtravel@gmail.com; emergencias 24/7 el teléfono que ya tenemos) y del 9 nov 2026 (fotos oficiales por tour y por destino enviadas en «inca world peru.rar» por Drive; REQ-1524)",
    },
  },
  // 21-11-2026: hilo único «COTIZACION» (2024 y 4 a 6 nov 2026), T&C 2026 y tarifarios 2027 de Kuala Lumpur y Singapur leídos; sin acuerdo enviado.
  "turismo-asiatico": {
    fecha: "2026-11-21", hilos: 1, adjuntos: true, contrato: true, expediente: "proveedores/turismo-asiatico-expediente-2026-11-18.md", contestadas: 2,
    quitadas: {
      "turismo-asiatico:03": "Correo de Sergi del 5 nov 2026: llegadas los miércoles a Kuala Lumpur y los domingos a Singapur; no venden vuelos internos",
      "turismo-asiatico:05": "T&C 2026 y firma de Sergi: razón social, número de empresa y licencia; fotos: no autorizan, recomiendan banco de imágenes (5 nov 2026); el acuerdo lo enviamos nosotros",
    },
  },
};

// REQ-10850: lo que de verdad falta preguntar: la lista inicial menos lo que la revisión encontró contestado.
export function preguntasPorCargar(id: PublicadoG5, revisiones: Partial<Record<string, RevisionCompleta | null>> = REVISIONES): Pregunta[] {
  const quitadas = revisiones[id]?.quitadas ?? {};
  return PREGUNTAS_INICIALES[id].filter((pr) => !(pr.id in quitadas));
}

// REQ-10850
export function motivoSinRevision(id: string, r: RevisionCompleta | null | undefined): string | null {
  if (!r) return `${id}: sin revisión completa de hilos, adjuntos, contrato y expediente (REQ-10850)`;
  const falta = [r.hilos > 0 ? null : "hilos", r.adjuntos ? null : "adjuntos", r.contrato ? null : "contrato", r.expediente ? null : "expediente", /^\d{4}-\d{2}-\d{2}$/.test(r.fecha) ? null : "fecha", Object.keys(r.quitadas ?? {}).length === r.contestadas ? null : "cuenta de quitadas"].filter(Boolean);
  return falta.length ? `${id}: revisión incompleta (falta ${falta.join(", ")}) (REQ-10850)` : null;
}

// REQ-10813
export function resumenPreguntas(carga: Partial<Record<string, Pregunta[]>>): { proveedores: number; total: number; porProveedor: Record<string, number>; porTema: Partial<Record<Tema, number>> } {
  const porProveedor: Record<string, number> = {};
  const porTema: Partial<Record<Tema, number>> = {};
  let total = 0;
  for (const [id, lista] of Object.entries(carga)) {
    if (!lista) continue;
    porProveedor[id] = lista.length;
    total += lista.length;
    for (const pr of lista) porTema[pr.tema] = (porTema[pr.tema] ?? 0) + 1;
  }
  return { proveedores: Object.keys(porProveedor).length, total, porProveedor, porTema };
}
