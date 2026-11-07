/** REQ-255: fecha legible sin Intl ni Date (render determinista, INC-001). Puro. */
const ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function formatDate(iso: string, lang: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const [y, mo, d] = [m[1], Number(m[2]), Number(m[3])];
  return lang === "es" ? `${d} de ${ES[mo - 1]} de ${y}` : `${EN[mo - 1]} ${d}, ${y}`;
}
