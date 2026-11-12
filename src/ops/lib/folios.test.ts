// REQ-1587: folios REQ sin choques entre sesiones (reserva atómica) y frentes en curso sin duplicar.
// npx vitest run src/ops/lib/folios.test.ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  CORTE_RESERVA,
  apartarExacto,
  apartarFolios,
  choques,
  leerReservas,
  leerFolios,
  maxFolio,
  sinReserva,
  type Registro,
} from "./folios";
import { coincideFrente, normalizarTema } from "./frentes";

const MAIN = [
  "| ID | Tipo | Pendiente | Responsable | Bloqueado por | Estado |",
  "|---|---|---|---|---|---|",
  "| REQ-1535 | CÓDIGO | Dado un artículo del blog y sus láminas de Instagram, cuando corren las redes | agente | — | EN CURSO |",
  "| REQ-1536 | TAREA-PO | Firma de correo: los mensajes que salen de Travel Puzzle | PO | — | PENDIENTE |",
  "| REQ-1540 | CÓDIGO | ~~Dado TANGOL_EMAIL y TANGOL_CLAVE~~, cuando el cliente pide datos \\| entonces | agente | — | CUMPLIDO |",
].join("\n");

const RAMA = [
  "| REQ-1535 | VALIDACIÓN | Acuerdos de intermediación con 5 proveedores: vigencia indefinida | agente | — | EN CURSO |",
  "| REQ-1536 | TAREA-PO | Firma de correo: los mensajes que salen de Travel Puzzle llevan logo | PO | — | CUMPLIDO |",
  "| REQ-1540 | CÓDIGO | Dado TANGOL_EMAIL y TANGOL_CLAVE, cuando el cliente pide datos | agente | — | CUMPLIDO |",
  "| REQ-1590 | DEFINICIÓN | Nuevo pendiente sin reservar | PO | — | PENDIENTE |",
  "| REQ-1591 | DEFINICIÓN | Nuevo pendiente reservado | PO | — | PENDIENTE |",
].join("\n");

