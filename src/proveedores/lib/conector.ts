/**
 * Puro · REQ-10694: conector de proveedores con la regla firmada por el PO (REQ-10691, 15 nov 2026):
 *   orden de canal  API  >  portal automatizado por Mila (solo si los términos del proveedor NO prohíben software ni
 *   extracción, o hay permiso escrito)  >  captura por una persona.
 * - La API se pide al contacto comercial (PO o Claudia); mientras no haya, Mila no la inventa.
 * - En un portal cuyos términos prohíben software (caso Extime) NO se automatiza y NO se pide permiso: una persona
 *   captura hasta tener API (PO, 15 nov 11:12). Mila deja la reserva completa preparada (producto, fecha, personas,
 *   opción, datos del viajero), nunca el neto.
 * - La reserva cuenta como hecha solo con la confirmación del proveedor (API, portal o correo).
 * - La regla concreta de cada proveedor se firma en la sección 3 de su expediente (REQ-10690); aquí solo se refleja.
 * Todo tras `PROVEEDORES_CONECTOR_ON` (REQ-10695, "false"); apagado, Mila no reserva, cancela ni cambia con nadie.
 * Sin red, base, reloj ni process.env.
 */

export type Canal = "api" | "portal-automatizado" | "persona";
export type Operacion = "reservar" | "cancelar" | "cambiar";
export type Fundamento = "terminos-lo-permiten" | "permiso-escrito";

export interface ReglaProveedor {
  proveedorId: string;
  /** API de reservas disponible y con credenciales cargadas (nunca aquí: viven como Secret). */
  api: boolean;
  portal: {
    existe: boolean;
    /** Solo true con fundamento; sin fundamento no cuenta. */
    automatizable: boolean;
    fundamento: Fundamento | null;
    /** Decisión del PO de no pedir permiso de automatizar (Extime: no se pide hasta tener API). */
    sinPedirPermiso?: boolean;
  };
  /** Operaciones que el proveedor acepta por correo (p. ej. cancelaciones). */
  porCorreo: Operacion[];
  /** Referencia a la sección 3 del expediente que sostiene esta regla. */
  expediente: string;
}

export interface Decision { canal: Canal; motivo: string; regla: string }

export interface ReservaPreparada {
  proveedorId: string; producto: string; fecha: string; adultos: number; ninos: number; opcion: string | null;
  viajero: { nombre: string; correo: string; telefono: string };
  /** Siempre el precio público; el neto no entra a este objeto. */
  precioPublico: { monto: number; moneda: string } | null;
  notas: string;
}

/** REQ-10694: encendido solo con "true" exacto. */
export const conectorEncendido = (env: { PROVEEDORES_CONECTOR_ON?: string }) => env.PROVEEDORES_CONECTOR_ON === "true";

/** REQ-10694: el portal cuenta como automatizable solo con fundamento (términos lo permiten o permiso escrito). */
export function portalAutomatizable(p: ReglaProveedor["portal"]): boolean {
  return p.existe && p.automatizable && p.fundamento !== null;
}

// REQ-10694 (REQ-10691 a, c, e)
export function canalPara(regla: ReglaProveedor, operacion: Operacion): Decision {
  if (regla.api) return { canal: "api", motivo: "API del proveedor con credenciales", regla: "REQ-10691-a" };
  if (portalAutomatizable(regla.portal)) return { canal: "portal-automatizado", motivo: `portal B2B automatizado por Mila (${regla.portal.fundamento})`, regla: "REQ-10691-c" };
  if (regla.portal.existe && !regla.portal.automatizable) {
    const extra = regla.portal.sinPedirPermiso ? "; no se pide permiso de automatizar hasta tener API" : "";
    return { canal: "persona", motivo: `portal cuyos términos no permiten software${extra}: Mila prepara y una persona captura`, regla: "REQ-10691-c" };
  }
  if (regla.porCorreo.includes(operacion)) return { canal: "persona", motivo: "el proveedor acepta esta operación por correo: Mila redacta el borrador y una persona lo revisa (REQ-10693)", regla: "REQ-10691-e" };
  return { canal: "persona", motivo: "sin API ni portal automatizable: Mila prepara y una persona captura", regla: "REQ-10691-c" };
}

/** REQ-10694 (REQ-10691 c): lo que Mila deja listo para la persona; rechaza netos y datos incompletos. */
export function prepararReserva(r: ReservaPreparada): { ok: true; paquete: ReservaPreparada } | { ok: false; motivo: string } {
  const claves = Object.keys(r as unknown as Record<string, unknown>).concat(Object.keys(r.precioPublico ?? {}));
  if (claves.some((k) => /neto|net|comision|margen|markup/i.test(k))) return { ok: false, motivo: "el paquete nunca lleva neto, comisión ni margen" };
  if (!r.producto.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(r.fecha)) return { ok: false, motivo: "falta producto o fecha" };
  if (!Number.isInteger(r.adultos) || r.adultos < 1 || !Number.isInteger(r.ninos) || r.ninos < 0) return { ok: false, motivo: "personas inválidas" };
  if (!r.viajero.nombre.trim() || !r.viajero.correo.includes("@")) return { ok: false, motivo: "faltan datos del viajero" };
  return { ok: true, paquete: { ...r, notas: r.notas.trim() } };
}

export type EstadoReserva = "preparada" | "capturada" | "confirmada" | "rechazada";

/** REQ-10694 (REQ-10691 d): solo la confirmación del proveedor cierra la reserva; una captura no basta. */
export function siguienteEstado(actual: EstadoReserva, evento: "persona-capturo" | "api-ok" | "portal-ok" | "proveedor-confirmo" | "proveedor-rechazo"): EstadoReserva {
  if (actual === "confirmada" || actual === "rechazada") return actual;
  if (evento === "proveedor-confirmo") return "confirmada";
  if (evento === "proveedor-rechazo") return "rechazada";
  if (evento === "persona-capturo" || evento === "api-ok" || evento === "portal-ok") return "capturada";
  return actual;
}

/**
 * Reglas por proveedor. «A» = lo firmado en su expediente; lo que no tiene expediente firmado cae en persona.
 * REQ-10696 (hijo de REQ-10691 para Extime, REQ-10692 pendiente 5): API pendiente de credenciales; portal
 * pro.extimetravel.com NO automatizable (sus términos prohíben software) y no se pide permiso; cancelaciones por correo.
 */
export const REGLAS: Readonly<Record<string, ReglaProveedor>> = {
  "extime-travel": {
    proveedorId: "extime-travel", api: false,
    portal: { existe: true, automatizable: false, fundamento: null, sinPedirPermiso: true },
    porCorreo: ["cancelar", "cambiar"],
    expediente: "proveedores/extime-expediente-2026-11-15.md §3 (REQ-10692)",
  },
  tangol: {
    // REQ-1552: la API va por la pasarela y hoy es solo lectura (5 operaciones); reservar por API entra cuando se firme el plan #553.
    proveedorId: "tangol", api: false,
    portal: { existe: false, automatizable: false, fundamento: null },
    porCorreo: ["cancelar", "cambiar"],
    expediente: "proveedores/tangol-expediente-2026-11-15.md §3 (REQ-10690)",
  },
};

/** Sin regla firmada: persona, sin excepciones (REQ-10691 g). */
export function reglaDe(proveedorId: string, reglas: Readonly<Record<string, ReglaProveedor>> = REGLAS): ReglaProveedor {
  return reglas[proveedorId] ?? { proveedorId, api: false, portal: { existe: false, automatizable: false, fundamento: null }, porCorreo: [], expediente: "sin expediente firmado" };
}
