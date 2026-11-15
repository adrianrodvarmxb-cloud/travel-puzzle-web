// REQ-1291, REQ-1293, REQ-1294, REQ-1296: orquestación con un repositorio en memoria (sin D1, Resend ni cPanel reales).
import { describe, it, expect } from "vitest";
import { procesarEntrante } from "./entrante";
import { revisionDiaria } from "./diario";
import type { ProveedorFila, ProveedoresRepo } from "./repository";
import type { Correo } from "./lib/correo";

const base = (x: Partial<ProveedorFila>): ProveedorFila => ({
  id: "p", nombre: "P", tipo: "dmc", publicado: false, bloqueado: false, agencyId: null, canal: "correo", idioma: "es", contacto: "",
  correos: [], dominios: [], destinos: "", integracion: "desconocida", cobro: "desconocido", tiempoRespuesta: "", correosInvalidos: [], zonaHoraria: "America/Mexico_City", checklist: [], bloqueos: {}, ultimoAsunto: null, hiloId: null, notas: "", etapa: "por_contactar", recordatorios: 0, ...x,
});

// REQ-10693: Mila nunca envía directo; en las pruebas el «buzón» guarda el correo y simula el borrador programado.
const buzon = (enviados: Correo[], programados: string[] = []) => async (c: Correo, enviarEn: string) => { enviados.push(c); programados.push(enviarEn); return { id: `<${enviados.length}@gmail>`, enlace: `https://mail.google.com/mail/u/0/#drafts/${enviados.length}`, enviarEn }; };

function memoria(lista: ProveedorFila[]) {
  const mensajes: { id: string; proveedorId: string; direccion: string; tipo: string }[] = [];
  const documentos: { id: string }[] = [];
  const repo: ProveedoresRepo = {
    todos: async () => lista.map((p) => ({ ...p })),
    guardarEstado: async (id, s) => { const p = lista.find((x) => x.id === id)!; Object.assign(p, s); },
    registrarMensaje: async (m) => { mensajes.push(m); },
    yaRegistrado: async (id) => mensajes.some((m) => m.id === id),
    registrarDocumento: async (d) => { documentos.push(d); },
    mensajesDesde: async () => mensajes.map((m) => ({ proveedor: lista.find((p) => p.id === m.proveedorId)!.nombre, direccion: m.direccion as "entrada", tipo: m.tipo, resumen: "", fecha: "" })),
    documentosDesde: async () => [],
    marcarInvalidos: async (id, correos) => { lista.find((x) => x.id === id)!.correosInvalidos = correos; },
    marcarChecklist: async (id, recibidos) => { lista.find((x) => x.id === id)!.checklist = recibidos; },
  };
  return { repo, mensajes, documentos, lista };
}

describe("REQ-1291/REQ-1296: correo entrante", () => {
  it("REQ-1291: la respuesta de un proveedor queda como «respondió» y su último mensaje; REQ-1296: sus PDF se suben a cPanel", async () => {
    const m = memoria([base({ id: "destino-colombia", dominios: ["destinocolombia.com"], etapa: "contactado", ultimoNuestro: "2026-11-09T10:00:00Z" })]);
    const subidos: string[] = [];
    const r = await procesarEntrante({
      messageId: "<a@x>", fecha: "2026-11-10T09:00:00Z", de: "reservas5@destinocolombia.com", para: ["comercial@travelpuzzle.com.mx"], cc: [],
      asunto: "Re: Travel Puzzle", texto: "Adjunto tarifario",
      adjuntos: [{ nombre: "Tarifario 2027.pdf", tipo: "application/pdf", contenido: new Uint8Array([1, 2]) }, { nombre: "x.exe", tipo: "x", contenido: new Uint8Array([1]) }],
    }, { repo: m.repo, subir: async (ruta) => { subidos.push(ruta); } });
    expect(r).toEqual({ estado: "registrado", proveedorId: "destino-colombia", documentos: 1, fallidos: 0 });
    expect(m.lista[0]).toMatchObject({ etapa: "respondio", ultimoSuyo: "2026-11-10T09:00:00Z" });
    expect(subidos).toEqual(["proveedores-docs/destino-colombia/2026-11-10/tarifario-2027.pdf"]);
  });
  it("REQ-1291: un correo repetido o de alguien que no es proveedor no cambia nada", async () => {
    const m = memoria([base({ id: "a", dominios: ["a.com"] })]);
    const c = { messageId: "<b@x>", fecha: "2026-11-10", de: "z@b.com", para: [], cc: [], asunto: "", texto: "", adjuntos: [] };
    expect(await procesarEntrante(c, { repo: m.repo, subir: async () => {} })).toEqual({ estado: "sin_proveedor" });
  });
});

