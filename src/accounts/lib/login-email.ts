/**
 * REQ-1599: correo con el enlace para entrar a la cuenta. Puro.
 * REQ-3317: transaccional y mínimo (sin imágenes, íconos de redes ni texto oculto) para que Gmail
 * no lo mande a Promociones: el cliente lo está esperando en ese momento.
 * REQ-3344: un solo logo pequeño arriba, como los referentes (Airbnb, GetYourGuide, Booking).
 */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildLoginLinkEmail(d: { url: string; logoUrl?: string }) {
  const subject = "Tu enlace para entrar a Travel Puzzle";
  const u = esc(d.url);
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:24px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#0A1330">
${d.logoUrl && /^https:\/\//.test(d.logoUrl) ? `<p style="margin:0 0 20px"><img src="${esc(d.logoUrl)}" width="110" alt="Travel Puzzle" style="display:block;width:110px;height:auto;border:0"></p>\n` : ""}<p style="font-size:16px;margin:0 0 16px">Hola:</p>
<p style="font-size:16px;line-height:1.5;margin:0 0 20px">Usa este enlace para entrar a tu cuenta de Travel Puzzle. Vence en 15 minutos y solo sirve una vez.</p>
<p style="margin:0 0 20px"><a href="${u}" style="display:inline-block;background:#0057FF;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:12px 22px;border-radius:8px">Entrar a mi cuenta</a></p>
<p style="font-size:13px;line-height:1.5;color:#5B6478;margin:0 0 6px">Si el botón no abre, copia este enlace:</p>
<p style="font-size:13px;line-height:1.5;margin:0 0 20px;word-break:break-all"><a href="${u}" style="color:#0057FF">${u}</a></p>
<p style="font-size:13px;color:#5B6478;margin:0">Si no lo pediste, ignora este correo. Nadie puede entrar sin este enlace.</p>
<p style="font-size:13px;color:#5B6478;margin:16px 0 0">Travel Puzzle</p>
</body></html>`;
  const text = ["Hola:", "", "Usa este enlace para entrar a tu cuenta de Travel Puzzle (vence en 15 minutos, un solo uso):", d.url, "", "Si no lo pediste, ignora este correo.", "", "Travel Puzzle"].join("\n");
  return { subject, html, text };
}
