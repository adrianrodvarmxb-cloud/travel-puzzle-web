// Puro · REQ-1669: Mila no escribe a un proveedor si choca con la revisión cada 6 h (REQ-1397, REQ-1413).
export interface Bloqueos { borradorSinEnviar?: boolean; acuerdoEnNegociacion?: boolean; folioAbierto?: string | null }
export interface ParaEscribir { bloqueos: Bloqueos; hiloId: string | null }
export type Permiso = { ok: true } | { ok: false; motivo: string };

// REQ-1669
export function puedeEscribir(p: ParaEscribir): Permiso {
  const b = p.bloqueos ?? {};
  if (b.borradorSinEnviar) return { ok: false, motivo: "hay un borrador sin enviar" };
  if (b.acuerdoEnNegociacion) return { ok: false, motivo: "el acuerdo está en negociación" };
  if (b.folioAbierto) return { ok: false, motivo: `folio abierto en la revisión cada 6 h (${b.folioAbierto})` };
  // Solo sigue hilos que ya le llegaron (todo lo que procesa entró a comercial@, en copia).
  if (!p.hiloId) return { ok: false, motivo: "el hilo aún no le llega con copia a comercial@" };
  return { ok: true };
}
