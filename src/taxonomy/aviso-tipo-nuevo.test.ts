import { describe, expect, it, vi } from "vitest";
import { avisarTipoNuevo, avisoTipoNuevoDeps } from "./aviso-tipo-nuevo";
import type { TipoNuevo } from "./lib/tipo-nuevo";

const tipos: TipoNuevo[] = [{ proveedor: "tangol", clave: "WELLNESS|SPA", tours: 2, ejemplos: ["Spa"] }];

describe("REQ-10731 AVISO_TIPO_NUEVO_ENABLED", () => {
  it("REQ-10731: apagada no manda nada por ningún canal y lo deja en el log", async () => {
    const correo = vi.fn(async () => {});
    const whatsapp = vi.fn(async () => {});
    const log = vi.fn();
    const r = await avisarTipoNuevo(tipos, { encendido: false, hoy: "2026-11-16", correo, whatsapp, log });
    expect(correo).not.toHaveBeenCalled();
    expect(whatsapp).not.toHaveBeenCalled();
    expect(r).toEqual({ tipos: 1, canales: [], omitidos: ["bandera apagada"], errores: [] });
    expect(log.mock.calls[0][0]).toContain("apagada");
  });

  it("REQ-10731: sin tipos nuevos no hace nada, ni encendida", async () => {
    const correo = vi.fn(async () => {});
    const r = await avisarTipoNuevo([], { encendido: true, hoy: "2026-11-16", correo });
    expect(correo).not.toHaveBeenCalled();
    expect(r.tipos).toBe(0);
  });
});

describe("REQ-10730 aviso al PO por correo y WhatsApp", () => {
  it("REQ-10730: encendida manda por los dos canales con el mismo contenido", async () => {
    const correo = vi.fn<(c: { asunto: string; texto: string }) => Promise<void>>(async () => {});
    const whatsapp = vi.fn<(texto: string) => Promise<void>>(async () => {});
    const r = await avisarTipoNuevo(tipos, { encendido: true, hoy: "2026-11-16", correo, whatsapp });
    expect(r.canales).toEqual(["correo", "whatsapp"]);
    expect(correo.mock.calls[0]?.[0].asunto).toContain("1 tipo nuevo de Tangol");
    expect(whatsapp.mock.calls[0]?.[0]).toContain("WELLNESS|SPA");
  });

  it("REQ-10730: un canal que falla no tumba al otro; el fallo queda en el resultado", async () => {
    const correo = vi.fn(async () => { throw new Error("Resend 500"); });
    const whatsapp = vi.fn(async () => {});
    const r = await avisarTipoNuevo(tipos, { encendido: true, hoy: "2026-11-16", correo, whatsapp });
    expect(r.canales).toEqual(["whatsapp"]);
    expect(r.errores).toEqual(["correo: Resend 500"]);
  });

  it("REQ-10730: sin canal configurado se omite y se dice", async () => {
    const r = await avisarTipoNuevo(tipos, { encendido: true, hoy: "2026-11-16" });
    expect(r.omitidos).toEqual(["correo sin configurar", "whatsapp sin configurar"]);
  });

  it("REQ-10730: las dependencias reales salen del entorno; sin variables no hay canal y la bandera está apagada", async () => {
    const sendEmail = vi.fn(async () => "id-1");
    const fetchMock = vi.fn(async () => new Response("", { status: 200 }));
    const vacio = avisoTipoNuevoDeps({}, { fetch: fetchMock as unknown as typeof fetch, sendEmail });
    expect(vacio.encendido).toBe(false);
    expect(vacio.correo).toBeUndefined();
    expect(vacio.whatsapp).toBeUndefined();

    const lleno = avisoTipoNuevoDeps(
      { AVISO_TIPO_NUEVO_ENABLED: "true", RESEND_API_KEY: "k", AVISO_PO_EMAIL: "po@example.com", MILA_AVISOS_URL: "https://mila.example/avisos", MILA_AVISOS_SECRET: "s", RESUMEN_DESTINOS: "5215512345678" },
      { fetch: fetchMock as unknown as typeof fetch, sendEmail, hoy: "2026-11-16" },
    );
    const r = await avisarTipoNuevo(tipos, lleno);
    expect(r.canales).toEqual(["correo", "whatsapp"]);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toMatchObject({ negocio: "travel-puzzle", numero: "5215512345678" });
    expect(body.texto).toContain("WELLNESS|SPA");
  });
});