describe("REQ-1587: folios", () => {
  it("REQ-1587: lee los folios de cualquier tabla, con celdas que traen | escapado", () => {
    const m = leerFolios(MAIN);
    expect([...m.keys()]).toEqual(["REQ-1535", "REQ-1536", "REQ-1540"]);
    expect(m.get("REQ-1540")).toMatch(/TANGOL_EMAIL/);
  });

  it("REQ-1587: el siguiente libre es el mayor entre main, ramas y reservados, más 1", () => {
    expect(maxFolio(["REQ-1535", "REQ-1579", "REQ-12"])).toBe(1579);
    expect(maxFolio([])).toBe(0);
  });

  it("REQ-1587: mismo folio con otro tema en main es choque; el mismo tema con estado o texto editado no lo es", () => {
    const c = choques(leerFolios(RAMA), leerFolios(MAIN));
    expect(c.map((x) => x.id)).toEqual(["REQ-1535"]);
  });

  it("REQ-1587 (rojo antes del arreglo): REQ-1535 de los acuerdos chocaba con REQ-1535 del blog en main", () => {
    const acuerdos = "| REQ-1535 | VALIDACIÓN | Dado cada uno de los 5 proveedores, cuando se redacta su acuerdo | agente | — | EN CURSO |";
    expect(choques(leerFolios(acuerdos), leerFolios(MAIN))).toHaveLength(1);
  });

  it("REQ-1587: un folio nuevo desde el corte debe estar apartado en GitHub; los anteriores al corte no se exigen", () => {
    const nuevos = ["REQ-1540", "REQ-1590", "REQ-1591", "REQ-1500"];
    expect(sinReserva(nuevos, new Set(["REQ-1591"]), 1588)).toEqual(["REQ-1590"]);
    expect(CORTE_RESERVA).toBeGreaterThanOrEqual(1588);
  });

  // Doble del registro de GitHub: escribir solo gana si nadie escribió desde la lectura (como un push sin force).
  function registroFalso(inicial: string, antesDeEscribir?: (r: { texto: string; version: number }) => void) {
    const estado = { texto: inicial, version: 0 };
    const r: Registro = {
      leer: () => ({ texto: estado.texto, base: String(estado.version) }),
      escribir: (texto, base) => {
        antesDeEscribir?.(estado);
        if (base !== String(estado.version)) return false;
        estado.texto = texto;
        estado.version++;
        return true;
      },
    };
    return { r, estado };
  }
  const datos = { rama: "fix/x", fecha: "2026-11-11", motivo: "prueba" };

  it("REQ-1587: aparta N folios seguidos después del mayor apartado y los deja en el registro", () => {
    const { r, estado } = registroFalso("REQ-1600\totra\t2026-11-11\tx\n");
    expect(apartarFolios(3, 1588, r, datos)).toEqual(["REQ-1601", "REQ-1602", "REQ-1603"]);
    expect([...leerReservas(estado.texto)]).toEqual(["REQ-1600", "REQ-1601", "REQ-1602", "REQ-1603"]);
  });

  it("REQ-1587: si otra sesión aparta al mismo tiempo, se relee y nunca se entrega un folio repetido", () => {
    let unaVez = true;
    const { r, estado } = registroFalso("", (e) => {
      if (unaVez) {
        unaVez = false;
        e.texto += "REQ-1588\totra-sesion\t2026-11-11\tcarrera\n";
        e.version++;
      }
    });
    expect(apartarFolios(2, 1588, r, datos)).toEqual(["REQ-1589", "REQ-1590"]);
    expect([...leerReservas(estado.texto)]).toEqual(["REQ-1588", "REQ-1589", "REQ-1590"]);
  });

  it("REQ-1587: apartar un folio exacto falla si ya es de otra sesión", () => {
    const { r } = registroFalso("REQ-1587\totra\t2026-11-11\tx\n");
    expect(apartarExacto("REQ-1587", r, datos)).toBe(false);
    expect(apartarExacto("REQ-1599", r, datos)).toBe(true);
  });

  it("REQ-1587: si GitHub rechaza demasiadas veces seguidas, se detiene con error en lugar de seguir para siempre", () => {
    const r: Registro = { leer: () => ({ texto: "", base: null }), escribir: () => false };
    expect(() => apartarFolios(1, 1600, r, datos, 5)).toThrow(/no se pudo apartar/);
  });
});

describe("REQ-1587: frentes en curso", () => {
  it("REQ-1587: el tema se compara sin acentos, mayúsculas ni signos", () => {
    expect(normalizarTema("Acuerdo — Fantástica China!")).toBe("acuerdo fantastica china");
  });

  it("REQ-1587: encuentra el frente aunque el título diga más cosas, y no confunde temas distintos", () => {
    expect(coincideFrente("EN CURSO: acuerdo de intermediación con Tangol", "tangol")).toBe(true);
    expect(coincideFrente("Tangol ola 2: sync diario", "Acuerdo Tangol")).toBe(true);
    expect(coincideFrente("Acuerdo Big Bus", "Tangol")).toBe(false);
  });
});

describe("REQ-1587: la regla está en el PR y en el CLAUDE.md", () => {
  it("REQ-1587: el workflow del PR trae main y los folios apartados, y corre la revisión de folios", () => {
    const wf = readFileSync(".github/workflows/prueba-humo.yml", "utf8");
    expect(wf).toMatch(/folios\/registro/);
    expect(wf).toMatch(/src\/scripts\/folio\.ts revisar/);
  });

  it("REQ-1587: el CLAUDE.md pide el paso 0 (frente, folios y borradores) antes de empezar", () => {
    const md = readFileSync("CLAUDE.md", "utf8");
    expect(md).toMatch(/Sesiones en paralelo/);
    expect(md).toMatch(/folio\.ts apartar/);
    expect(md).toMatch(/frente\.ts buscar/);
    expect(md).toMatch(/borrador vigente/);
  });
});

