import { describe, it, expect, vi } from "vitest";
import { sendEmail } from "./resend";

describe("sendEmail (Resend)", () => {
  it("manda POST a la API de Resend con la llave y devuelve el id", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ id: "em_1" }), { status: 200 }));
    const id = await sendEmail({ apiKey: "re_x", fetch }, { from: "TP <r@tp.mx>", to: "a@b.co", subject: "S", html: "<p>h</p>", text: "h", replyTo: "info@tp.mx" });
    expect(id).toBe("em_1");
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_x");
    expect(JSON.parse(init.body as string)).toEqual({ from: "TP <r@tp.mx>", to: ["a@b.co"], subject: "S", html: "<p>h</p>", text: "h", reply_to: "info@tp.mx" });
  });

  it("si Resend rechaza, lanza con su mensaje", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ message: "domain not verified" }), { status: 403 }));
    await expect(sendEmail({ apiKey: "re_x", fetch }, { from: "a", to: "b", subject: "s", html: "h", text: "t" })).rejects.toThrow(/domain not verified/);
  });
});

describe("adjuntos", () => {
  it("manda la invitación .ics con su tipo", async () => {
    const fetch = vi.fn(async (_u: string, _i: RequestInit) => new Response(JSON.stringify({ id: "em_1" }), { status: 200 }));
    await sendEmail({ apiKey: "k", fetch }, { from: "a@b.c", to: "d@e.f", subject: "s", html: "h", text: "t", attachments: [{ filename: "invitacion.ics", content: "QQ==", contentType: "text/calendar; method=REQUEST" }] });
    const body = JSON.parse(fetch.mock.calls[0][1].body as string);
    expect(body.attachments).toEqual([{ filename: "invitacion.ics", content: "QQ==", content_type: "text/calendar; method=REQUEST" }]);
  });
});
