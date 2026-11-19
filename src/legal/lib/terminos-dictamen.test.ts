import { describe, it, expect } from "vitest";
import { TERMINOS } from "./terminos";

// Textos del dictamen del abogado (19-11-2026), copiados tal cual (§F y §G).
const F = "Ninguna disposición de estos Términos y Condiciones limita, restringe o renuncia los derechos irrenunciables reconocidos a favor de los consumidores por la Ley Federal de Protección al Consumidor.";
const G = "El usuario deberá presentarse en el punto de encuentro y con la anticipación exacta indicada en su confirmación de reserva, portando identificación oficial vigente y su comprobante. En caso de inasistencia, retraso superior a la tolerancia expresamente señalada en la ficha del servicio, falta de documentación migratoria o sanitaria requerida, o abandono voluntario de la actividad una vez iniciada, se considerará como no-show (no presentación) y aplicará el cargo por cancelación del 100 % del importe pagado, sin derecho a reembolso ni reprogramación, siempre que dicha penalidad haya sido informada en la ficha del servicio previo a la compra.";

describe("/terminos · dictamen del abogado", () => {
  it("REQ-10795: la terminación solo procede por incumplimiento, fraude, uso ilícito o falta de pago", () => {
    expect(TERMINOS).toContain("únicamente por incumplimiento de estos Términos y Condiciones, fraude, uso ilícito del sitio o falta de pago");
    expect(TERMINOS).not.toContain("por cualquier causa o motivo");
  });

  it("REQ-10795: el plazo de un año va sin perjuicio de las acciones irrenunciables de la LFPC", () => {
    expect(TERMINOS).toMatch(/sin perjuicio de las acciones irrenunciables de la Ley Federal de Protección al Consumidor, ninguna queja[^\n]*un \(1\) año/);
  });

  it("REQ-10795: la cláusula de salvaguarda §F es la última sección, literal", () => {
    const fin = TERMINOS.slice(TERMINOS.lastIndexOf("## "));
    expect(fin.startsWith("## Salvaguarda de los derechos del consumidor")).toBe(true);
    expect(fin).toContain(F);
  });

  it("REQ-10796: la cláusula de no-show §G está literal en su propia sección", () => {
    expect(TERMINOS).toContain(`## Inasistencia (no-show) y puntualidad\n${G}`);
  });
});