describe("REQ-1608: si main ya trae un folio duplicado, el PR que lo corrige no choca", () => {
  it("REQ-1608 (rojo antes del arreglo): main con REQ-1535 dos veces; la rama deja solo el de redes", async () => {
    const { leerFoliosTodos, choques } = await import("./folios");
    const main = leerFoliosTodos([
      "| REQ-1535 | CÓDIGO | Big Bus: publicar solo los productos visibles | agente | — | CUMPLIDO |",
      "| REQ-1535 | CÓDIGO | Dado un artículo del blog y sus láminas de Instagram, cuando las redes del día van a publicar | agente | — | CUMPLIDO |",
    ].join("\n"));
    const rama = leerFolios("| REQ-1535 | CÓDIGO | Dado un artículo del blog y sus láminas de Instagram, cuando las redes del día van a publicar | agente | — | CUMPLIDO |");
    expect(choques(rama, main)).toEqual([]);
  });
  it("REQ-1608: un folio de la rama que no se parece a ninguna versión de main sí choca", async () => {
    const { leerFoliosTodos, choques } = await import("./folios");
    const main = leerFoliosTodos("| REQ-1535 | CÓDIGO | Big Bus: publicar solo los productos visibles | agente | — | x |\n| REQ-1535 | CÓDIGO | Dado un artículo del blog y sus láminas | agente | — | x |");
    const rama = leerFolios("| REQ-1535 | VALIDACIÓN | Acuerdos de intermediación con 5 proveedores: vigencia indefinida | agente | — | x |");
    expect(choques(rama, main).map((c) => c.id)).toEqual(["REQ-1535"]);
  });
});

// REQ-3492 / REQ-3493: guardas contra los choques que hoy solo se ven después de fusionar (INC-014).
import { migracionesEnChoque, siguienteMigracion, filasPerdidas } from "./folios";

describe("REQ-3492: números de migración únicos entre sesiones", () => {
  const main = ["0025_tour_search_stem.sql", "0026_tour_externalid_por_proveedor.sql", "0027_proveedores_mila.sql"];

  it("REQ-3492: una migración nueva con un número que main ya ocupa es choque (el caso real: 0027_provider_city vs 0027_proveedores_mila)", () => {
    const c = migracionesEnChoque([...main, "0027_provider_city.sql"], main);
    expect(c).toEqual([{ numero: "0027", rama: "0027_provider_city.sql", main: "0027_proveedores_mila.sql" }]);
  });

  it("REQ-3492: dos migraciones nuevas con el mismo número en la misma rama también chocan", () => {
    const c = migracionesEnChoque([...main, "0028_a.sql", "0028_b.sql"], main);
    expect(c.map((x) => x.numero)).toEqual(["0028"]);
  });

  it("REQ-3492: una migración nueva con número libre no choca, y la misma que ya está en main tampoco", () => {
    expect(migracionesEnChoque([...main, "0028_provider_city.sql"], main)).toEqual([]);
    expect(migracionesEnChoque(main, main)).toEqual([]);
  });

  it("REQ-3492: el siguiente número libre cuenta main Y las demás ramas, para no tomar «el último + 1» de la copia local", () => {
    expect(siguienteMigracion([main, [...main, "0028_provider_city.sql"], ["0001_init.sql"]])).toBe("0029");
    expect(siguienteMigracion([["0009_x.sql"]])).toBe("0010");
  });
});

describe("REQ-3493: un PR no puede borrar filas de requisitos que main ya tiene", () => {
  const fila = (id: string) => `| ${id} | CÓDIGO | algo | agente | — | PENDIENTE |`;
  const main = ["| ID |", fila("REQ-3370"), fila("REQ-3371"), fila("REQ-3372")].join("\n");

  it("REQ-3493: detecta las filas de main que faltan en la rama (el caso real: la rama del sync perdió REQ-3370..3372)", () => {
    const rama = ["| ID |", fila("REQ-3370"), fila("REQ-3461")].join("\n");
    expect(filasPerdidas(rama, main)).toEqual(["REQ-3371", "REQ-3372"]);
  });

  it("REQ-3493: cambiar el estado o el texto de una fila no es perderla; agregar filas tampoco", () => {
    const rama = main.replace("REQ-3372 | CÓDIGO | algo | agente | — | PENDIENTE", "REQ-3372 | CÓDIGO | otro texto | agente | — | CUMPLIDO") + "\n" + fila("REQ-3500");
    expect(filasPerdidas(rama, main)).toEqual([]);
  });
});
