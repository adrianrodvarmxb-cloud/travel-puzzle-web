/**
 * REQ-10688 · Ficha única (frente #549), ola 3, decisión 13 (REQ-10592, PO 14-11): «El PO aprueba la reclasificación de
 * Tangol, de las 7 agencias y también la de FREETOUR… Antes de aplicar cada una se le muestra la lista de cambios y de dudas».
 * Esta pieza arma la lista de DUDAS del mapeo de Tangol (`src/taxonomy/data/mapping/tangol.json`): cada categoría cuya
 * nota lleva la marca «PENDIENTE PO» (REQ-3502, PR #459), con los tours que toca según la tabla real de tipos
 * (`tests/fixtures/tangol-tipos-2026-11-12.json`, corrida de solo lectura REQ-3487) y el gate A/B que la resuelve.
 * Puro: sin red, base, reloj ni `process.env`. No cambia ninguna clasificación: la firma del PO (gate REQ-10689) decide.
 */
import type { Mapping } from "../schemas/dictionary";
import { CODIGOS_TANGOL } from "@/tangol/lib/taxonomia";

/** Marca que REQ-3502 dejó en la nota de cada categoría con una decisión pendiente del PO. */
export const MARCA_PENDIENTE = "PENDIENTE PO";

/** Una fila de la tabla real de tipos de Tangol (fixture de REQ-3503). */
export interface TipoTangol { typeCode: string; subTypeCode: string; tourType?: number; tours: number; ejemplos?: string[] }

export interface DudaMapeo {
  id: string;
  nombre: string;
  formato: string;
  temas: string[];
  atributos: string[];
  /** Texto de la nota a partir de la marca, sin la marca. */
  pendiente: string;
  /** Tours del par `TypeCode|SubTypeCode` de la categoría en la tabla real; 0 si la tabla no la trae (red de seguridad). */
  tours: number;
  /** Pares de Tangol que caen en la categoría. */
  pares: string[];
}

export interface GateDuda {
  gate: string;
  pregunta: string;
  /** Ids de categoría del mapeo que resuelve. */
  categorias: string[];
  a: string;
  b: string;
  recomendada: "A" | "B";
  porQue: string;
}

/** Pares `TYPE|SUB` → id de categoría, invertido: id → pares. */
export function paresPorCategoria(codigos: Readonly<Record<string, number>> = CODIGOS_TANGOL): Record<string, string[]> {
  const r: Record<string, string[]> = {};
  for (const [par, id] of Object.entries(codigos)) (r[String(id)] ??= []).push(par);
  return r;
}

/** Tours por categoría del mapeo según la tabla real de tipos. */
export function toursPorCategoria(tipos: readonly TipoTangol[], codigos: Readonly<Record<string, number>> = CODIGOS_TANGOL): Record<string, number> {
  const r: Record<string, number> = {};
  for (const t of tipos) {
    const par = `${t.typeCode.trim().toUpperCase()}|${t.subTypeCode.trim().toUpperCase()}`;
    const id = codigos[par];
    if (id === undefined) continue;
    r[String(id)] = (r[String(id)] ?? 0) + t.tours;
  }
  return r;
}

// REQ-10688
export function dudasDelMapeo(mapping: Mapping, tipos: readonly TipoTangol[], codigos: Readonly<Record<string, number>> = CODIGOS_TANGOL): DudaMapeo[] {
  const tours = toursPorCategoria(tipos, codigos);
  const pares = paresPorCategoria(codigos);
  const out: DudaMapeo[] = [];
  for (const c of mapping.categorias) {
    const nota = c.nota ?? "";
    const i = nota.indexOf(MARCA_PENDIENTE);
    if (i < 0) continue;
    const pendiente = nota.slice(i + MARCA_PENDIENTE.length).replace(/^\s*:\s*/, "").trim();
    out.push({
      id: String(c.id),
      nombre: c.nombre_es,
      formato: c.formato,
      temas: [...(c.temas ?? [])],
      atributos: [...(c.atributos ?? [])],
      pendiente,
      tours: tours[String(c.id)] ?? 0,
      pares: pares[String(c.id)] ?? [],
    });
  }
  return out;
}

