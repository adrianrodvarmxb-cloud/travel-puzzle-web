// Lista cerrada de operaciones de lectura que la pasarela puede hacer en Tangol (REQ-1551).
// Reservas y cancelaciones van en la ola 4 (REQ-1548). Cualquier otra cosa se rechaza.

const isInt = (v, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isInteger(v) && v >= min && v <= max;
const isCode = (v) => typeof v === "string" && /^[A-Za-z0-9]{1,10}$/.test(v);
const bad = (reason) => ({ ok: false, reason });

const OPERATIONS = {
  getCountries() {
    return { ok: true, method: "GET", path: "/Tour/GetTourCountries" };
  },
  getDestinations(p) {
    return typeof p.countryCode === "string" && /^[A-Za-z]{2,3}$/.test(p.countryCode)
      ? { ok: true, method: "GET", path: "/Tour/GetTourDestinations", query: { "params.countryCode": p.countryCode } }
      : bad("countryCode");
  },
  getTourList(p) {
    if (!isInt(p.destinationId, 1) || !isInt(p.languageCode, 0, 4) || !isInt(p.currency, 0, 3)) return bad("datos de la lista");
    const query = { "params.destinationId": p.destinationId, "params.languageCode": p.languageCode, "params.currency": p.currency };
    if (p.includeDetails === true) query["params.includeDetails"] = "true";
    return { ok: true, method: "GET", path: "/Tour/GetTourListByDestination", query };
  },
  getTourDetailsList(p) {
    const ids = p.tourIds;
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 50 || !ids.every((v) => isInt(v, 1))) return bad("tourIds");
    if (!isCode(p.languageCode) || !isCode(p.currency)) return bad("idioma o moneda");
    return { ok: true, method: "POST", path: "/Tour/GetTourDetailsList", body: { TourIdList: ids, LanguageCode: p.languageCode, Currency: p.currency } };
  },
  getTourRates(p) {
    if (!isInt(p.tourId, 1) || !isCode(p.languageCode) || !isCode(p.currency)) return bad("datos de tarifas");
    return { ok: true, method: "POST", path: "/Tour/GetTourRates", body: { TourId: p.tourId, LanguageCode: p.languageCode, Currency: p.currency } };
  },
};

export const TANGOL_OPERATION_NAMES = Object.keys(OPERATIONS);

// REQ-1551
export function toTangolRequest(op, payload) {
  const fn = Object.hasOwn(OPERATIONS, op) ? OPERATIONS[op] : null;
  if (!fn) return bad("operación no permitida");
  return fn(payload && typeof payload === "object" ? payload : {});
}
