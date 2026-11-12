/** REQ-1599: correo con el enlace para entrar a la cuenta. Puro. */
import { esc, kit, renderShell, UI } from "@/notifications/lib/email-layout";
import { BRAND as B } from "@/notifications/lib/brand";

export function buildLoginLinkEmail(d: { url: string; logoUrl: string }) {
  const { N9 } = UI;
  const { primary } = kit();
  const subject = "Travel Puzzle · Tu enlace para entrar";
  const body = `<tr><td style="padding:26px 26px 0">
<h1 style="margin:0 0 10px;font-size:24px;line-height:1.2;color:${N9}">Entra a tu cuenta</h1>
<p style="font-size:15px;line-height:1.55;color:${N9};margin:0">${esc("Usa este botón para entrar y ver todas tus reservas en un solo lugar. Vence en 15 minutos y solo sirve una vez.")}</p>
</td></tr>
<tr><td style="padding:22px 26px 0">
${primary(d.url, "Entrar a mi cuenta")}
<p style="font-size:12px;color:${B.muted};text-align:center;margin:12px 0 0">Si no lo pediste, ignora este correo: nadie puede entrar sin este enlace.</p>
</td></tr>`;
  const html = renderShell({
    lang: "es",
    subject,
    preheader: "Tu enlace para entrar (vence en 15 minutos)",
    logoUrl: d.logoUrl,
    labels: { myBooking: "", help: "", follow: "", footer: "Travel Puzzle", slogan: "Te armamos tu viaje" },
    body,
  });
  const text = [subject, "", "Entra a tu cuenta con este enlace (vence en 15 minutos, un solo uso):", d.url, "", "Si no lo pediste, ignora este correo."].join("\n");
  return { subject, html, text };
}