/**
 * Gates para el PO (REQ-10689), uno por tipo de duda. «A» es siempre lo que hay hoy en producción o el cambio más chico;
 * cada «B» dice qué pieza tocaría. Las recomendaciones no aplican nada: solo la firma del PO.
 */
export const GATES_DUDAS_TANGOL: readonly GateDuda[] = [
  {
    gate: "G-R1",
    pregunta: "Red de seguridad 9000001 (un par TypeCode|SubTypeCode nuevo que Tangol empiece a mandar)",
    categorias: ["9000001"],
    a: "Falla abierta, como hoy: el tour se publica como Tour (visita guiada por omisión) y la prueba de cobertura avisa del par nuevo",
    b: "Falla cerrada, como el otro proveedor de tours con una categoría desconocida: el tour queda «por-revisar» (oculto) hasta mapear el par",
    recomendada: "A",
    porQue: "Los 38 pares reales ya tienen categoría propia; un par nuevo sería raro y la prueba de cobertura (REQ-3467) lo detecta. Ocultar vende menos sin ganar exactitud.",
  },
  {
    gate: "G-R2",
    pregunta: "Alquiler de equipo de ski y snowboard dentro de «Excursiones de aventura» (9000003)",
    categorias: ["9000003"],
    a: "Se quedan como Momentos de autor · Aventura hasta que el formato «alquiler» salga de `tras_bandera` en el diccionario",
    b: "Pasan ya al formato «alquiler»: como está `tras_bandera`, quedarían ocultos del sitio",
    recomendada: "A",
    porQue: "Son pocos (los dos títulos de ejemplo de la corrida) y B los esconde. Cuando el diccionario encienda «alquiler», se mueven con regla por palabra («alquiler», «rental») en su propio PR.",
  },
  {
    gate: "G-R3",
    pregunta: "«Día de estancia» (9000007): el diccionario no tiene tema «rural / campo / estancia»",
    categorias: ["9000007"],
    a: "Se queda con tema Naturaleza (el más cercano), como hoy",
    b: "Se agrega al diccionario el tema «Campo y vida rural» (es/en) y se usa aquí; cambia el contrato del diccionario y los filtros",
    recomendada: "A",
    porQue: "13 tours no justifican un tema nuevo en el filtro; el diccionario se amplía cuando haya volumen de varios proveedores.",
  },
  {
    gate: "G-R4",
    pregunta: "«Excursiones en barco y costa» (9000008): «shore excursion» (para pasajeros de crucero) no tiene término",
    categorias: ["9000008"],
    a: "Se queda como Tour · Playa y mar · medio barco, como hoy",
    b: "Se agrega el atributo «Para pasajeros de crucero» al diccionario y se pone aquí",
    recomendada: "A",
    porQue: "Son 7 tours y el dato «pasajero de crucero» no lo confirma la API; el atributo saldría sin respaldo.",
  },
  {
    gate: "G-R5",
    pregunta: "«Excursiones en tren» (9000009): el atributo «medio» no tiene «tren»",
    categorias: ["9000009"],
    a: "Se queda con medio «vehículo», el más cercano, como hoy",
    b: "Se agrega el medio «tren» al diccionario (es/en), al filtro y a las tarjetas",
    recomendada: "A",
    porQue: "6 tours; el medio «tren» es un cambio del diccionario que conviene hacer junto con los tours en tren del otro proveedor (Tren a las Nubes también está ahí) en su propio PR.",
  },
  {
    gate: "G-R6",
    pregunta: "Trayectos largos en bus entre ciudades: «Traslados varios» (9000014) y «Traslado en bus entre ciudades» (9000015)",
    categorias: ["9000014", "9000015"],
    a: "9000015 (TRF IN: Ruta 40 en bus, Potosí–Uyuni) pasa a Transporte (carrito `transport`, como los boletos de bus 9000027); 9000014 (TRF, mezcla aeropuerto–hotel y rutas largas) se queda como Traslado",
    b: "Las dos se quedan como Traslado (carrito `transfer`), como hoy",
    recomendada: "A",
    porQue: "Los 20 de TRF IN son trayectos entre ciudades, no un traslado aeropuerto–hotel; igualarlos a los boletos de bus deja el carrito y la sección coherentes. Ambas siguen en la sección Traslados.",
  },
  {
    gate: "G-R7",
    pregunta: "Paquetes de varios días de Tangol (9000018 a 9000025): ¿siguen como `Tour` con formato Circuito o se mueven a la tabla `Trip` (viajes de agencia)?",
    categorias: ["9000018", "9000019", "9000020", "9000021", "9000022", "9000023", "9000024", "9000025"],
    a: "Siguen como `Tour` con formato Circuito, como hoy; la ficha única (ola 6, adaptador de Tangol) los presenta igual que un viaje de agencia sin mover filas",
    b: "Se migran a `Trip` (migración de D1 + cambio del sync + nueva vuelta de Tangol); mientras, quedan como hoy",
    recomendada: "A",
    porQue: "La decisión 1 de la ficha única ya dice que la sección la decide el tipo de producto, no la tabla; mover 262 filas cuesta una migración y una vuelta del sync y no cambia lo que ve el cliente.",
  },
  {
    gate: "G-R8",
    pregunta: "«Escapadas» (9000020) y «Viajes en auto / self-drive» (9000022): el diccionario no tiene esos términos",
    categorias: ["9000020", "9000022"],
    a: "Se quedan como Circuito, el más cercano, como hoy",
    b: "Se agregan al diccionario los formatos «Escapada» y «Viaje en auto por tu cuenta» y se usan aquí",
    recomendada: "A",
    porQue: "46 y 6 tours; un formato nuevo entra al filtro y al carrito y conviene decidirlo con los adicionales de la ola 12, no aquí.",
  },
  {
    gate: "G-R9",
    pregunta: "«Viajes fly & drive» (9000024): el atributo «vuelo incluido» no se puede poner desde el mapeo (el esquema solo deja nocturno y medio)",
    categorias: ["9000024"],
    a: "Se queda sin el atributo; el vuelo se describe en la ficha con el texto del proveedor",
    b: "Se amplía el esquema del mapeo para aceptar «vuelo-incluido» y se marca aquí",
    recomendada: "A",
    porQue: "Es 1 tour; ampliar el esquema por un caso no se justifica. Si llegan más, entra como dato real del producto (decisión 11: por dato, no por mapeo).",
  },
];

/** Qué dudas cubre cada gate y cuáles quedan sin gate (deben ser cero). */
export function cruceDudasGates(dudas: readonly DudaMapeo[], gates: readonly GateDuda[] = GATES_DUDAS_TANGOL): { sinGate: string[]; sinDuda: string[] } {
  const ids = new Set(dudas.map((d) => d.id));
  const cubiertas = new Set(gates.flatMap((g) => g.categorias));
  return {
    sinGate: [...ids].filter((id) => !cubiertas.has(id)),
    sinDuda: [...cubiertas].filter((id) => !ids.has(id)),
  };
}

export interface ResumenDudas {
  categorias: number;
  dudas: number;
  gates: number;
  toursTocados: number;
  toursTotal: number;
}

export function resumenDudas(mapping: Mapping, tipos: readonly TipoTangol[], gates: readonly GateDuda[] = GATES_DUDAS_TANGOL): ResumenDudas {
  const dudas = dudasDelMapeo(mapping, tipos);
  return {
    categorias: mapping.categorias.length,
    dudas: dudas.length,
    gates: gates.length,
    toursTocados: dudas.reduce((a, d) => a + d.tours, 0),
    toursTotal: tipos.reduce((a, t) => a + t.tours, 0),
  };
}
