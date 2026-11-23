/**
 * REQ-10866 (frente 4, plan REQ-3454 firmado G1–G5 = A): carga por proveedor del calendario con precio por día
 * (vigencia, periodos con precio público, salidas exactas, recargos obligatorios y días «por confirmar») sobre la
 * disponibilidad que YA tiene cada viaje en D1. Puro: no lee D1 ni archivos; recibe las filas y devuelve el SQL.
 *
 * - Parte de D1, no del import: `weekdays`, `slots` y `closedDates` de la base se conservan salvo que el archivo
 *   los traiga (hallazgo del 23-11-2026: el import de Fantástica China trae `weekdays: []` y D1 sí tiene días).
 * - Un periodo trae el PRECIO PÚBLICO absoluto por opción, tal como lo ve el cliente en «Información importante»;
 *   aquí se vuelve recargo (precio del periodo − precio base de la opción en D1) que `dayPrice` suma (G2).
 *   Un periodo con `except` se parte en tramos para que la excepción (p. ej. Navidad) no se sume encima.
 * - Solo precios públicos: el archivo no trae netos ni márgenes y este módulo no los conoce (REQ-1543, REQ-1556).
 * - Candado de datos: el precio base del archivo debe coincidir con `options[].adult` de D1; si no, no se arma nada.
 */
import { z } from "zod";
import { availabilitySchema } from "../schemas/trip";
import { dayPrice, departsOn, type DayAvailability } from "./day-price";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const zFecha = z.string().regex(ISO_DATE);
const zRango = z.object({ from: zFecha, to: zFecha }).refine((r) => r.from <= r.to, "rango de fechas al revés");
const zPeriodo = z.object({
  name: z.string().min(1).max(60),
  from: zFecha,
  to: zFecha,
  except: z.array(zRango).max(12).default([]),
  prices: z.record(z.string().min(1).max(40), z.number().min(0).max(1_000_000)),
}).refine((p) => p.from <= p.to, "periodo con fechas al revés");
const zRecargo = z.object({
  name: z.string().min(1).max(60),
  from: zFecha.nullable().default(null),
  to: zFecha.nullable().default(null),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  amount: z.number().min(0).max(1_000_000),
  byOption: z.record(z.string().min(1).max(40), z.number().min(0).max(1_000_000)).default({}),
});
const zEntrada = z.object({
  ref: z.string().min(1),
  base: z.record(z.string().min(1).max(40), z.number().min(0).max(1_000_000)),
  validFrom: zFecha.nullable().optional(),
  validTo: zFecha.nullable().optional(),
  departures: z.array(zFecha).max(366).optional(),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  weekdayRules: z.array(z.object({ from: zFecha, to: zFecha, weekdays: z.array(z.number().int().min(0).max(6)).max(7) })).max(12).optional(),
  closedDates: z.array(zFecha).max(366).optional(),
  seasons: z.array(z.object({ name: z.string().min(1).max(60), from: zFecha, to: zFecha, supplement: z.number() })).max(12).optional(),
  periods: z.array(zPeriodo).max(12).default([]),
  surcharges: z.array(zRecargo).max(24).default([]),
  quoteRanges: z.array(zRango).max(12).optional(),
}).refine((e) => !e.validFrom || !e.validTo || e.validFrom <= e.validTo, "vigencia con fechas al revés");
const zArchivo = z.object({
  agency: z.object({ id: z.string().min(1), initials: z.string().min(1) }),
  trips: z.array(zEntrada).min(1),
});

export type ArchivoCalendario = z.infer<typeof zArchivo>;
export type EntradaCalendario = z.infer<typeof zEntrada>;
export type Disponibilidad = z.infer<typeof availabilitySchema>;

/** Fila de D1: `options` y `availability` llegan como texto JSON (o ya parseados). */
export interface FilaViaje { id: string; status: string; options: unknown; availability: unknown }
export interface CambioCalendario { id: string; ref: string; antes: Disponibilidad; antesTexto: string; despues: Disponibilidad }
export interface ResumenViaje { id: string; ref: string; diasOfrecidos: number; porConfirmar: number; precioMin: number | null; precioMax: number | null }
export interface PlanCalendario { cambios: CambioCalendario[]; faltan: string[]; resumen: ResumenViaje[]; sql: string; regreso: string }