describe("REQ-1293/REQ-1294: revisión diaria", () => {
  it("REQ-1293/REQ-1297: recordatorio al que no contestó; los nuevos quedan para el primer correo de Adri (publicados primero); nunca FREETOUR", async () => {
    const m = memoria([
      base({ id: "nuevo", correos: ["a@nuevo.com"], destinos: "Perú" }),
      base({ id: "publicado", publicado: true, correos: ["b@pub.com"], contacto: "Ana" }),
      base({ id: "freetour", bloqueado: true, correos: ["i@freetour.com"] }),
      base({ id: "callado", correos: ["c@callado.com"], etapa: "contactado", ultimoNuestro: "2026-11-02T10:00:00Z", ultimoAsunto: "Travel Puzzle · hola", hiloId: "<h@x>" }),
    ]);
    const enviados: Correo[] = [];
    const r = await revisionDiaria({ repo: m.repo, hoy: "2026-11-09T15:00:00Z", borrador: buzon(enviados) });
    expect(r).toEqual({ enviados: 1, sinRespuesta: 0, errores: [], porPresentar: ["publicado", "nuevo"], detenidos: [],
      borradores: [{ proveedor: "P", tipo: "recordatorio", enviarEn: "2026-11-09T15:00:00.000Z", enlace: "https://mail.google.com/mail/u/0/#drafts/1" }] }); // REQ-10693: 9:00 CDMX, dentro del horario → sale ya
    expect(enviados.map((c) => c.to[0])).toEqual(["c@callado.com"]);
    expect(enviados[0].subject).toBe("Re: Travel Puzzle · hola");
    expect(enviados[0].cc).toHaveLength(2);
    expect(m.lista.find((p) => p.id === "callado")!.recordatorios).toBe(1);
  });
});

describe("REQ-1297: el primer correo de Adri llega con copia a Mila", () => {
  it("REQ-1297: al registrarse su correo, el proveedor pasa a «contactado» y Mila sigue el hilo", async () => {
    const m = memoria([base({ id: "tangol", dominios: ["tangol.com"] })]);
    const r = await procesarEntrante({ messageId: "<adri@x>", fecha: "2026-11-09T16:00:00Z", de: "adrianrodvar@travelpuzzle.com.mx",
      para: ["agencias@tangol.com"], cc: ["comercial@travelpuzzle.com.mx"], asunto: "Travel Puzzle · Les presento a Mila", texto: "", adjuntos: [] },
      { repo: m.repo, subir: async () => {} });
    expect(r).toEqual({ estado: "nuestro" });
    expect(m.lista[0]).toMatchObject({ etapa: "contactado", ultimoNuestro: "2026-11-09T16:00:00Z", hiloId: "<adri@x>" });
  });
});

