/** Correo con el enlace para crear o cambiar la contraseña del gestor. Puro. */
import { esc, kit, renderShell, UI } from "@/notifications/lib/email-layout";
import { BRAND as B } from "@/notifications/lib/brand";

export function buildPasswordLinkEmail(d: { name: string | null; url: string; logoUrl: string }) {
  const { N9 } = UI;
  const { primary } = kit();
  const subject = "Travel Puzzle · Crea tu contraseña del gestor";
  const hello = d.name ? `Hola ${d.name.split(" ")[0]},` : "Hola,";
  const body = `<tr><td style="padding:26px 26px 0">
<h1 style="margin:0 0 10px;font-size:24px;line-height:1.2;color:${N9}">Tu contraseña del gestor de viajes</h1>
<p style="font-size:15px;line-height:1.55;color:${N9};margin:0">${esc(hello)} usa este botón para crear o cambiar tu contraseña. Vence en 1 hora y solo sirve una vez.</p>
</td></tr>
<tr><td style="padding:22px 26px 0">
${primary(d.url, "Crear mi contraseña")}
<p style="font-size:12px;color:${B.muted};text-align:center;margin:12px 0 0">Si no lo pediste, ignora este correo: tu acceso no cambia.</p>
</td></tr>`;
  const html = renderShell({
    lang: "es",
    subject,
    preheader: "Enlace para crear tu contraseña (vence en 1 hora)",
    logoUrl: d.logoUrl,
    labels: { myBooking: "", help: "", follow: "", footer: "Aviso interno · Travel Puzzle", slogan: "Te armamos tu viaje" },
    body,
  });
  const text = [subject, "", `${hello} crea o cambia tu contraseña aquí (vence en 1 hora, un solo uso):`, d.url, "", "Si no lo pediste, ignora este correo."].join("\n");
  return { subject, html, text };
}
