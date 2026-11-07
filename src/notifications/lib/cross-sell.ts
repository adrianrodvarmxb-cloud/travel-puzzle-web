/**
 * Venta cruzada en correos transaccionales (pendiente 18 del PO, 6 nov 2026), tras EMAIL_CROSS_SELL_ENABLED (apagada).
 *
 * - REQ-262: qué correo lleva el bloque. Nunca rechazo ni cancelación; nunca correos internos ni de pago pendiente.
 * - REQ-263: solo productos que NO son de FREETOUR (regla B3 de cumplimiento-freetour; falla cerrada: sin origen = FREETOUR):
 *   traslados, transporte, eSIM, tours de otros proveedores y viajes propios. Misma ciudad y misma fecha, con las reglas
 *   del carrito (prioridades y ocultos por destino, una tarjeta por categoría, máx. 3 como en celular).
 * - REQ-265: UTM por correo en cada enlace; los enlaces van al sitio de Travel Puzzle (nunca directo a terceros).
 * - REQ-266: sin descuentos ni precios inventados: el precio sale tal cual del producto o no se muestra.
 * - REQ-267: es informativo y va solo en correos que ya se envían. Decisión del PO (6-11, 09:07, «solo freetours no
 *   publicidad»): la única restricción es no promover FREETOUR; NO se exige la lista «No publicidad». La lógica de la
 *   negativa se conserva oculta y reversible (`REQUIRE_NO_PUBLICIDAD = false`); la validación LFPDPPP queda como pregunta
 *   para el abogado. El consentimiento de marketing del registro (REQ-084) es aparte y no se toca.
 * Puro: sin I/O; fechas sin Intl (INC-001).
 */
import { buildCarousel, DEFAULT_RULES, type CarouselRule } from "@/companions/lib/carousel";
import { isFreetourOffer, type OfferSource } from "@/freetour/lib/promo-policy";
import { BRAND as B } from "./brand";
import { esc, kit, UI, MONO } from "./email-layout";
import type { EmailLang } from "./booking-email";

/** REQ-267: con `true` vuelve la regla anterior (sin consultar la negativa no hay bloque, y el bloque dice cómo negarse). */
export const REQUIRE_NO_PUBLICIDAD = false;

/** Inventario de correos al cliente y a la operación (docs/correos-venta-cruzada.md). */
export const CROSS_SELL_POLICY = {
  confirmation: { aplica: true, motivo: "Reserva confirmada: el cliente ya tiene ciudad y fecha." },
  reminder48: { aplica: true, motivo: "Faltan 2 días: aún hay tiempo de reservar traslado o transporte." },
  dayOf: { aplica: true, motivo: "Mismo día: solo lo que sirve ese día (traslado, transporte)." },
  modified: { aplica: true, motivo: "La reserva sigue activa con la fecha nueva." },
  review: { aplica: true, motivo: "Post-tour: el cliente puede seguir en la ciudad." },
  rejected: { aplica: false, motivo: "Regla del PO: nunca en el rechazo." },
  canceled: { aplica: false, motivo: "Regla del PO: nunca en la cancelación." },
  "trip-request": { aplica: false, motivo: "Acuse de una solicitud de cotización: aún no hay viaje confirmado ni fecha cerrada." },
  "payment-link": { aplica: false, motivo: "Pago pendiente: no se distrae del pago." },
  "payment-received": { aplica: false, motivo: "Propuesto para una ola siguiente: falta leer la ciudad y las fechas del viaje propio." },
  internal: { aplica: false, motivo: "Correos al equipo (solicitud, pago recibido, reseña, cancelación manual, contraseña)." },
} as const;
export type CrossSellEmail = keyof typeof CROSS_SELL_POLICY;

/** REQ-264: bandera EMAIL_CROSS_SELL_ENABLED; solo "true" exacto la enciende. */
export function crossSellEnabled(env: { EMAIL_CROSS_SELL_ENABLED?: string }): boolean {
  return env.EMAIL_CROSS_SELL_ENABLED === "true";
}

/** Categorías que puede llevar el bloque (REQ-263). Seguros, alojamiento, renta de auto, visa y ETIAS no. */
export const CROSS_SELL_CATEGORIES = ["tour", "day_trip", "transfer", "transport", "esim"] as const;
export type CrossSellCategory = (typeof CROSS_SELL_CATEGORIES)[number];

