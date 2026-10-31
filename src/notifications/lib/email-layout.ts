/**
 * Marco compartido de los correos de Travel Puzzle: encabezado oscuro con logo,
 * cuerpo blanco y pie con logo animado y redes. Funciones puras.
 */
import { BRAND as B } from "./brand";

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export const UI = { N9: "#0A1330", N8: "#14214D", LINE: "#E6EBF5", SOFT: "#F4F7FD", DIM: "#9AAEE0", GREEN: "#3DDC84", GREEN_TXT: "#7CE3A1" };
export const FONT = "Poppins,Arial,Helvetica,sans-serif";
export const MONO = "'JetBrains Mono','SFMono-Regular',Menlo,Consolas,'Courier New',monospace";

export interface ContactInfo {
  whatsapp?: string;
  socials?: { name: string; url: string }[];
  assistantUrl?: string;
}

/** Enlace directo a WhatsApp con un mensaje ya escrito. */
export function whatsappUrl(number: string | undefined, text: string): string | null {
  const wa = number?.replace(/\D/g, "");
  return wa ? `https://wa.me/${wa}?text=${encodeURIComponent(text)}` : null;
}

/** Piezas de diseño reutilizables; el contador numera las secciones (01, 02…). */
export function kit() {
  const { N9, LINE, DIM } = UI; // botón principal en rojo de marca (el avión del logo)
  let sec = 0;
  return {
    eyebrow: (label: string, color: string = B.lightBlue) =>
      `<div style="font-family:${MONO};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${color};margin:0 0 6px">${String(++sec).padStart(2, "0")} — ${esc(label)}</div>`,
    h2: (x: string, color: string = N9) =>
      `<h2 style="margin:0 0 16px;font-size:21px;line-height:1.25;font-weight:700;color:${color};letter-spacing:-0.3px">${esc(x)}</h2>`,
    ghost: (href: string, label: string) =>
      `<a href="${esc(href)}" style="display:inline-block;border:1px solid ${LINE};background:#ffffff;color:${N9};text-decoration:none;font-weight:600;font-size:13px;padding:10px 16px;border-radius:10px;margin:4px">${label}</a>`,
    primary: (href: string, label: string) =>
      `<a href="${esc(href)}" style="display:block;background:${B.red};color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:16px 20px;border-radius:12px;text-align:center">${esc(label)} &nbsp;→</a>`,
    passCell: (label: string, value: string) =>
      `<td valign="top" style="padding:14px 16px 16px;width:33%"><div style="font-family:${MONO};font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:${DIM}">${esc(label)}</div><div style="font-size:14px;font-weight:600;color:#ffffff;margin-top:4px;line-height:1.35">${esc(value)}</div></td>`,
    /** Línea de estado: "● RESERVA CONFIRMADA". */
    status: (label: string, dot: string, text: string) =>
      `<div style="font-family:${MONO};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${text}"><span style="color:${dot}">●</span>&nbsp; ${esc(label)}</div>`,
  };
}

export interface ShellOptions {
  lang: "es" | "en";
  subject: string;
  preheader: string;
  /** Logo fijo para fondo oscuro. */
  logoUrl: string;
  /** Logo animado del pie (GIF sobre fondo oscuro). */
  animatedLogoUrl?: string;
  /** Carpeta con instagram.png, facebook.png, … */
  iconsBaseUrl?: string;
  /** "Mi reserva" en el encabezado (si hay reserva vigente). */
  manageUrl?: string | null;
  /** Enlace de WhatsApp para "Ayuda" y el pie. */
  waUrl?: string | null;
  socials?: { name: string; url: string }[];
  /** Textos del encabezado y pie. */
  labels: { myBooking: string; help: string; follow: string; footer: string; slogan: string };
  /** Crédito extra en el pie (p. ej. del pronóstico). */
  credit?: string | null;
  /** Filas <tr> del cuerpo. */
  body: string;
}

export function renderShell(o: ShellOptions): string {
  const { N9 } = UI;
  const icons = o.iconsBaseUrl?.replace(/\/+$/, "");
  const socials = (o.socials ?? []).filter((x) => /^https:\/\//.test(x.url));
  const iconLink = (name: string, url: string) =>
    icons
      ? `<a href="${esc(url)}" style="display:inline-block;margin:0 0 0 8px;text-decoration:none"><img src="${esc(`${icons}/${name.toLowerCase()}.png`)}" width="36" height="36" alt="${esc(name)}" style="display:block;width:36px;height:36px;border:0"></a>`
      : `<a href="${esc(url)}" style="display:inline-block;color:${B.darkBlue};background:${B.yellow};text-decoration:none;font-size:13px;font-weight:600;padding:6px 12px;border-radius:999px;margin:3px">${esc(name)}</a>`;
  const footerLinks = [...socials.map((x) => iconLink(x.name, x.url)), ...(o.waUrl ? [iconLink("WhatsApp", o.waUrl)] : [])];
  const nav = [
    ...(o.manageUrl ? [`<a href="${esc(o.manageUrl)}" style="color:#ffffff;text-decoration:none">${esc(o.labels.myBooking)}</a>`] : []),
    ...(o.waUrl ? [`<a href="${esc(o.waUrl)}" style="color:#ffffff;text-decoration:none">${esc(o.labels.help)}</a>`] : []),
  ].join(`<span style="color:#34467F">&nbsp;&nbsp;/&nbsp;&nbsp;</span>`);

  return `<!doctype html><html lang="${o.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<title>${esc(o.subject)}</title></head>
<body style="margin:0;padding:0;background:${N9};font-family:${FONT};color:${N9};-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${N9}"><tr><td align="center" style="padding:20px 10px 28px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden">

<tr><td style="font-size:0;line-height:0;height:3px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td height="3" width="60%" style="background:${B.lightBlue}"></td><td height="3" width="25%" style="background:${B.yellow}"></td><td height="3" width="15%" style="background:${B.red}"></td></tr></table></td></tr>
<tr><td style="background:${N9};padding:14px 22px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td align="left" valign="middle"><img src="${esc(o.logoUrl)}" width="150" alt="Travel Puzzle" style="display:block;width:150px;height:auto;border:0"></td>
<td align="right" valign="middle" style="font-family:${MONO};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;white-space:nowrap">${nav}</td>
</tr></table>
</td></tr>

${o.body}

<tr><td style="padding:30px 0 0;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="background:${N9};padding:20px 22px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td align="left" valign="middle" width="160">${o.animatedLogoUrl ? `<img src="${esc(o.animatedLogoUrl)}" width="150" alt="Travel Puzzle · ${esc(o.labels.slogan)}" style="display:block;width:150px;height:auto;border:0">` : `<div style="font-family:Caveat,'Comic Sans MS',cursive;font-size:24px;color:${B.yellow}">${esc(o.labels.slogan)}</div>`}</td>
<td align="right" valign="middle">
${footerLinks.length ? `<div style="font-family:${MONO};font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${UI.DIM};margin-bottom:10px">${esc(o.labels.follow)}</div>
<div style="margin-bottom:12px">${footerLinks.join("")}</div>` : ""}
<div style="font-size:12px;color:#C9D6F5">${esc(o.labels.footer)}</div>
${o.credit ? `<div style="font-family:${MONO};font-size:10px;color:#5F73AD;margin-top:4px">${esc(o.credit)}</div>` : ""}
</td></tr></table>
</td></tr>

</table></td></tr></table></body></html>`;
}
