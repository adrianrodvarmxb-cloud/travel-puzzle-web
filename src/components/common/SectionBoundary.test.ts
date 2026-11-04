// REQ-002 — si una sección falla, el resto de la página sigue funcionando.
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { SectionBoundary } from "./SectionBoundary";

describe("SectionBoundary", () => {
  it("REQ-002: un error marca la sección como fallida", () => {
    expect(SectionBoundary.getDerivedStateFromError()).toEqual({ failed: true });
  });

  it("REQ-002: fallida no pinta nada; sana pinta a sus hijos", () => {
    const child = createElement("p", null, "hola");
    const b = new SectionBoundary({ name: "x", children: child });
    expect(b.render()).toBe(child);
    b.state = { failed: true };
    expect(b.render()).toBeNull();
  });

  it("REQ-002: registra en consola qué sección se ocultó", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    new SectionBoundary({ name: "viajes-en-tours", children: null }).componentDidCatch(new Error("boom"));
    expect(spy.mock.calls[0][0]).toContain("viajes-en-tours");
    spy.mockRestore();
  });
});
