import { describe, expect, it } from "vitest";
import { isDestinationTree } from "./tree-shape";
import { destinationTree } from "./catalog";
import { fx, tour } from "../fixtures/destinos";

describe("REQ-1359: forma del árbol para servir la copia anterior", () => {
  it("REQ-1359: el árbol de hoy pasa; un árbol vacío, otra cosa o una ciudad sin una sección no pasan", () => {
    const tree = destinationTree({ ...fx, tours: [tour(10, 1), tour(20, 2)], trips: [], now: new Date("2026-11-07T00:00:00Z") });
    expect(isDestinationTree(JSON.parse(JSON.stringify(tree)))).toBe(true);
    expect(isDestinationTree([])).toBe(false);
    expect(isDestinationTree({ a: 1 })).toBe(false);
    const sinSeccion = JSON.parse(JSON.stringify(tree));
    delete sinSeccion[0].cities[0].onlineTours;
    expect(isDestinationTree(sinSeccion)).toBe(false);
  });
});
