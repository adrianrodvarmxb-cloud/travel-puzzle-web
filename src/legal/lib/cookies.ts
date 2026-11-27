/**
 * REQ-084: política de cookies propia de Travel Puzzle (la de FREETOUR no regula sitios de partners; skill
 * cumplimiento-freetour, G5). La página /cookies y el banner quedan tras COOKIES_POLICY_ENABLED.
 * REQ-10788 (Dictamen del abogado, 19-11-2026, punto 4): el texto vigente es el §A literal del dictamen y el banner el §B.
 * REQ-10786 (punto 2): basta el banner informativo, sin bitácora por visitante; se conserva el historial interno de
 * versiones con su fecha de vigencia. Formato de los textos: "## " título, "- " inciso (LegalDocument).
 * Puro: sin DOM, sin red, sin reloj (la fecha entra por parámetro, INC-001).
 */
// REQ-084
export function isCookiesPolicyEnabled(value: string | undefined): boolean {
  return value === "true";
}

// REQ-084 (versión del 8-11-2026, borrador; se conserva en el historial, REQ-10786). Ya no se muestra.
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

// REQ-10788: §A del dictamen, tal cual (solo se separan los rótulos de cada párrafo como título "## " para LegalDocument).
export const POLITICA_COOKIES = [
  "Esta Política de Cookies explica qué cookies y tecnologías similares utiliza https://travelpuzzle.com.mx, operado por Travel Puzzle, para qué sirven y cómo puede gestionarlas o desactivarlas desde su navegador. Este documento complementa nuestro Aviso de Privacidad Integral disponible en /privacidad.",
  "## ¿Qué son las cookies?",
  "Son pequeños archivos de texto que el sitio web almacena en su navegador para garantizar su funcionamiento técnico, mantener la seguridad y recordar preferencias básicas de navegación, como el idioma seleccionado.",
  "## Cookies técnicas o estrictamente necesarias (no requieren consentimiento previo)",
  "- preferredLanguage: conserva el idioma de navegación elegido por el usuario. Vigencia: hasta 1 año.",
  "- tp_cart: mantiene activos los servicios agregados a su carrito «Arma tu viaje» durante su navegación. Contiene únicamente un identificador técnico aleatorio, sin datos personales. Vigencia: 30 días o hasta que vacíe el carrito.",
  "- Cookies de sesión de cuenta (solo si inicia sesión): autentican y mantienen abierta su sesión de forma segura.",
  "- Cookies de seguridad de infraestructura (Cloudflare): protegen la plataforma contra tráfico automatizado malicioso y ataques de denegación de servicio.",
  "## Cookies analíticas y publicitarias",
  "Actualmente Travel Puzzle no utiliza cookies analíticas, de rastreo comportamental ni publicitarias propias. Si en el futuro incorporamos herramientas de medición o publicidad, actualizaremos esta política antes de su activación e implementaremos los mecanismos de consentimiento que exija la legislación aplicable.",
  "## Cookies de socios comerciales y afiliados",
  "En determinadas secciones (como trenes, traslados y el bloque «Traslado desde el aeropuerto») mostramos enlaces o integraciones hacia socios comerciales (Travelpayouts / Kiwitaxi). Al hacer clic y abandonar nuestro sitio, el socio comercial puede instalar cookies propias en su navegador para atribuir la referencia. Dichas cookies son responsabilidad exclusiva del tercero y se rigen por sus respectivas políticas de privacidad y cookies.",
  "## ¿Cómo desactivar las cookies?",
  "Puede bloquear o eliminar las cookies en cualquier momento desde la configuración de privacidad de su navegador. Si desactiva las cookies técnicas necesarias, funciones esenciales como la selección de idioma, el carrito «Arma tu viaje» o el inicio de sesión podrían no operar correctamente.",
  "## Actualizaciones y contacto",
  "Cualquier modificación a esta política se publicará en esta misma dirección. Para dudas sobre privacidad y uso de cookies, escriba a info@travelpuzzle.com.mx.",
].join("\n");

export interface VersionPolitica {
  /** Día desde el que rige (AAAA-MM-DD). */
  vigenteDesde: string;
  /** De dónde salió el texto (quién lo aprobó). */
  fuente: string;
  texto: string;
}

// REQ-10786: historial interno de versiones con fecha de vigencia. Se agrega al final; nunca se borra una versión.
export const VERSIONES_POLITICA_COOKIES: readonly VersionPolitica[] = [
  { vigenteDesde: "2026-11-08", fuente: "REQ-084, borrador del agente (nunca publicado: bandera apagada)", texto: POLITICA_COOKIES_BORRADOR },
  { vigenteDesde: "2026-11-19", fuente: "Dictamen del abogado, 19-11-2026, punto 4 (§A), REQ-10788", texto: POLITICA_COOKIES },
];

// REQ-10786: la versión que rige en un día dado (la última cuya vigencia ya empezó); null antes de la primera.
export function politicaCookiesVigente(hoyIso: string): VersionPolitica | null {
  let vigente: VersionPolitica | null = null;
  for (const v of VERSIONES_POLITICA_COOKIES) if (v.vigenteDesde <= hoyIso) vigente = v;
  return vigente;
}

export interface TextoBanner { texto: string; entendido: string; verPolitica: string }

// REQ-10788: §B del dictamen, tal cual.
export const BANNER_COOKIES: Record<"es" | "en", TextoBanner> = {
  es: {
    texto: "Usamos cookies estrictamente necesarias para que el sitio funcione (idioma, carrito y sesión). No usamos cookies analíticas ni publicitarias propias; los enlaces a socios externos aplican sus propias políticas al abrirse.",
    entendido: "Entendido",
    verPolitica: "Ver política",
  },
  en: {
    texto: "We use strictly necessary cookies so the site works properly (language, cart, and session). We do not use our own analytics or advertising cookies; external partner links apply their own policies when opened.",
    entendido: "Got it",
    verPolitica: "Cookie policy",
  },
};

// REQ-10788: el banner solo existe en es/en (gate 3 de los textos legales); cualquier otro idioma cae al español.
export function textoBanner(idioma: string | undefined): TextoBanner {
  return idioma === "en" ? BANNER_COOKIES.en : BANNER_COOKIES.es;
}

/** Clave donde el navegador recuerda «Entendido» (almacenamiento local, no una cookie: no hay bitácora por visitante, REQ-10786). */
export const CLAVE_ENTENDIDO = "tp_cookies_entendido";

// REQ-10788: se ve con la bandera encendida y mientras el visitante no haya pulsado «Entendido».
export function bannerVisible(d: { encendido: boolean; entendido: string | null }): boolean {
  return d.encendido && !d.entendido;
}
