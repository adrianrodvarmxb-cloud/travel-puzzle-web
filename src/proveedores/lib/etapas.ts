// Puro · Mila administra proveedores (gates en docs/gates-proveedores-mila-2026-11.md). Sin D1, fetch ni Next.

// REQ-1291: etapas de la relación con un proveedor.
export const ETAPAS = ["por_contactar", "contactado", "respondio", "en_alta", "activo", "sin_respuesta"] as const;
export type Etapa = (typeof ETAPAS)[number];
export type Evento = "enviamos" | "contestaron" | "acepto" | "listo" | "sin_respuesta";

export interface EstadoProveedor {
  etapa: Etapa;
  ultimoSuyo?: string; // ISO
  ultimoNuestro?: string; // ISO
  recordatorios: number; // 0, 1 o 2 desde nuestro último correo
  sinRespuestaDesde?: string; // ISO
}

const SIGUIENTE: Record<Evento, (e: Etapa) => Etapa> = {
  enviamos: (e) => (e === "por_contactar" || e === "sin_respuesta" ? "contactado" : e),
  contestaron: (e) => (e === "en_alta" || e === "activo" ? e : "respondio"),
  acepto: (e) => (e === "activo" ? e : "en_alta"),
  listo: () => "activo",
  sin_respuesta: (e) => (e === "contactado" ? "sin_respuesta" : e),
};

// REQ-1291: aplica un evento con su fecha y deja el último mensaje de cada lado.
export function aplicarEvento(s: EstadoProveedor, ev: Evento, cuando: string, esRecordatorio = false): EstadoProveedor {
  const etapa = SIGUIENTE[ev](s.etapa);
  if (ev === "enviamos") return { ...s, etapa, ultimoNuestro: cuando, recordatorios: esRecordatorio ? s.recordatorios + 1 : 0, sinRespuestaDesde: undefined };
  if (ev === "contestaron") return { ...s, etapa, ultimoSuyo: cuando, recordatorios: 0, sinRespuestaDesde: undefined };
  if (ev === "sin_respuesta") return { ...s, etapa, sinRespuestaDesde: etapa === "sin_respuesta" ? cuando : s.sinRespuestaDesde };
  return { ...s, etapa };
}
