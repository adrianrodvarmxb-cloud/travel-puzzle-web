/** REQ-252: /api/contacto acepta cada formulario solo con la bandera de su página. Puro. */
import type { SitePages } from "@/site/lib/pages";

export function formAllowed(kind: "contacto" | "asesor", pages: Partial<SitePages>): boolean {
  return kind === "contacto" ? !!pages.contacto : !!pages.expertos;
}
