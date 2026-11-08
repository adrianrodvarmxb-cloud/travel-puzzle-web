// I/O · REQ-1333: arma el resumen semanal y lo manda a cada número por el puente de avisos de Mila (REQ-1335).
import { textoResumen } from "./lib/resumen";
import { siguienteAccion } from "./lib/seguimiento";
import type { ProveedoresRepo } from "./repository";

export interface DepsResumen { repo: ProveedoresRepo; avisar: (numero: string, texto: string) => Promise<void>; destinos: string[]; hoy: string }

export async function mandarResumen(deps: DepsResumen): Promise<{ enviados: number; errores: string[] }> {
  const desde = new Date(Date.parse(deps.hoy) - 7 * 86_400_000).toISOString();
  const [proveedores, mensajes, documentos] = await Promise.all([deps.repo.todos(), deps.repo.mensajesDesde(desde), deps.repo.documentosDesde(desde)]);
  // «Esta semana sale»: lo que tocará en los próximos 5 días hábiles.
  const proximos: string[] = [];
  for (const p of proveedores) {
    for (let d = 1; d <= 7; d++) {
      const dia = new Date(Date.parse(deps.hoy) + d * 86_400_000).toISOString();
      const a = siguienteAccion(p, dia);
      if (a === "recordatorio" || a === "reintento") { proximos.push(`${a === "recordatorio" ? "Recordatorio" : "Reintento"} a ${p.nombre} (${dia.slice(0, 10)})`); break; }
    }
  }
  const texto = textoResumen({ proveedores, mensajes, documentos, proximos });
  const r = { enviados: 0, errores: [] as string[] };
  for (const n of deps.destinos) {
    try { await deps.avisar(n, texto); r.enviados++; } catch (e) { r.errores.push(`${n}: ${(e as Error).message}`); }
  }
  return r;
}