export interface EmailCrossSellCandidate {
  /** Sin origen cuenta como FREETOUR y se descarta (REQ-081, falla cerrada). */
  source?: OfferSource;
  category: CrossSellCategory;
  title: string;
  /** Quién lo vende («Kiwitaxi», «Travel Puzzle»…). */
  provider: string;
  /** Página del sitio de Travel Puzzle (se le agrega la UTM). */
  url: string;
  /** Precio tal cual lo muestra el producto («Desde USD 39»); null = sin precio. */
  priceLabel?: string | null;
  /** Fechas con salida (YYYY-MM-DD) o "any" para lo que se pide en cualquier fecha (traslados). */
  dates: string[] | "any";
}

export interface EmailCrossSellInput {
  email: CrossSellEmail;
  enabled: boolean;
  /** REQ-267: si el cliente pidió «No publicidad» (true) o no se pudo saber (null). Solo cuenta con `requireOptOut`. */
  optedOut: boolean | null;
  /** REQ-267: exigir la negativa (por omisión, REQUIRE_NO_PUBLICIDAD = false por decisión del PO). */
  requireOptOut?: boolean;
  lang: EmailLang;
  site: string;
  context: {
    cityName: string | null;
    /** ISO-2 del destino. */
    country: string | null;
    cityCode?: string | null;
    /** Día del tour en la ciudad (YYYY-MM-DD). */
    day: string | null;
    /** Inicio en UTC (ISO 8601), para la regla de <72 h. */
    freeTourAt?: string | null;
    travelerCountry?: string | null;
    now: number;
  };
  candidates: EmailCrossSellCandidate[];
  rules?: CarouselRule[];
}

export interface CrossSellCard { category: CrossSellCategory; title: string; chargedByLabel: string; url: string; priceLabel: string | null }
/** `optOut` es null cuando no se exige la negativa: no se promete un mecanismo que no se aplica. */
export interface CrossSellBlock { email: CrossSellEmail; lang: EmailLang; title: string; intro: string; cards: CrossSellCard[]; optOut: string | null; cta: string }

const T = {
  es: {
    eyebrow: "Para tu viaje",
    title: (c: string) => `Completa tu viaje a ${c}`,
    intro: "Ideas para la misma ciudad y la misma fecha. Cada una se reserva aparte, con quien la vende.",
    charged: (p: string) => `Lo reservas con ${p}`,
    cta: "Ver",
    optOut: "¿Prefieres no ver sugerencias? Escríbenos a info@travelpuzzle.com.mx con el asunto «No publicidad».",
  },
  en: {
    eyebrow: "For your trip",
    title: (c: string) => `Complete your trip to ${c}`,
    intro: "Ideas for the same city and date. Each one is booked separately, with whoever sells it.",
    charged: (p: string) => `Booked with ${p}`,
    cta: "See",
    optOut: "Rather not see suggestions? Email info@travelpuzzle.com.mx with the subject “No publicidad”.",
  },
} as const;

/** REQ-265: UTM por correo y categoría. Solo enlaces del sitio; cualquier otro se descarta. */
export function withUtm(url: string, site: string, email: CrossSellEmail, category: CrossSellCategory): string | null {
  const base = site.replace(/\/+$/, "");
  let u: URL;
  try { u = new URL(url, `${base}/`); } catch { return null; }
  if (!/^https:$/.test(u.protocol) || `${u.protocol}//${u.host}` !== new URL(`${base}/`).origin) return null;
  u.searchParams.set("utm_source", "travelpuzzle");
  u.searchParams.set("utm_medium", "email");
  u.searchParams.set("utm_campaign", `venta-cruzada-${email}`);
  u.searchParams.set("utm_content", category);
  return u.toString();
}

/** REQ-266: palabras de oferta que el bloque nunca usa (no hay descuentos en producción). */
export const PROMO_WORDS = /descuento|% ?off|\boferta|promoci[oó]n|cup[oó]n|gratis|discount|\bsale\b|coupon|\bdeal\b/i;

