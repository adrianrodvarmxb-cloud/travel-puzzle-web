// Puro · REQ-1331: cada correo sale en horario hábil del proveedor (lunes a viernes, 9:00 a 11:00 de su hora).
export const ZONA_MX = "America/Mexico_City";
export const VENTANA = { desde: 9, hasta: 11 } as const;

const zonaValida = (tz?: string) => { try { if (!tz) return ZONA_MX; new Intl.DateTimeFormat("en-US", { timeZone: tz }); return tz; } catch { return ZONA_MX; } };

function partes(iso: string, tz?: string) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: zonaValida(tz), year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short" });
  const p = Object.fromEntries(f.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: Number(p.hour), dia: String(p.weekday) };
}

// REQ-1331: la fecha (AAAA-MM-DD) en la zona del proveedor.
export const fechaLocal = (iso: string, tz?: string) => partes(iso, tz).fecha;

// REQ-1331: ¿es buen momento para escribirle?
export function enVentana(iso: string, tz?: string): boolean {
  const { hora, dia } = partes(iso, tz);
  return dia !== "Sat" && dia !== "Sun" && hora >= VENTANA.desde && hora < VENTANA.hasta;
}

// REQ-1331: zona por país o ciudad del proveedor (lo que no esté, México).
const ZONAS: [RegExp, string][] = [
  [/malasia|malaysia|kuala|borneo|singapur|singapore/i, "Asia/Kuala_Lumpur"], [/china|pek[ií]n|beijing|shanghai/i, "Asia/Shanghai"],
  [/jap[oó]n|japan|kioto|kyoto|tokio|tokyo/i, "Asia/Tokyo"], [/india|delhi|nepal/i, "Asia/Kolkata"], [/tailandia|thailand|bangkok/i, "Asia/Bangkok"],
  [/per[uú]|cusco|lima/i, "America/Lima"], [/colombia|bogot[aá]|cartagena|medell[ií]n/i, "America/Bogota"], [/argentina|buenos aires/i, "America/Argentina/Buenos_Aires"],
  [/francia|france|par[ií]s/i, "Europe/Paris"], [/espa[ñn]a|spain|madrid/i, "Europe/Madrid"], [/italia|italy|roma/i, "Europe/Rome"], [/reino unido|london|londres|uk\b/i, "Europe/London"],
  [/jordania|jordan/i, "Asia/Amman"], [/egipto|egypt/i, "Africa/Cairo"], [/rusia|russia|mosc[uú]/i, "Europe/Moscow"], [/canad[aá]|toronto/i, "America/Toronto"],
];
export const zonaPorDestino = (texto: string) => ZONAS.find(([re]) => re.test(texto))?.[1] ?? ZONA_MX;
