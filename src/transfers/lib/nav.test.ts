import { describe, it, expect } from "vitest";
import { withTransfersLink } from "./nav";

describe("REQ-037: enlace a Traslados en el menú", () => {
  const links = [{ href: "/", label: "Inicio" }, { href: "/tours", label: "Tours" }, { href: "/#como-funciona", label: "Cómo" }];
  it("REQ-037: apagado, el menú no cambia", () => {
    expect(withTransfersLink(links, false, "Traslados")).toEqual(links);
  });
  it("REQ-037: encendido, aparece justo después de Tours", () => {
    expect(withTransfersLink(links, true, "Traslados").map((l) => l.href)).toEqual(["/", "/tours", "/traslados", "/#como-funciona"]);
  });
});
