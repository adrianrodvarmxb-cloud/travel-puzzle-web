/** REQ-037: agrega "Traslados" después de "Tours" solo con TRANSFERS_ENABLED encendido. Puro. */
export function withTransfersLink<L extends { href: string; label: string }>(links: L[], enabled: boolean, label: string): (L | { href: string; label: string })[] {
  if (!enabled) return links;
  const i = links.findIndex((l) => l.href === "/tours");
  const link = { href: "/traslados", label };
  return i < 0 ? [...links, link] : [...links.slice(0, i + 1), link, ...links.slice(i + 1)];
}
