// REQ-10876: el aviso del tope diario llega al PO por correo y WhatsApp. npx vitest run src/notifications/aviso-po.test.ts
import { describe, expect, it, vi } from "vitest";
import { avisarPO, canalesAvisoPODesdeEntorno } from "./aviso-po";

const aviso = { asunto: "Tangol: corrida bajo el tope (2 de 10 tours, 2026-11-26)", texto: "Texto largo del correo.", whatsapp: "Texto corto." };

describe("REQ-10876: aviso al PO por los canales del aviso de tipo nuevo", () => {
  it("REQ-10876: manda por los dos canales con sus textos; un canal que falla no detiene al otro", async () => {
    const correo = vi.fn(async () => {});
    const whatsapp = vi.fn(async () => { throw new Error("avisos 503"); });
    const r = await avisarPO(aviso, { correo, whatsapp });
    expect(correo).toHaveBeenCalledWith({ asunto: aviso.asunto, texto: aviso.texto });
    expect(whatsapp).toHaveBeenCalledWith("Texto corto.");
    expect(r.canales).toEqual(["correo"]);
    expect(r.errores).toEqual(["whatsapp: avisos 503"]);
  });

  it("REQ-10876: sin canales configurados no manda nada y lo deja en el log", async () => {
    const log = vi.fn();
    const r = await avisarPO(aviso, { log });
    expect(r).toEqual({ canales: [], omitidos: ["correo sin configurar", "whatsapp sin configurar"], errores: [] });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("canales: ninguno"));
  });

  it("REQ-10876: los canales salen del entorno de Actions (Resend + puente de Mila) sin depender de AVISO_TIPO_NUEVO_ENABLED", async () => {
    const llamadas: string[] = [];
    const io = {
      fetch: (async (url: string | URL | Request) => { llamadas.push(`fetch ${String(url)}`); return new Response("{}", { status: 200 }); }) as typeof fetch,
      sendEmail: async (_o: unknown, e: { to: string }) => { llamadas.push(`email ${e.to}`); return "id"; },
    };
    const canales = canalesAvisoPODesdeEntorno({
      RESEND_API_KEY: "re_x", AVISO_PO_EMAIL: "a@x.mx, b@x.mx", MILA_AVISOS_URL: "https://mila.example/api/avisos", MILA_AVISOS_SECRET: "s", RESUMEN_DESTINOS: "5215500000000",
    }, io);
    const r = await avisarPO(aviso, canales);
    expect(r.canales).toEqual(["correo", "whatsapp"]);
    expect(llamadas).toEqual(["email a@x.mx", "email b@x.mx", "fetch https://mila.example/api/avisos"]);
    expect(canalesAvisoPODesdeEntorno({}, io)).toMatchObject({ correo: undefined, whatsapp: undefined });
  });
});
