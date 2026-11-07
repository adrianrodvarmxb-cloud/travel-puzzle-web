import { describe, expect, it, vi } from "vitest";
import { submitContact, type ContactDeps } from "./send";
import { contactMessageSchema } from "./schemas/message";
import { buildContactEmail } from "./lib/email";

const msg = contactMessageSchema.parse({
  kind: "contacto", name: "Ana <b>López</b>", email: "ana@example.com", phone: "", topic: "reserva",
  message: "Tengo la reserva TP-123 <script>x</script>", consent: true, website: "", elapsedMs: 9000, language: "es",
});

function deps(over: Partial<ContactDeps> = {}): ContactDeps {
  return { enabled: true, teamInbox: "info@travelpuzzle.com.mx", send: vi.fn().mockResolvedValue("id-1"), log: vi.fn(), ...over };
}

describe("envío del formulario", () => {
  it("REQ-248: manda un solo correo al buzón del equipo con reply-to del viajero (nunca al viajero)", async () => {
    const d = deps();
    expect(await submitContact(msg, d)).toEqual({ ok: true });
    expect(d.send).toHaveBeenCalledTimes(1);
    const mail = (d.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(mail.to).toBe("info@travelpuzzle.com.mx");
    expect(mail.replyTo).toBe("ana@example.com");
  });

  it("REQ-248: el spam se acepta en apariencia pero no se envía", async () => {
    const d = deps();
    expect(await submitContact({ ...msg, website: "x" }, d)).toEqual({ ok: true });
    expect(d.send).not.toHaveBeenCalled();
    expect(d.log).toHaveBeenCalledWith(expect.stringContaining("trampa"));
  });

  it("REQ-248: con la bandera apagada o sin buzón no envía", async () => {
    expect(await submitContact(msg, deps({ enabled: false }))).toEqual({ ok: false, error: "no-disponible" });
    expect(await submitContact(msg, deps({ teamInbox: "" }))).toEqual({ ok: false, error: "no-disponible" });
  });

  it("REQ-248: si Resend falla, avisa sin tumbar la página y lo registra", async () => {
    const d = deps({ send: vi.fn().mockRejectedValue(new Error("Resend 500")) });
    expect(await submitContact(msg, d)).toEqual({ ok: false, error: "envio" });
    expect(d.log).toHaveBeenCalledWith(expect.stringContaining("Resend 500"));
  });

  it("REQ-248: el correo escapa el HTML de lo que escribe el viajero", () => {
    const e = buildContactEmail(msg);
    expect(e.html).not.toMatch(/<script>|<b>López/);
    expect(e.html).toContain("&lt;script&gt;");
    expect(e.text).toContain("Tengo la reserva TP-123");
    expect(e.subject).toBe("Contacto desde el sitio · Tengo una reserva · Ana <b>López</b>".replace(/<[^>]+>/g, ""));
  });
});
