import { describe, it, expect } from "vitest";
import { findProviderErrorValue, isProviderErrorValue } from "./data-hygiene";
import { infoTourSchema } from "./schemas";

/** El caso real de la corrida 43303152904 (REQ-3487): un 504 de Tangol metido como subtipo. */
const realCase = infoTourSchema.parse({
  TourId: 98765,
  Name: "Mountain Bike Cuesta Del Obispo",
  TypeCode: "EXCURSION",
  SubTypeCode: "[METHOD ERROR 504]",
  TourType: 2,
  Duration: "4 Horas",
});

describe("REQ-3504: valores con forma de error del proveedor", () => {
  it("REQ-3504: el caso real «[METHOD ERROR 504]» es un error del proveedor", () => {
    expect(isProviderErrorValue("[METHOD ERROR 504]")).toBe(true);
  });

  it.each([
    "[METHOD ERROR 500]",
    "[method error 404]",
    " [METHOD ERROR 502] ",
    "[METHOD ERROR]",
    "[ERROR]",
    "[Error 503]",
    "[HTTP 503]",
    "[503]",
    "[ 429 ]",
    "[EXCEPTION]",
    "null",
    "NULL",
    "undefined",
    "ERROR",
    "Exception",
    "System.NullReferenceException: Object reference not set to an instance of an object.",
    "TimeoutException",
    "Object reference not set to an instance of an object.",
    "504 Gateway Time-out",
    "502 Bad Gateway",
    "500 Internal Server Error",
    "Recorrido por la quebrada [METHOD ERROR 504] con guía",
  ])("REQ-3504: «%s» es un error del proveedor", (value) => {
    expect(isProviderErrorValue(value)).toBe(true);
  });

  it.each([
    "Mountain Bike Cuesta Del Obispo",
    "Escape Room Error 404",
    "Los errores de la historia: tour a pie",
    "Museo del Error y la Ilusión",
    "Error de cálculo: clase de matemáticas en la playa",
    "Tour sin errores por Buenos Aires",
    "Excepcional atardecer en el Glaciar",
    "Recorrido de 500 km por la Ruta 40",
    "[Nuevo] City Tour Buenos Aires",
    "Caminata [500 m de desnivel]",
    "Null Island: excursión en kayak",
    "AVENTURA",
    "IN/OUT",
    "",
  ])("REQ-3504: «%s» NO es un error del proveedor (la palabra en otro sentido no descarta)", (value) => {
    expect(isProviderErrorValue(value)).toBe(false);
  });

  it("REQ-3504: null y undefined de verdad (campo vacío) no son error: la columna los acepta", () => {
    expect(isProviderErrorValue(null)).toBe(false);
    expect(isProviderErrorValue(undefined)).toBe(false);
  });

  it("REQ-3504: en el tour real señala el campo `subTypeCode` y su valor, sin adivinar el correcto", () => {
    expect(findProviderErrorValue(realCase)).toEqual({ field: "subTypeCode", value: "[METHOD ERROR 504]" });
  });

  it("REQ-3504: revisa título, tipo, duración y los textos del detalle", () => {
    const base = { ...realCase, subTypeCode: "AVENTURA" };
    expect(findProviderErrorValue(base)).toBeNull();
    expect(findProviderErrorValue({ ...base, name: "[METHOD ERROR 500]" })?.field).toBe("name");
    expect(findProviderErrorValue({ ...base, typeCode: "null" })?.field).toBe("typeCode");
    expect(findProviderErrorValue({ ...base, duration: "undefined" })?.field).toBe("duration");
    expect(findProviderErrorValue({ ...base, details: { Description: "502 Bad Gateway" } })?.field).toBe("details.Description");
    expect(findProviderErrorValue({ ...base, details: { ShortDescription: "[ERROR]" } })?.field).toBe("details.ShortDescription");
  });

  it("REQ-3504: un detalle con otra forma no truena la revisión", () => {
    const base = { ...realCase, subTypeCode: "AVENTURA" };
    expect(findProviderErrorValue({ ...base, details: "texto suelto" })).toBeNull();
    expect(findProviderErrorValue({ ...base, details: { Description: 42 } })).toBeNull();
  });
});
