/**
 * REQ-10821 · Ficha única, ola 6 (plan §2: `lib/whatsapp-context.ts`). Decisión 41 (REQ-10618, PO 14-11-2026):
 * el mensaje que se abre en WhatsApp desde la ficha lleva «código, fecha, personas y opción».
 * - Código: el código Travel Puzzle del viaje; si el producto no tiene (tours), «proveedor-referencia».
 * - Solo entra lo válido (misma regla que `prefill.ts`): fecha ISO real, 1–20 adultos, opción que existe.
 * - Nunca lleva neto, operador ni teléfonos (REQ-10540): solo título, código y lo que el viajero eligió.
 * - Español o inglés según `ficha.lang`; los demás idiomas usan inglés. Sin `Intl` (INC-001).
 * Puro: sin I/O.
 */
import { waLink } from "@/home/lib/copy";
import type { FichaModel } from "./model";
import type { FichaPrefill } from "./prefill";

const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const fechaValida = (f: unknown): f is string =>
  typeof f === "string" && FECHA.test(f) && !Number.isNaN(Date.parse(`${f}T00:00:00Z`)) && new Date(`${f}T00:00:00Z`).toISOString().slice(0, 10) === f;
const entero = (x: unknown, min: number, max: number): number | null => (Number.isInteger(x) && (x as number) >= min && (x as number) <= max ? (x as number) : null);

/** Referencia que identifica el producto para el equipo: código TP o «proveedor-ref». */
// REQ-10821
export function referenciaFicha(f: Pick<FichaModel, "code" | "provider" | "externalRef">): string {
  return f.code?.trim() || `${f.provider}-${f.externalRef}`;
}

const personas = (adultos: number, ninos: number | null, en: boolean): string => {
  if (en) {
    const a = `${adultos} ${adultos === 1 ? "adult" : "adults"}`;
    return ninos ? `${a} and ${ninos} ${ninos === 1 ? "child" : "children"}` : a;
  }
  const a = `${adultos} ${adultos === 1 ? "adulto" : "adultos"}`;
  return ninos ? `${a} y ${ninos} ${ninos === 1 ? "niño" : "niños"}` : a;
};

const fechaTexto = (iso: string, en: boolean): string => {
  const m = FECHA.exec(iso)!;
  return en ? iso : `${m[3]}/${m[2]}/${m[1]}`;
};

/** Texto del mensaje de WhatsApp con el contexto de la ficha. */
// REQ-10821
export function whatsappContext(f: FichaModel, p: FichaPrefill): string {
  const en = f.lang !== "es";
  const partes: string[] = [];
  partes.push(
    en
      ? `Hi Travel Puzzle, I'm interested in «${f.title.trim()}» (code ${referenciaFicha(f)}).`
      : `Hola Travel Puzzle, me interesa «${f.title.trim()}» (código ${referenciaFicha(f)}).`,
  );
  if (fechaValida(p.fecha)) partes.push(`${en ? "Date" : "Fecha"}: ${fechaTexto(p.fecha, en)}.`);
  const adultos = entero(p.adultos, 1, 20);
  if (adultos !== null) partes.push(`${en ? "People" : "Personas"}: ${personas(adultos, entero(p.ninos, 1, 20), en)}.`);
  const opcion = p.opcion ? f.options.find((o) => o.id === p.opcion) : undefined;
  if (opcion) partes.push(`${en ? "Option" : "Opción"}: ${opcion.name.trim()}.`);
  return partes.join(" ");
}

/** Liga wa.me con el mensaje; null si no hay número configurado. */
// REQ-10821
export function whatsappLink(number: string | null | undefined, f: FichaModel, p: FichaPrefill): string | null {
  return waLink(number ?? undefined, whatsappContext(f, p));
}