describe("REQ-1565: respuestas automáticas y rebotes", () => {
  const enviado = { etapa: "contactado" as const, ultimoNuestro: "2026-11-09T10:00:00Z", hiloId: "<h@x>" };
  it("REQ-1565: «fuera de la oficina» queda en el historial y no cuenta como respuesta", async () => {
    const m = memoria([base({ id: "tangol", dominios: ["tangol.com"], ...enviado })]);
    const r = await procesarEntrante({ messageId: "<oo@x>", fecha: "2026-11-09T11:00:00Z", de: "erika@tangol.com", para: ["comercial@travelpuzzle.com.mx"], cc: [],
      asunto: "Respuesta automática: Fuera de la oficina", texto: "Regreso el lunes", adjuntos: [] }, { repo: m.repo, subir: async () => {} });
    expect(r).toEqual({ estado: "automatica", proveedorId: "tangol" });
    expect(m.lista[0].etapa).toBe("contactado");
    expect(m.lista[0].ultimoSuyo).toBeUndefined();
    expect(m.mensajes[0].tipo).toBe("automatica");
  });
  it("REQ-1565: la cabecera Auto-Submitted también cuenta como automática", async () => {
    const m = memoria([base({ id: "tangol", dominios: ["tangol.com"], ...enviado })]);
    const r = await procesarEntrante({ messageId: "<as@x>", fecha: "2026-11-09T11:00:00Z", de: "erika@tangol.com", para: [], cc: [],
      asunto: "Re: Travel Puzzle", texto: "", adjuntos: [], encabezados: { "Auto-Submitted": "auto-replied" } }, { repo: m.repo, subir: async () => {} });
    expect(r.estado).toBe("automatica");
  });
  it("REQ-1565: un rebote marca la dirección inválida, no cambia la etapa y Mila ya no le escribe", async () => {
    const m = memoria([base({ id: "inca", correos: ["vieja@incaworld.com", "centralincaworldtravel@gmail.com"], ...enviado })]);
    const r = await procesarEntrante({ messageId: "<b@x>", fecha: "2026-11-09T11:00:00Z", de: "mailer-daemon@googlemail.com", para: ["comercial@travelpuzzle.com.mx"], cc: [],
      asunto: "Delivery Status Notification (Failure)", texto: "Address not found: vieja@incaworld.com", adjuntos: [] }, { repo: m.repo, subir: async () => {} });
    expect(r).toEqual({ estado: "rebote", proveedorId: "inca", correos: ["vieja@incaworld.com"] });
    expect(m.lista[0]).toMatchObject({ etapa: "contactado", correosInvalidos: ["vieja@incaworld.com"] });
    const enviados: Correo[] = [];
    await revisionDiaria({ repo: m.repo, hoy: "2026-11-16T15:00:00Z", borrador: buzon(enviados) });
    expect(enviados[0].to).toEqual(["centralincaworldtravel@gmail.com"]);
  });
  it("REQ-1565: una respuesta escrita por una persona sigue contando", async () => {
    const m = memoria([base({ id: "tangol", dominios: ["tangol.com"], ...enviado })]);
    await procesarEntrante({ messageId: "<p@x>", fecha: "2026-11-09T12:00:00Z", de: "erika@tangol.com", para: [], cc: [], asunto: "Re: Travel Puzzle", texto: "Con gusto", adjuntos: [] },
      { repo: m.repo, subir: async () => {} });
    expect(m.lista[0].etapa).toBe("respondio");
  });
});

import { enVentana, fechaLocal, zonaPorDestino } from "./lib/horario";
describe("REQ-1566: horario hábil del proveedor", () => {
  it("REQ-1566: 15:00 UTC es 9:00 en México (sí) y 23:00 en Kuala Lumpur (no); sábado nunca", () => {
    expect(enVentana("2026-11-09T15:00:00Z", "America/Mexico_City")).toBe(true);
    expect(enVentana("2026-11-09T15:00:00Z", "Asia/Kuala_Lumpur")).toBe(false);
    expect(enVentana("2026-11-09T01:00:00Z", "Asia/Kuala_Lumpur")).toBe(true); // 9:00 del lunes en KL
    expect(enVentana("2026-11-07T15:00:00Z", "America/Mexico_City")).toBe(false); // sábado
    expect(enVentana("2026-11-09T15:00:00Z", "zona/rota")).toBe(true); // sin zona válida, México
  });
  it("REQ-1566: la fecha se cuenta en la zona del proveedor y la zona sale del destino", () => {
    expect(fechaLocal("2026-11-09T20:00:00Z", "Asia/Shanghai")).toBe("2026-11-10");
    expect(zonaPorDestino("Malasia, Singapur y Borneo")).toBe("Asia/Kuala_Lumpur");
    expect(zonaPorDestino("Perú")).toBe("America/Lima");
    expect(zonaPorDestino("Marte")).toBe("America/Mexico_City");
  });
  it("REQ-1566 → REQ-10693: la hora de salida es el borrador programado en el horario del proveedor (5:00–16:00 de su hora); fuera de él, 5:00 del siguiente día hábil; una sola vez", async () => {
    const asia = base({ id: "ta", correos: ["r@ta.com"], zonaHoraria: "Asia/Kuala_Lumpur", etapa: "contactado", ultimoNuestro: "2026-11-02T01:00:00Z", ultimoAsunto: "X", hiloId: "<h@x>" });
    const m = memoria([asia]);
    const enviados: Correo[] = []; const programados: string[] = [];
    const borrador = buzon(enviados, programados);
    await revisionDiaria({ repo: m.repo, hoy: "2026-11-09T15:00:00Z", borrador }); // 23:00 en KL: ya no espera, deja el borrador
    expect(enviados).toHaveLength(1);
    expect(programados).toEqual(["2026-11-09T21:00:00.000Z"]); // martes 10 nov, 5:00 en Kuala Lumpur
    await revisionDiaria({ repo: m.repo, hoy: "2026-11-10T01:00:00Z", borrador }); // la siguiente vuelta no duplica el borrador
    expect(enviados).toHaveLength(1);
  });
});

