import { describe, expect, it } from "vitest";
import { AGENCY_MAPPINGS, DEFAULT_MAPPINGS } from "../data";
import { AGENCY_PROVIDER } from "@/ingest/lib/import-archive";
import { hiddenProviders } from "@/catalog/lib/provider-visibility";
import { DEFAULT_PROVIDER } from "@/destinations/lib/ids";
import { caeEnPorRevisar, proveedoresSinMapeo, reporteCobertura, textoCobertura } from "./cobertura";

const MAPEOS = { ...DEFAULT_MAPPINGS, ...AGENCY_MAPPINGS };

/**
 * REQ-3467: red de seguridad. Los proveedores no se escriben a mano aquí: salen de los registros que ya existen en el
 * código (el sync de FREETOUR, las agencias de importación y los proveedores tras bandera). Así, cuando alguien
 * agregue un proveedor nuevo y se olvide del mapeo, esta prueba falla en vez de dejar sus tours en «por-revisar».
 */
const PROVEEDORES_DEL_CATALOGO = [DEFAULT_PROVIDER, ...Object.values(AGENCY_PROVIDER), ...hiddenProviders({})];

describe("REQ-3467 ningún proveedor con tours en el catálogo se queda sin mapeo", () => {
  it("REQ-3467: cada proveedor que el código declara tiene mapeo de taxonomía", () => {
    expect(PROVEEDORES_DEL_CATALOGO).toContain("tangol");
    expect(proveedoresSinMapeo(PROVEEDORES_DEL_CATALOGO, MAPEOS)).toEqual([]);
  });

  it("REQ-3467: la red caza al proveedor nuevo sin mapeo (y a Tangol si se quitara el suyo)", () => {
    const { tangol: _fuera, ...sinTangol } = MAPEOS;
    expect(proveedoresSinMapeo(PROVEEDORES_DEL_CATALOGO, sinTangol)).toEqual(["tangol"]);
    expect(proveedoresSinMapeo([...PROVEEDORES_DEL_CATALOGO, "proveedor-nuevo"], MAPEOS)).toEqual(["proveedor-nuevo"]);
  });

  it("REQ-3467: sin repetir proveedores y sin importar el orden", () => {
    expect(proveedoresSinMapeo(["nuevo", "nuevo", "freetour"], MAPEOS)).toEqual(["nuevo"]);
  });
});

describe("REQ-3467 reporte de cuántos tours quedarían en «por-revisar»", () => {
  const filas = [
    { proveedor: "tangol", categoriaId: 9_000_001 },
    { proveedor: "tangol", categoriaId: 9_000_001 },
    { proveedor: "tangol", categoriaId: null },
    { proveedor: "tangol", categoriaId: 777 },
    { proveedor: "freetour", categoriaId: 12 },
    { proveedor: "freetour", categoriaId: 1 }, // histórica: formato por-revisar
    { proveedor: "nuevo", categoriaId: 5 },
  ];

  it("REQ-3467: una fila cae en «por-revisar» sin mapeo, sin categoría o con categoría histórica", () => {
    expect(caeEnPorRevisar({ proveedor: "tangol", categoriaId: 9_000_001 }, MAPEOS)).toBe(false);
    expect(caeEnPorRevisar({ proveedor: "tangol", categoriaId: null }, MAPEOS)).toBe(true);
    expect(caeEnPorRevisar({ proveedor: "tangol", categoriaId: 777 }, MAPEOS)).toBe(true);
    expect(caeEnPorRevisar({ proveedor: "freetour", categoriaId: 1 }, MAPEOS)).toBe(true);
    expect(caeEnPorRevisar({ proveedor: "nuevo", categoriaId: 5 }, MAPEOS)).toBe(true);
  });

  it("REQ-3467: el reporte cuenta el total, los «por-revisar» y el detalle por proveedor y categoría", () => {
    const r = reporteCobertura(filas, MAPEOS);
    expect(r.total).toBe(7);
    expect(r.porRevisar).toBe(4);
    expect(r.sinMapeo).toEqual(["nuevo"]);
    expect(r.detalle).toEqual([
      { clave: "freetour:1", tours: 1 },
      { clave: "nuevo:5", tours: 1 },
      { clave: "tangol:777", tours: 1 },
      { clave: "tangol:sin categoría", tours: 1 },
    ]);
  });

  it("REQ-3467: el texto del reporte dice qué falta y nombra al proveedor sin mapeo", () => {
    const txt = textoCobertura(reporteCobertura(filas, MAPEOS));
    expect(txt).toContain("4 de 7 tours quedarían en «por-revisar»");
    expect(txt).toContain("sin mapeo: nuevo");
    expect(txt).toContain("tangol:777");
  });

  it("REQ-3467: con todo mapeado el reporte queda en cero", () => {
    const r = reporteCobertura([{ proveedor: "tangol", categoriaId: 9_000_001 }, { proveedor: "freetour", categoriaId: 12 }], MAPEOS);
    expect(r).toMatchObject({ total: 2, porRevisar: 0, sinMapeo: [], detalle: [] });
    expect(textoCobertura(r)).toContain("0 de 2");
  });
});
