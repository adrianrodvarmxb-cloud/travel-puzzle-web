/** Envío de correos con la API de Resend (https://resend.com/docs/api-reference/emails/send-email). */
export interface OutgoingEmail {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export async function sendEmail(
  { apiKey, fetch }: { apiKey: string; fetch: (url: string, init: RequestInit) => Promise<Response> },
  email: OutgoingEmail
): Promise<string> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: email.from,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(email.replyTo && { reply_to: email.replyTo }),
    }),
  });
  const json = (await res.json().catch(() => null)) as { id?: string; message?: string } | null;
  if (!res.ok || !json?.id) throw new Error(`Resend ${res.status}: ${json?.message ?? "sin detalle"}`);
  return json.id;
}