import { mandarResumen } from "./resumen";
describe("REQ-1568: envío del resumen", () => {
  it("REQ-1568: lo manda a cada número de la lista y anota los que fallan sin detener a los demás", async () => {
    const m = memoria([base({ id: "a", nombre: "Tangol", correos: ["x@tangol.com"] })]);
    const llegaron: string[] = [];
    const r = await mandarResumen({ repo: m.repo, hoy: "2026-11-09T15:00:00Z", destinos: ["5215548538822", "falla", "5216181129459"],
      avisar: async (n, t) => { if (n === "falla") throw new Error("403"); llegaron.push(n); expect(t).toContain("Esperan tu primer correo: 1"); } });
    expect(r).toEqual({ enviados: 2, errores: ["falla: 403"] });
    expect(llegaron).toEqual(["5215548538822", "5216181129459"]);
  });
});

describe("REQ-1669/REQ-1665: revisión diaria con bloqueos y lista de alta", () => {
  const callado = (x: Partial<ProveedorFila>) => base({ correos: ["c@c.com"], etapa: "contactado", ultimoNuestro: "2026-11-02T10:00:00Z", ultimoAsunto: "Travel Puzzle · hola", hiloId: "<h@x>", ...x });
  const correr = async (lista: ProveedorFila[]) => {
    const m = memoria(lista); const enviados: Correo[] = [];
    const r = await revisionDiaria({ repo: m.repo, hoy: "2026-11-09T15:00:00Z", borrador: buzon(enviados) });
    return { r, enviados };
  };
  it("REQ-1669: no manda recordatorio con folio abierto ni a un hilo sin copia a comercial@, y lo reporta", async () => {
    const { r, enviados } = await correr([callado({ id: "folio", bloqueos: { folioAbierto: "REQ-1385" } }), callado({ id: "sinhilo", hiloId: null })]);
    expect(enviados).toEqual([]);
    expect(r.detenidos).toEqual(["folio: folio abierto en la revisión cada 6 h (REQ-1385)", "sinhilo: el hilo aún no le llega con copia a comercial@"]);
  });
  it("REQ-1665: el recordatorio a un DMC pide solo lo que falta de la lista de alta", async () => {
    const { enviados } = await correr([callado({ id: "dmc", integracion: "api", checklist: ["tarifas", "cancelacion", "operacion", "legal", "contenido", "datos", "cobro"] })]);
    expect(enviados[0].text).toMatch(/acuerdo de intermediación/);
    expect(enviados[0].text).not.toMatch(/temporada/);
    expect(enviados[0].text).toMatch(/Lo que nos falta:\n1\. /);
  });
  it("REQ-1665: si ya no falta nada, el recordatorio no trae la lista", async () => {
    const { enviados } = await correr([callado({ id: "ok", integracion: "api", checklist: ["tarifas", "cancelacion", "operacion", "legal", "acuerdo", "contenido", "datos", "cobro"] })]);
    expect(enviados[0].text).not.toMatch(/nos falta/);
  });
});

