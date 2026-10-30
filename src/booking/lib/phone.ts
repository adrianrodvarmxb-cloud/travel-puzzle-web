/**
 * Teléfono en el formato que pide Freetour: "+" y solo dígitos.
 * undefined = no dieron teléfono; null = no se pudo interpretar.
 * Un número de 10 dígitos sin lada se toma como de México (+52).
 */
export function normalizePhone(input: string | undefined | null): string | undefined | null {
  if (!input || !input.trim()) return undefined;
  let s = input.trim().replace(/[\s\-().]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (/^\d{10}$/.test(s)) s = "+52" + s;
  return /^\+\d{8,15}$/.test(s) ? s : null;
}
