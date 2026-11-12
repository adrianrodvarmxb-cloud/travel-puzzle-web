// Puro · REQ-3430: Mila y la revisión cada 6 h se consultan antes de escribirle a un proveedor (REQ-3429; gate G1 = A, lista privada).
export type Agente = "mila" | "revision6h";
export type MotivoApartado = "borrador" | "negociacion" | "folio" | "envio";
export interface Apartado { proveedorId: string; agente: Agente; motivo: MotivoApartado; desde: string; hasta: string; nota?: string }
export type Decision = { ok: true } | { ok: false; motivo: string; reintentar: string };

const HORA = 3_600_000;
const mas = (iso: string, horas: number) => new Date(Date.parse(iso) + horas * HORA).toISOString();
const DESCRIPCION: Record<MotivoApartado, string> = {
  borrador: "tiene un borrador sin enviar",
  negociacion: "tiene una negociación en curso",
  folio: "tiene un folio abierto",
  envio: "tiene un envío programado",
};

// REQ-3430: null = no se pudo leer la lista → no envía. Desempate: gana quien apartó primero; la otra vuelve a consultar en 24 h.
export function consultar(apartados: Apartado[] | null, quien: Agente, proveedorId: string, ahora: string): Decision {
  const reintentar = mas(ahora, 24);
  if (!apartados) return { ok: false, motivo: "no se pudo consultar a la otra", reintentar };
  const vivos = apartados.filter((a) => a.proveedorId === proveedorId && Date.parse(a.hasta) > Date.parse(ahora));
  const otra = vivos.filter((a) => a.agente !== quien).sort((a, b) => Date.parse(a.desde) - Date.parse(b.desde));
  if (!otra.length) return { ok: true };
  const mio = vivos.filter((a) => a.agente === quien).map((a) => Date.parse(a.desde));
  if (mio.length && Math.min(...mio) < Date.parse(otra[0].desde)) return { ok: true };
  const motivo = otra[0].agente === "mila" ? "Mila le escribió o tiene un envío programado" : `la revisión cada 6 h ${DESCRIPCION[otra[0].motivo]}`;
  return { ok: false, motivo, reintentar };
}

// REQ-3430: cuando Mila envía, aparta 48 h para que la revisión cada 6 h no le escriba encima.
export function apartarEnvio(quien: Agente, proveedorId: string, ahora: string, horas = 48): Apartado {
  return { proveedorId, agente: quien, motivo: "envio", desde: ahora, hasta: mas(ahora, horas) };
}
