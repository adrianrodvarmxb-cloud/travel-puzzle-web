// Puro · REQ-1572: lista de alta por proveedor en 8 grupos. Mila pide solo lo que falta y marca lo recibido.
// Integración (REQ-1298) y cobro (REQ-1573) se piden con sus propias reglas; aquí se agregan los otros 6 grupos.
import { pedidosDeCobro, pedidosDeIntegracion, type Cobro, type Integracion } from "./integracion";

export type TipoProveedor = "dmc" | "plataforma" | "api";
export type Grupo = "integracion" | "tarifas" | "cobro" | "cancelacion" | "operacion" | "legal" | "contenido" | "datos";
export interface Punto { id: string; grupo: Grupo; aplica: ("dmc" | "plataforma")[]; es: string; en: string }

const ambos: ("dmc" | "plataforma")[] = ["dmc", "plataforma"];

// OCP: un punto nuevo se agrega aquí como dato.
export const PUNTOS: Punto[] = [
  { id: "integracion", grupo: "integracion", aplica: ambos, es: "", en: "" }, // texto en integracion.ts
  { id: "cobro", grupo: "cobro", aplica: ambos, es: "", en: "" }, // texto en integracion.ts
  { id: "tarifas", grupo: "tarifas", aplica: ["dmc"],
    es: "Tarifario neto vigente por temporada, con las fechas de cada temporada, y los suplementos: habitación individual, media pensión, pensión completa y vuelos internos.",
    en: "Current net rates by season, with the dates of each season, and supplements: single room, half board, full board and internal flights." },
  { id: "cancelacion", grupo: "cancelacion", aplica: ambos,
    es: "Política de cancelación y cambios: plazos, cargos y cómo se hace el reembolso.",
    en: "Cancellation and change policy: deadlines, fees and how refunds are made." },
  { id: "operacion", grupo: "operacion", aplica: ["dmc"],
    es: "Contacto de operación y emergencias 24/7 durante el viaje (nombre, teléfono y WhatsApp).",
    en: "24/7 operations and emergency contact during the trip (name, phone and WhatsApp)." },
  { id: "operacion", grupo: "operacion", aplica: ["plataforma"],
    es: "Contacto de soporte para agencias, para dudas de reservas.",
    en: "Agency support contact for booking questions." },
  { id: "legal", grupo: "legal", aplica: ["dmc"],
    es: "Datos legales de la empresa (razón social y número de registro o licencia de turismo) y si cuentan con seguro de responsabilidad civil.",
    en: "Company legal details (legal name and tourism registration or licence number) and whether you have liability insurance." },
  { id: "acuerdo", grupo: "legal", aplica: ["dmc"],
    es: "Revisión y firma del acuerdo de intermediación (se los enviamos para revisión).",
    en: "Review and signature of the intermediation agreement (we will send it for your review)." },
  { id: "legal", grupo: "legal", aplica: ["plataforma"],
    es: "Los términos para agencias o afiliados que debemos aceptar.",
    en: "The agency or affiliate terms we need to accept." },
  { id: "contenido", grupo: "contenido", aplica: ambos,
    es: "Fotos y descripciones que podemos publicar, y el crédito que debemos poner.",
    en: "Photos and descriptions we may publish, and the credit we should include." },
  { id: "datos", grupo: "datos", aplica: ambos,
    es: "Qué datos del viajero necesitan para cada reserva (para pedir solo esos).",
    en: "Which traveler details you need for each booking (so we only collect those)." },
];

const tipoBase = (t: TipoProveedor): "dmc" | "plataforma" => (t === "dmc" ? "dmc" : "plataforma");

// REQ-1572: los puntos de su tipo que aún no llegan.
export function faltantes(tipo: TipoProveedor, recibidos: string[]): Punto[] {
  return PUNTOS.filter((p) => p.aplica.includes(tipoBase(tipo)) && !recibidos.includes(p.id));
}

export interface DatosAlta { tipo: TipoProveedor; integracion: Integracion; cobro: Cobro; idioma: "es" | "en"; recibidos: string[] }

// REQ-1572: el texto de cada pedido, en orden: integración, tarifas, cobro, cancelación, operación, legal, contenido, datos.
export function pedidosDeAlta(d: DatosAlta): string[] {
  const orden: Grupo[] = ["integracion", "tarifas", "cobro", "cancelacion", "operacion", "legal", "contenido", "datos"];
  const f = faltantes(d.tipo, d.recibidos).sort((a, b) => orden.indexOf(a.grupo) - orden.indexOf(b.grupo));
  return f.flatMap((p) => {
    if (p.id === "integracion") return pedidosDeIntegracion(d.integracion, d.idioma);
    if (p.id === "cobro") return pedidosDeCobro(d.cobro, d.idioma, d.tipo);
    return [d.idioma === "en" ? p.en : p.es];
  });
}

// REQ-1572: qué punto cubre un documento, por su nombre (lo demás lo marca el equipo en la ficha).
const POR_NOMBRE: [RegExp, string][] = [
  [/tarif|rates?\b|tariff|precios|price/i, "tarifas"],
  [/cancel/i, "cancelacion"],
  [/licen|registro|rnt|seguro|insurance|acta|constitu/i, "legal"],
  [/acuerdo|agreement|contrato/i, "acuerdo"],
  [/\.(jpe?g|png|webp)$/i, "contenido"],
];
export function puntosDeDocumento(nombre: string): string[] {
  const m = POR_NOMBRE.find(([re]) => re.test(nombre));
  return m ? [m[1]] : [];
}

export const marcarRecibidos = (actual: string[], nuevos: string[]): string[] => [...new Set([...actual, ...nuevos])];
