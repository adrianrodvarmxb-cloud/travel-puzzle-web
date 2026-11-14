// Puro · REQ-3355: lo que Mila ve de las condiciones de cada proveedor (REQ-3358: solo condiciones, nunca netos,
// márgenes, correos, teléfonos ni notas internas). Solo publicados y no bloqueados; FREETOUR nunca.
import { FREETOUR } from "./catalogo";

export interface FilaCondiciones {
  id: string; nombre: string; tipo: string; cobro: string; publicado: boolean; bloqueado: boolean;
  cancelacion?: string; cambios?: string; pagos?: string; operacion?: string; condicionesFecha?: string | null;
}

export interface CondicionesAgente {
  id: string; nombre: string;
  tipo: "dmc" | "plataforma";
  cobra: "Travel Puzzle" | "la plataforma" | "por confirmar";
  cancelacion: string; cambios: string; pagos: string; operacion: string;
  actualizadas: string | null;
  completas: boolean;
}

const COBRA = { travelpuzzle: "Travel Puzzle", proveedor: "la plataforma" } as const;

// REQ-3355
export function condicionesParaAgente(filas: FilaCondiciones[], id?: string): CondicionesAgente[] {
  return filas
    .filter((f) => f.publicado && !f.bloqueado && f.id !== FREETOUR && !f.id.includes(FREETOUR))
    .filter((f) => !id || f.id === id)
    .map((f) => {
      const c = { cancelacion: f.cancelacion ?? "", cambios: f.cambios ?? "", pagos: f.pagos ?? "", operacion: f.operacion ?? "" };
      return {
        id: f.id, nombre: f.nombre,
        tipo: f.tipo === "plataforma" ? "plataforma" : "dmc",
        cobra: COBRA[f.cobro as keyof typeof COBRA] ?? "por confirmar",
        ...c,
        actualizadas: f.condicionesFecha ?? null,
        completas: Object.values(c).every(Boolean),
      };
    });
}
