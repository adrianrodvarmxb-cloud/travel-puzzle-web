/**
 * REQ-10527: describe la forma de una respuesta (llaves, tipos, largos) sin copiar su contenido, para
 * diagnosticar qué manda Tangol en `TourDetails` sin volcar textos ni datos del proveedor al log. Pura.
 */
export type Shape = string | Shape[] | { [k: string]: Shape };

// REQ-10527
export function shapeOf(v: unknown, depth = 4): Shape {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (typeof v === "string") return `string(${v.length})`;
  if (typeof v !== "object") return typeof v;
  if (Array.isArray(v)) return v.length && depth > 0 ? [`array(${v.length})`, shapeOf(v[0], depth - 1)] : [`array(${v.length})`];
  const keys = Object.keys(v as object);
  if (depth <= 0) return `object(${keys.length} llaves)`;
  return Object.fromEntries(keys.map((k) => [k, shapeOf((v as Record<string, unknown>)[k], depth - 1)]));
}
