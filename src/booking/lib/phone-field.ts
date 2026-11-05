/** Etiqueta del teléfono: obligatorio si el proveedor lo pide (isPhoneRequired). Puro. */
// REQ-015
export function phoneLabel(required: boolean | number | undefined): string {
  return required ? "WhatsApp" : "WhatsApp (opcional)";
}
