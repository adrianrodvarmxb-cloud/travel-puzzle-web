/**
 * Primera Pieza en «Arma tu viaje»: fecha en la zona de la ciudad, costo y país del viajero. Puro, sin Intl
 * (se calcula en el servidor y el cliente solo pinta el texto; INC-001).
 */
import { shortDate } from "./switch";

const LOCAL = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/;
const DAY = /^(\d{4}-\d{2}-\d{2})/;

/**
 * REQ-180: fecha y hora para el cliente. `localDate` es el `date` de FREETOUR, que ya viene en la zona horaria
 * de la ciudad del tour (regla E3): es la conversión de `utcDate` a la ciudad que hace el proveedor. Sin hora
 * local se muestra solo el día UTC, sin inventar hora.
 */
export function pieceWhen(localDate: string | null | undefined, utcDate: string | null | undefined): string | null {
  const m = localDate ? LOCAL.exec(localDate) : null;
  if (m) return `${shortDate(m[1])}, ${m[2]}:${m[3]}`;
  const d = utcDate ? DAY.exec(utcDate) : null;
  return d ? shortDate(d[1]) : null;
}

/** REQ-180: día (AAAA-MM-DD) en la ciudad del tour, para prellenar WhatsApp y las búsquedas de los adaptadores. */
export function pieceDay(localDate: string | null | undefined, utcDate: string | null | undefined): string | null {
  const m = localDate ? LOCAL.exec(localDate) : null;
  if (m) return m[1];
  const d = utcDate ? DAY.exec(utcDate) : null;
  return d ? d[1] : null;
}

/**
 * REQ-183: «Costo 0» solo si la reserva no quedó con tarifa fija. El precio de la reserva sale de
 * `fullPricePerGroup` del evento para ese tamaño de grupo (event-check.ts) y se cobra en EUR (regla D4).
 */
export function pieceCost(price: number | null | undefined, label: { main: string; approx: string | null } | null): string {
  if (!price || !Number.isFinite(price) || price <= 0) return "Costo 0";
  if (!label) return `Tarifa fija del grupo: EUR ${price}`;
  return `Tarifa fija del grupo: ${label.main}${label.approx ? ` (${label.approx})` : ""}`;
}

/**
 * REQ-181: prefijos internacionales que corresponden a un solo país (datos, no código por país).
 * Los prefijos compartidos (+1 EE. UU./Canadá, +7 Rusia/Kazajistán…) no se incluyen: el viajero queda desconocido.
 */
const CALLING_CODES: Record<string, string> = {
  "52": "MX", "51": "PE", "57": "CO", "54": "AR", "56": "CL", "58": "VE", "593": "EC", "591": "BO", "595": "PY", "598": "UY",
  "502": "GT", "503": "SV", "504": "HN", "505": "NI", "506": "CR", "507": "PA", "53": "CU", "34": "ES", "351": "PT",
  "33": "FR", "39": "IT", "49": "DE", "44": "GB", "31": "NL", "32": "BE", "41": "CH", "43": "AT", "30": "GR", "353": "IE",
  "55": "BR", "86": "CN", "81": "JP", "82": "KR", "91": "IN", "61": "AU", "64": "NZ", "90": "TR", "971": "AE", "20": "EG",
};

/** REQ-181: país del viajero según el prefijo del teléfono de la reserva. Sin «+» o «00», o prefijo ambiguo: null. */
export function travelerCountryFromPhone(phone: string | null | undefined): string | null {
  const t = phone?.trim() ?? "";
  const intl = /^\+/.test(t) ? t.slice(1) : /^00/.test(t) ? t.slice(2) : null;
  if (intl === null) return null;
  const digits = intl.replace(/\D/g, "");
  for (const len of [3, 2]) {
    const c = CALLING_CODES[digits.slice(0, len)];
    if (c) return c;
  }
  return null;
}