describe("REQ-1665: documentos recibidos marcan la lista de alta", () => {
  it("REQ-1665: un tarifario marca «tarifas»", async () => {
    const m = memoria([base({ id: "inca", correos: ["x@inca.com"], etapa: "contactado" })]);
    await procesarEntrante({ messageId: "<t@x>", fecha: "2026-11-10T09:00:00Z", de: "x@inca.com", para: ["comercial@travelpuzzle.com.mx"], cc: [], asunto: "Re", texto: "",
      adjuntos: [{ nombre: "Tarifario 2027.pdf", tipo: "application/pdf", contenido: new Uint8Array([1]) }] }, { repo: m.repo, subir: async () => {} });
    expect(m.lista[0].checklist).toEqual(["tarifas"]);
  });
});

describe("REQ-3430: Mila consulta a la revisión cada 6 h antes de enviar", () => {
  const callado = (x: Partial<ProveedorFila>) => base({ correos: ["c@c.com"], etapa: "contactado", ultimoNuestro: "2026-11-02T10:00:00Z", ultimoAsunto: "Travel Puzzle · hola", hiloId: "<h@x>", ...x });
  it("REQ-3430: no envía si la otra tiene algo vivo, aparta 48 h cuando sí envía y falla cerrado si no puede consultar", async () => {
    const m = memoria([callado({ id: "negocia" }), callado({ id: "libre" }), callado({ id: "caido" })]);
    const apartados: import("./lib/consulta").Apartado[] = [{ proveedorId: "negocia", agente: "revision6h", motivo: "negociacion", desde: "2026-11-09T10:00:00Z", hasta: "2026-11-20T10:00:00Z" }];
    const enviados: Correo[] = [];
    const r = await revisionDiaria({ repo: m.repo, hoy: "2026-11-09T15:00:00Z", borrador: buzon(enviados),
      contacto: {
        listar: async (id) => { if (id === "caido") throw new Error("sin red"); return apartados.filter((a) => a.proveedorId === id); },
        apartar: async (a) => { apartados.push(a); },
      } });
    expect(enviados).toHaveLength(1);
    expect(r.detenidos).toEqual(["negocia: la revisión cada 6 h tiene una negociación en curso", "caido: no se pudo consultar a la otra"]);
    expect(apartados.at(-1)).toMatchObject({ proveedorId: "libre", agente: "mila", motivo: "envio", hasta: "2026-11-11T15:00:00.000Z" });
  });
});