// REQ-10866
export function leerArchivoCalendario(datos: unknown): ArchivoCalendario {
  const a = zArchivo.parse(datos);
  const refs = a.trips.map((t) => t.ref);
  if (new Set(refs).size !== refs.length) throw new Error("ref repetida en el archivo del calendario");
  return a;
}

/** Mismo id que la carga de viajes (`idFor` de bulk-import). */
const idDe = (initials: string, ref: string) => `${initials}-${ref}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const json = <T,>(v: unknown): T => (typeof v === "string" ? (JSON.parse(v) as T) : (v as T));
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

const diaSiguiente = (d: string) => new Date(new Date(`${d}T12:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10);
const diaAnterior = (d: string) => new Date(new Date(`${d}T12:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10);

/** Parte [from, to] quitando las excepciones; devuelve los tramos que quedan, en orden. */
function tramos(from: string, to: string, except: { from: string; to: string }[]): { from: string; to: string }[] {
  let restantes = [{ from, to }];
  for (const ex of [...except].sort((a, b) => a.from.localeCompare(b.from))) {
    restantes = restantes.flatMap((t) => {
      if (ex.to < t.from || ex.from > t.to) return [t];
      const out: { from: string; to: string }[] = [];
      if (ex.from > t.from) out.push({ from: t.from, to: diaAnterior(ex.from) });
      if (ex.to < t.to) out.push({ from: diaSiguiente(ex.to), to: t.to });
      return out;
    });
  }
  return restantes;
}

function fechasEntre(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = diaSiguiente(d)) out.push(d);
  return out;
}

// REQ-10866: disponibilidad nueva de un viaje a partir de la de D1 y su entrada del archivo.
export function armarDisponibilidad(entrada: EntradaCalendario, antes: Disponibilidad, opciones: { id: string; adult: number | null }[]): Disponibilidad {
  const porOpcion = new Map(opciones.map((o) => [o.id, o.adult]));
  for (const [id, base] of Object.entries(entrada.base)) {
    if (!porOpcion.has(id)) throw new Error(`${entrada.ref}: la opción «${id}» del archivo no existe en D1`);
    if (porOpcion.get(id) !== base) throw new Error(`${entrada.ref}: precio base de «${id}» en el archivo ${base} ≠ en D1 ${porOpcion.get(id)}: no se escribe`);
  }
  const recargosDePeriodos = entrada.periods.flatMap((p) => {
    const byOption: Record<string, number> = {};
    for (const [id, precio] of Object.entries(p.prices)) {
      const base = entrada.base[id];
      if (base === undefined) throw new Error(`${entrada.ref}: la opción «${id}» del periodo «${p.name}» no está en base`);
      if (precio < base) throw new Error(`${entrada.ref}: precio de «${id}» en «${p.name}» (${precio}) menor que el base (${base})`);
      byOption[id] = precio - base;
    }
    return tramos(p.from, p.to, p.except).map((t) => ({ name: p.name, from: t.from, to: t.to, weekdays: [] as number[], amount: 0, byOption }));
  });
  const salidas = entrada.departures ? [...entrada.departures].sort() : null;
  const validFrom = entrada.validFrom !== undefined ? entrada.validFrom : salidas ? salidas[0] : antes.validFrom;
  const validTo = entrada.validTo !== undefined ? entrada.validTo : salidas ? salidas[salidas.length - 1] : antes.validTo;
  const weekdays = entrada.weekdays ?? antes.weekdays;
  const weekdayRules = entrada.weekdayRules ?? antes.weekdayRules;
  let closedDates = entrada.closedDates ?? antes.closedDates;
  if (salidas) {
    if (!validFrom || !validTo) throw new Error(`${entrada.ref}: con salidas exactas hace falta la vigencia`);
    const conSalida = new Set(salidas);
    const base: DayAvailability = { weekdays, closedDates: [], seasons: [], weekdayRules };
    closedDates = fechasEntre(validFrom, validTo).filter((d) => departsOn(d, base) && !conSalida.has(d));
  }
  return availabilitySchema.parse({
    ...antes,
    weekdays,
    closedDates,
    seasons: entrada.seasons ?? antes.seasons,
    validFrom: validFrom ?? null,
    validTo: validTo ?? null,
    weekdayRules,
    surcharges: [...recargosDePeriodos, ...entrada.surcharges],
    quoteRanges: entrada.quoteRanges ?? antes.quoteRanges,
  });
}

function resumir(id: string, ref: string, av: Disponibilidad, opciones: { id: string; adult: number | null }[]): ResumenViaje {
  const from = av.validFrom ?? "2026-01-01";
  const to = av.validTo ?? diaSiguiente(from).slice(0, 4) + "-12-31";
  let diasOfrecidos = 0;
  let porConfirmar = 0;
  let precioMin: number | null = null;
  let precioMax: number | null = null;
  for (const d of fechasEntre(from, to)) {
    const precios = opciones.map((o) => dayPrice(d, av, o));
    const abiertos = precios.flatMap((p) => (p.status === "open" ? [p.adult] : []));
    if (abiertos.length) {
      diasOfrecidos++;
      const dia = Math.min(...abiertos);
      precioMin = precioMin === null ? dia : Math.min(precioMin, dia);
      precioMax = precioMax === null ? dia : Math.max(precioMax, dia);
    } else if (precios.some((p) => p.status === "quote")) porConfirmar++;
  }
  return { id, ref, diasOfrecidos, porConfirmar, precioMin, precioMax };
}

const update = (agencyId: string, id: string, availabilityJson: string) =>
  `UPDATE "Trip" SET "availability" = ${q(availabilityJson)} WHERE "id" = ${q(id)} AND "agencyId" = ${q(agencyId)};`;

// REQ-10866
export function planCalendario(archivo: ArchivoCalendario, filas: FilaViaje[]): PlanCalendario {
  const porId = new Map(filas.map((f) => [f.id, f]));
  const cambios: CambioCalendario[] = [];
  const faltan: string[] = [];
  const resumen: ResumenViaje[] = [];
  for (const entrada of archivo.trips) {
    const id = idDe(archivo.agency.initials, entrada.ref);
    const fila = porId.get(id);
    if (!fila) { faltan.push(id); continue; }
    const opciones = json<{ id: string; adult: number | null }[]>(fila.options);
    const antes = availabilitySchema.parse(json(fila.availability) ?? {});
    const antesTexto = typeof fila.availability === "string" ? fila.availability : JSON.stringify(fila.availability ?? {});
    const despues = armarDisponibilidad(entrada, antes, opciones);
    resumen.push(resumir(id, entrada.ref, despues, opciones));
    if (JSON.stringify(antes) === JSON.stringify(despues)) continue;
    cambios.push({ id, ref: entrada.ref, antes, antesTexto, despues });
  }
  const sql = cambios.map((c) => update(archivo.agency.id, c.id, JSON.stringify(c.despues))).join("\n") + (cambios.length ? "\n" : "");
  // El regreso devuelve el texto EXACTO que tenía D1 (no una versión normalizada).
  const regreso = cambios.map((c) => update(archivo.agency.id, c.id, c.antesTexto)).join("\n") + (cambios.length ? "\n" : "");
  return { cambios, faltan, resumen, sql, regreso };
}

// REQ-10866
export function verificarCalendario(plan: PlanCalendario, despues: { id: string; availability: unknown }[]): { ok: boolean; mal: string[] } {
  const porId = new Map(despues.map((d) => [d.id, JSON.stringify(availabilitySchema.parse(json(d.availability) ?? {}))]));
  const mal = plan.cambios.filter((c) => porId.get(c.id) !== JSON.stringify(c.despues)).map((c) => c.id);
  return { ok: mal.length === 0, mal };
}
