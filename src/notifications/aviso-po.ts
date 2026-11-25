/**
 * REQ-10876 · Aviso al PO por los mismos canales del aviso de tipo nuevo (correo por Resend con varios destinatarios,
 * REQ-10744; WhatsApp por el puente de Mila, REQ-10758): recibe los canales por parámetro y nunca los importa. Un canal
 * que falla no detiene al otro; sin canales configurados, solo queda constancia en el log. No lleva bandera propia: el
 * tope del sync diario avisa siempre («no retira nada y avisa al PO»).
 */
import { avisoTipoNuevoDeps } from "@/taxonomy/aviso-tipo-nuevo";

export interface CanalesAvisoPO {
  correo?: (c: { asunto: string; texto: string }) => Promise<void>;
  whatsapp?: (texto: string) => Promise<void>;
  log?: (linea: string) => void;
}

export interface ResultadoAvisoPO { canales: string[]; omitidos: string[]; errores: string[] }

// REQ-10876
export async function avisarPO(aviso: { asunto: string; texto: string; whatsapp?: string }, canales: CanalesAvisoPO): Promise<ResultadoAvisoPO> {
  const r: ResultadoAvisoPO = { canales: [], omitidos: [], errores: [] };
  const envios: [string, (() => Promise<void>) | undefined][] = [
    ["correo", canales.correo && (() => canales.correo!({ asunto: aviso.asunto, texto: aviso.texto }))],
    ["whatsapp", canales.whatsapp && (() => canales.whatsapp!(aviso.whatsapp ?? aviso.texto))],
  ];
  for (const [nombre, manda] of envios) {
    if (!manda) { r.omitidos.push(`${nombre} sin configurar`); continue; }
    try { await manda(); r.canales.push(nombre); }
    catch (e) { r.errores.push(`${nombre}: ${e instanceof Error ? e.message : String(e)}`); }
  }
  canales.log?.(`[aviso-po] ${aviso.asunto} · canales: ${r.canales.join(", ") || "ninguno"}${r.omitidos.length ? ` · omitidos: ${r.omitidos.join(", ")}` : ""}${r.errores.length ? ` · errores: ${r.errores.join(" | ")}` : ""}`);
  return r;
}

/** Canales reales desde el entorno de Actions: los mismos que arma el aviso de tipo nuevo (sin su bandera). */
// REQ-10876
export function canalesAvisoPODesdeEntorno(env: Record<string, string | undefined>, io: Parameters<typeof avisoTipoNuevoDeps>[1]): CanalesAvisoPO {
  const d = avisoTipoNuevoDeps(env, io);
  return { correo: d.correo, whatsapp: d.whatsapp, log: io.log };
}