import { HORA_ENVIO, SIN_BUZON, VENTANA_ENVIO, avisoDeBorrador, enHorarioProveedor, proximoEnvio } from "./lib/programacion";
describe("REQ-10693: todo correo a proveedores queda como borrador programado a las 5:00 CDMX del siguiente día hábil (nunca directo)", () => {
  it("REQ-10693: dentro del horario del proveedor (5:00–16:00, lunes a viernes) sale ya; antes de las 5:00, a las 5:00 de hoy; después o en fin de semana, a las 5:00 del siguiente día hábil", () => {
    expect(VENTANA_ENVIO).toEqual({ desde: 5, hasta: 16 });
    expect(HORA_ENVIO).toBe(5);
    expect(proximoEnvio("2026-11-09T15:00:00Z")).toBe("2026-11-09T15:00:00.000Z"); // lunes 9:00 CDMX → ya
    expect(proximoEnvio("2026-11-09T08:00:00Z")).toBe("2026-11-09T11:00:00.000Z"); // lunes 2:00 CDMX → 5:00 de hoy
    expect(proximoEnvio("2026-11-09T23:30:00Z")).toBe("2026-11-10T11:00:00.000Z"); // lunes 17:30 CDMX → martes 5:00
    expect(proximoEnvio("2026-11-13T23:00:00Z")).toBe("2026-11-16T11:00:00.000Z"); // viernes 17:00 → lunes 5:00
    expect(proximoEnvio("2026-11-14T15:00:00Z")).toBe("2026-11-16T11:00:00.000Z"); // sábado → lunes 5:00
    expect(proximoEnvio("2026-11-09T15:00:00Z", "Asia/Kuala_Lumpur")).toBe("2026-11-09T21:00:00.000Z"); // 23:00 en KL → martes 5:00 KL
    expect(proximoEnvio("2026-11-09T03:00:00Z", "Asia/Kuala_Lumpur")).toBe("2026-11-09T03:00:00.000Z"); // 11:00 en KL → ya
    expect(proximoEnvio("2026-11-09T15:00:00Z", "zona/rota")).toBe("2026-11-09T15:00:00.000Z"); // zona inválida = México
    expect(enHorarioProveedor("2026-11-09T15:00:00Z")).toBe(true);
    expect(enHorarioProveedor("2026-11-09T23:30:00Z")).toBe(false);
  });
  it("REQ-10693: sin buzón de borradores, la revisión se detiene y no manda nada directo aunque haya `enviar`", async () => {
    const m = memoria([base({ id: "x", correos: ["c@x.com"], etapa: "contactado", ultimoNuestro: "2026-11-02T10:00:00Z", ultimoAsunto: "Hola", hiloId: "<h@x>" })]);
    const directos: Correo[] = [];
    const r = await revisionDiaria({ repo: m.repo, hoy: "2026-11-09T15:00:00Z", enviar: async (c) => { directos.push(c); return "<1@resend>"; } });
    expect(directos).toEqual([]);
    expect(r.enviados).toBe(0);
    expect(r.detenidos).toEqual([`x: ${SIN_BUZON}`]);
    expect(m.lista[0].etapa).toBe("contactado");
  });
  it("REQ-10693: con buzón, el correo se registra como borrador programado, el seguimiento cuenta desde esa hora y el PO recibe el enlace", async () => {
    const m = memoria([base({ id: "x", nombre: "Tangol", correos: ["c@x.com"], etapa: "contactado", ultimoNuestro: "2026-11-02T10:00:00Z", ultimoAsunto: "Hola", hiloId: "<h@x>" })]);
    const enviados: Correo[] = []; const avisos: string[] = [];
    const r = await revisionDiaria({ repo: m.repo, hoy: "2026-11-09T15:00:00Z", borrador: buzon(enviados), avisarPO: async (t) => { avisos.push(t); } });
    expect(r.enviados).toBe(1);
    expect(r.borradores[0]).toMatchObject({ proveedor: "Tangol", tipo: "recordatorio", enviarEn: "2026-11-09T15:00:00.000Z" });
    expect(m.mensajes[0]).toMatchObject({ id: "<1@gmail>", direccion: "salida", tipo: "recordatorio" });
    expect(m.lista[0].ultimoNuestro).toBe("2026-11-09T15:00:00.000Z");
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toBe("Borrador programado (recordatorio) a Tangol: «Re: Hola». Sale el lunes, 9 de noviembre, 09:00 (CDMX) si no lo borras. Revisar: https://mail.google.com/mail/u/0/#drafts/1");
  });
  it("REQ-10693: el aviso al PO lleva proveedor, asunto, hora de CDMX (y la del proveedor si es otra) y enlace", () => {
    expect(avisoDeBorrador({ proveedor: "Exotic", asunto: "Re: 2027", tipo: "reintento", enviarEn: "2026-11-16T11:00:00.000Z", enlace: "https://mail.google.com/x" }))
      .toBe("Borrador programado (reintento) a Exotic: «Re: 2027». Sale el lunes, 16 de noviembre, 05:00 (CDMX) si no lo borras. Revisar: https://mail.google.com/x");
    expect(avisoDeBorrador({ proveedor: "TA", asunto: "X", tipo: "recordatorio", enviarEn: "2026-11-09T21:00:00.000Z", enlace: "https://g/x", zonaProveedor: "Asia/Kuala_Lumpur" }))
      .toBe("Borrador programado (recordatorio) a TA: «X». Sale el lunes, 9 de noviembre, 15:00 (CDMX; martes, 10 de noviembre, 05:00 hora del proveedor) si no lo borras. Revisar: https://g/x");
  });
});
