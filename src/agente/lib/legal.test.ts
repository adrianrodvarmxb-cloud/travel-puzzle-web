// REQ-3348: términos, aviso de privacidad y datos de la empresa para el agente.
import { describe, it, expect } from "vitest";
import { consultaLegal, datosEmpresa } from "./legal";

const TERMINOS = "CLAUDIA LETICIA RODRÍGUEZ LAVEAGA, con nombre comercial TRAVEL PUZZLE. Domicilio: Av. Lázaro Cárdenas Norte 300, Durango. Registro Nacional de Turismo No. 04100050179.\nIntro.\n## Política de pago\nSe paga con tarjeta.\n## Política de cancelación\nSegún el proveedor.\n## Vuelos incluidos en un servicio\nLa aerolínea emite el boleto.";
const PRIV = "TRAVEL PUZZLE es responsable de sus datos.\n## Finalidades\nAtender su reserva.\n## Transferencias\nA proveedores del viaje.";

describe("REQ-3348: legal para Mila", () => {
  it("REQ-3348: datos de la empresa salen del primer párrafo vigente de los términos", () => {
    expect(datosEmpresa(TERMINOS)).toContain("Registro Nacional de Turismo No. 04100050179");
  });
  it("REQ-3348: regresa solo las secciones que responden la pregunta, con la liga al documento", () => {
    const r = consultaLegal("¿puedo cancelar?", { terminos: TERMINOS, privacidad: PRIV }, "https://x");
    expect(r.secciones).toEqual([{ documento: "terminos", titulo: "Política de cancelación", texto: "Según el proveedor.", enlace: "https://x/terminos#politica-de-cancelacion" }]);
    expect(r.empresa).toContain("04100050179");
    expect(consultaLegal("qué hacen con mis datos, transferencias", { terminos: TERMINOS, privacidad: PRIV }, "https://x").secciones[0]).toMatchObject({ documento: "privacidad", titulo: "Transferencias" });
  });
});
