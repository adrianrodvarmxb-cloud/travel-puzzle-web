/** REQ-1626: «1 persona», «N personas». Puro. */
export function peopleLabel(n: number): string {
  return `${n} ${n === 1 ? "persona" : "personas"}`;
}
