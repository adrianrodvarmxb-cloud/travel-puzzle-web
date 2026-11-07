import { describe, expect, it } from "vitest";
import { evidenceSlug, firstDifference, normalizeForDiff, retryNote } from "./smoke-evidence";
import { smokeVerdict } from "./smoke";

const ok = { path: "/la-primera-pieza", viewport: 1366, status: 200, pageErrors: [], appError: false };
const e418 = "Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]=";

describe("REQ-500 (INC-007): evidencia de la prueba de humo cuando falla una página", () => {
  it("REQ-500: nombre de archivo seguro y único por página y ancho", () => {
    expect(evidenceSlug("/la-primera-pieza", 1366)).toBe("la-primera-pieza@1366");
    expect(evidenceSlug("/", 390)).toBe("inicio@390");
    expect(evidenceSlug("/destinos/mx/ciudad-de-mexico?x=1&y=2", 390)).toBe("destinos_mx_ciudad-de-mexico_x_1_y_2@390");
    expect(evidenceSlug("/robots.txt", 390)).toBe("robots.txt@390");
  });

  it("REQ-500: al comparar se ignoran scripts, comentarios de React, espacios y el formato de style", () => {
    const server = `<html><head><title>x</title></head><body class="a"><!--$--><div style="width:64px;height:64px">Hola  <b>mundo</b></div><!--/$--><script>self.__next_f.push([1,"x"])</script></body></html>`;
    const client = `<html><head></head><body class="a"><div style="width: 64px; height: 64px;">Hola <b>mundo</b></div><script src="/a.js"></script></body></html>`;
    expect(normalizeForDiff(server)).toBe(normalizeForDiff(client));
    expect(firstDifference(server, client)).toBeNull();
  });

  it("REQ-500: señala el primer punto donde el HTML del servidor y el DOM del cliente se separan", () => {
    const server = `<body><header>Menú</header><main><p>539 free tours</p></main></body>`;
    const client = `<body><header>Menú</header><main><p>540 free tours</p></main></body>`;
    const d = firstDifference(server, client, 20);
    expect(d).not.toBeNull();
    expect(d!.server).toContain("539");
    expect(d!.client).toContain("540");
    expect(d!.server).toContain("<main>"); // trae contexto antes del punto
    expect(d!.index).toBeGreaterThan(0);
  });

  it("REQ-500: si uno de los dos es más corto, también es una diferencia", () => {
    const d = firstDifference(`<body><p>a</p><footer>pie</footer></body>`, `<body><p>a</p></body>`, 10);
    expect(d!.server).toContain("footer");
  });

  it("REQ-500: la nota del reintento dice si la falla es intermitente o se repite", () => {
    expect(retryNote({ ...ok })).toBe("reintento: pasó (falla intermitente)");
    expect(retryNote({ ...ok, pageErrors: [e418] })).toBe("reintento: también falla");
    expect(retryNote({ ...ok, appError: true })).toBe("reintento: también falla");
    expect(retryNote({ ...ok, status: 500 })).toBe("reintento: también falla");
    expect(retryNote(undefined)).toBe("");
  });

  it("REQ-500: una falla que pasa al reintentar SIGUE bloqueando la publicación (no se esconde nada)", () => {
    const v = smokeVerdict([{ ...ok, pageErrors: [e418], retry: { ...ok } }]);
    expect(v.ok).toBe(false);
    expect(v.failures).toHaveLength(1);
    expect(v.failures[0]).toContain("/la-primera-pieza @1366: excepción en el navegador: Minified React error #418");
    expect(v.failures[0]).toContain("reintento: pasó (falla intermitente)");
  });

  it("REQ-500: una falla que se repite al reintentar lo dice", () => {
    const v = smokeVerdict([{ ...ok, status: 500, retry: { ...ok, status: 500 } }]);
    expect(v.ok).toBe(false);
    expect(v.failures[0]).toBe("/la-primera-pieza @1366: respuesta 500 — reintento: también falla");
  });

  it("REQ-500: sin falla no hay reintento ni nota", () => {
    expect(smokeVerdict([{ ...ok }])).toEqual({ ok: true, failures: [] });
  });
});
