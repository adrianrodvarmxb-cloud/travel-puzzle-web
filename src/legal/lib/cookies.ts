/**
 * REQ-084: borrador de la política de cookies propia de Travel Puzzle (la de FREETOUR no
 * regula sitios de partners; skill cumplimiento-freetour, G5). La página /cookies queda
 * tras COOKIES_POLICY_ENABLED (apagada). Formato: "## " título, "- " inciso.
 *
 * BORRADOR: pendiente de revisión del PO y de un abogado. No publicar sin OK.
 * Solo describe lo que el sitio usa hoy (copy honesto): idioma, sesión de cuenta (solo con sesión iniciada)
 * y el widget de afiliados de /trenes y /traslados. No hay analíticas instaladas.
 */
// REQ-084
export function isCookiesPolicyEnabled(value: string | undefined): boolean {
  return value === "true";
}

// REQ-084
export const POLITICA_COOKIES_BORRADOR = [
  "Borrador: pendiente de revisión del PO y de un abogado. No publicar sin OK.",
  "Esta política explica qué cookies y tecnologías similares usa https://travelpuzzle.com.mx, para qué sirven y cómo puede desactivarlas. Complementa nuestro aviso de privacidad integral (https://travelpuzzle.com.mx/privacidad).",
  "## ¿Qué son las cookies?",
  "Son pequeños archivos que el sitio guarda en su navegador para recordar información entre visitas, como el idioma que eligió.",
  "## Cookies necesarias",
  "Permiten que el sitio funcione y no se pueden desactivar desde el sitio:",
  "- preferredLanguage: recuerda el idioma que eligió. Dura hasta un año.",
  "- Cookies de sesión de su cuenta (solo si inicia sesión): mantienen su sesión abierta de forma segura.",
  "- Cookies de seguridad de nuestro proveedor de infraestructura: protegen el sitio contra tráfico automatizado y abuso.",
  "## Cookies analíticas",
  "Hoy no usamos cookies analíticas. Si en el futuro medimos visitas para mejorar el sitio, actualizaremos esta política antes de hacerlo y le pediremos su consentimiento cuando la ley lo requiera.",
  "## Cookies de afiliados",
  "En algunas secciones (por ejemplo, trenes y traslados) mostramos ofertas de socios comerciales mediante enlaces o widgets de afiliado. Al usarlos, el socio puede guardar cookies para saber que la visita llegó desde Travel Puzzle y atribuirnos la compra. Esas cookies son de los socios y se rigen por sus propias políticas.",
  "## ¿Cómo desactivarlas?",
  "Puede borrar o bloquear las cookies desde la configuración de su navegador. Si bloquea las cookies necesarias, es posible que algunas funciones (como recordar su idioma) no funcionen.",
  "## Cambios a esta política",
  "Publicaremos cualquier cambio en esta misma página. Dudas: info@travelpuzzle.com.mx.",
].join("\n");
