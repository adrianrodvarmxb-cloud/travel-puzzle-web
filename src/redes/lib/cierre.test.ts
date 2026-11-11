import { describe, expect, it } from "vitest";
import { decidirIssue } from "./cierre";

const r = (red: string, estado: string, detalle = "") => ({ red: red as "facebook", estado: estado as "publicado", detalle });

describe("REQ-1514: el issue «Redes del día» se cierra solo cuando FB e IG ya salieron", () => {
  it("REQ-1514: cierra si Facebook e Instagram están publicados (LinkedIn manual no lo impide)", () => {
    expect(decidirIssue([r("linkedin", "manual", "apagada"), r("facebook", "publicado"), r("instagram", "publicado")])).toBe("cerrar");
  });
  it("REQ-1514: cierra si Instagram ya estaba registrado y Facebook se publicó", () => {
    expect(decidirIssue([r("linkedin", "manual"), r("facebook", "publicado"), r("instagram", "manual", "este artículo ya se publicó en esta red")])).toBe("cerrar");
  });
  it("REQ-1514: no cierra si Facebook falló o quedó pendiente", () => {
    expect(decidirIssue([r("facebook", "fallo", "token"), r("instagram", "publicado")])).toBe("actualizar");
    expect(decidirIssue([r("facebook", "manual", "sin token"), r("instagram", "publicado")])).toBe("actualizar");
  });
});