export function buildEmailCrossSell(input: EmailCrossSellInput): CrossSellBlock | null {
  const policy = CROSS_SELL_POLICY[input.email];
  const requireOptOut = input.requireOptOut ?? REQUIRE_NO_PUBLICIDAD;
  if (!input.enabled || !policy?.aplica) return null;
  if (input.optedOut === true || (requireOptOut && input.optedOut !== false)) return null;
  const { cityName, country, day } = input.context;
  if (!cityName || !day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const t = T[input.lang];

  const usable = input.candidates.filter((c) =>
    !isFreetourOffer(c) &&
    (CROSS_SELL_CATEGORIES as readonly string[]).includes(c.category) &&
    (c.dates === "any" || c.dates.includes(day)) &&
    !PROMO_WORDS.test(`${c.title} ${c.priceLabel ?? ""}`) &&
    withUtm(c.url, input.site, input.email, c.category) !== null,
  );
  if (!usable.length) return null;

  const cards = buildCarousel({
    candidates: usable.map((c) => ({ type: c.category, title: c.title, chargedBy: c.provider, priceLabel: c.priceLabel ?? undefined, action: { kind: "deeplink", label: "Ver opciones", adapterId: c.provider, url: c.url } })),
    context: { country: country ?? "", cityCode: input.context.cityCode ?? "", travelerCountry: input.context.travelerCountry ?? undefined, freeTourAt: input.context.freeTourAt ?? undefined, now: input.context.now },
    device: "mobile",
    rules: input.rules ?? DEFAULT_RULES,
    flags: {},
    requireTour: false,
  });
  const out: CrossSellCard[] = cards.flatMap((c) => {
    const url = c.action?.kind === "deeplink" ? withUtm(c.action.url, input.site, input.email, c.category as CrossSellCategory) : null;
    return url ? [{ category: c.category as CrossSellCategory, title: c.title, chargedByLabel: t.charged(c.chargedBy), url, priceLabel: c.priceLabel ?? null }] : [];
  });
  if (!out.length) return null;
  return { email: input.email, lang: input.lang, title: t.title(cityName), intro: t.intro, cards: out, optOut: requireOptOut ? t.optOut : null, cta: t.cta };
}

/** Filas HTML del bloque (mismo marco que «Más planes»). `eyebrow` viene del kit del correo para seguir su numeración. */
export function renderCrossSellHtml(block: CrossSellBlock | null | undefined, eyebrow?: (label: string) => string): string {
  if (!block || !block.cards.length) return "";
  const { N9, LINE, SOFT } = UI;
  const k = kit();
  const eb = eyebrow ?? k.eyebrow;
  const t = T[block.lang];
  const cards = block.cards.map((c) => `<tr><td style="padding:0 0 10px">
<a href="${esc(c.url)}" style="display:block;text-decoration:none;background:${SOFT};border:1px solid ${LINE};border-radius:14px;padding:14px 16px;color:${N9}">
<div style="font-size:15px;font-weight:700;line-height:1.3;color:${N9}">${esc(c.title)}</div>
<div style="font-family:${MONO};font-size:11px;letter-spacing:0.5px;margin-top:6px;color:${B.muted}">${esc(c.chargedByLabel)}${c.priceLabel ? ` · ${esc(c.priceLabel)}` : ""}</div>
<div style="font-size:12px;font-weight:700;color:${B.lightBlue};margin-top:8px">${esc(block.cta)} →</div></a></td></tr>`).join("\n");
  return `<tr><td style="padding:30px 26px 0" data-bloque="venta-cruzada">
${eb(t.eyebrow)}${k.h2(block.title)}
<p style="margin:-6px 0 14px;font-size:13px;line-height:1.5;color:${B.darkBlue}">${esc(block.intro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cards}</table>
${block.optOut ? `<p style="margin:4px 0 0;font-size:11px;line-height:1.5;color:${B.muted}">${esc(block.optOut)}</p>` : ""}
</td></tr>`;
}

/** Líneas de texto plano del bloque. */
export function crossSellText(block: CrossSellBlock | null | undefined): string[] {
  if (!block || !block.cards.length) return [];
  return ["", block.title, block.intro, ...block.cards.map((c) => `- ${c.title} (${c.chargedByLabel}${c.priceLabel ? `, ${c.priceLabel}` : ""}): ${c.url}`), ...(block.optOut ? [block.optOut] : [])];
}
