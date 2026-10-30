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
