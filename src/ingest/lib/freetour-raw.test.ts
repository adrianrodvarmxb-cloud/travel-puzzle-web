import { describe, expect, it } from "vitest";
import { feedTour } from "@/catalog/fixtures/freetour-feeds";
import { freetourRawItems } from "./freetour-raw";

describe("REQ-564 el crudo de FREETOUR se valida contra el contrato y se guarda aunque no pase", () => {
  it("REQ-564 un item válido queda schemaOk; uno sin categoryId se guarda igual con schemaOk=false", () => {
    const bad = { ...feedTour(2) } as Record<string, unknown>;
    delete bad.categoryId;
    const items = freetourRawItems({ data: { tours: [feedTour(1), bad], totalPages: 1 } }, 3);
    expect(items.map((i) => [i.externalId, i.schemaOk])).toEqual([["1", true], ["2", false]]);
    expect(items[1].body).toBe(bad);
    expect(items[0].sourceRef).toBe("/tours?page=3");
  });
  it("REQ-543 una respuesta sin data.tours no produce items", () => {
    expect(freetourRawItems({}, 1)).toEqual([]);
  });
});
