// REQ-1291, REQ-1293, REQ-1294, REQ-1296: orquestación con un repositorio en memoria (sin D1, Resend ni cPanel reales).
import { describe, it, expect } from "vitest";
import { procesarEntrante } from "./entrante";
import { revisionDiaria } from "./diario";
import type { ProveedorFila, ProveedoresRepo } from "./repository";
import type { Correo } from "./lib/correo";

const base = (x: Partial<ProveedorFila>): ProveedorFila => ({
  id: "p", nombre: "P", tipo: "dmc", publicado: false, bloqueado: false, agencyId: null, canal: "correo", idioma: "es", contacto: "",
  correos: [], dominios: [], destinos: "", integracion: "desconocida", cobro: "desconocido", tiempoRespuesta: "", ultimoAsunto: null, hiloId: null, notas: "", etapa: "por_contactar", recordatorios: 0, ...x,
});

function memoria(lista: ProveedorFila[]) {
  const mensajes: { id: string; proveedorId: string; direccion: string; tipo: string }[] = [];
  const documentos: { id: string }[] = [];
  const repo: ProveedoresRepo = {
    todos: async () => lista.map((p) => ({ ...p })),
    guardarEstado: async (id, s) => { const p = lista.find((x) => x.id === id)!; Object.assign(p, s); },
    registrarMensaje: async (m) => { mensajes.push(m); },
    yaRegistrado: async (id) => mensajes.some((m) => m.id === id),
    registrarDocumento: async (d) => { documentos.push(d); },
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
      base({ id: "callado", correos: ["c@callado.com"], etapa: "contactado", ultimoNuestro: "2026-11-02T10:00:00Z", ultimoAsunto: "Travel Puzzle · hola" }),
    ]);
    const enviados: Correo[] = [];
    const r = await revisionDiaria({ repo: m.repo, hoy: "2026-11-09T15:00:00Z", enviar: async (c) => { enviados.push(c); return `<${enviados.length}@resend>`; } });
    expect(r).toEqual({ enviados: 1, sinRespuesta: 0, errores: [], porPresentar: ["publicado", "nuevo"] });
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
