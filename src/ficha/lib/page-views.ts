/**
 * REQ-10858 · Ficha única, ola 7 (plan §2: «las tres páginas de ficha eligen plantilla por bandera»; §3: 21 bloques;
 * §5 DIP: la plantilla recibe las vistas ya armadas). Arma, a partir del modelo común y de lo que llega aparte
 * (reseñas, tarjetas de transporte y de otras experiencias, prefill, número de WhatsApp, país del visitante, tipos de
 * cambio y banderas resueltas), las props de cada uno de los 21 bloques y la vista del panel, con las mismas funciones
 * puras que ya tienen prueba por bloque (ola 6 y ola 7). Puro: sin I/O, sin reloj, sin `process.env`, sin `Intl`
 * (INC-001). Qué bloque sale lo decide `blocksFor` (REQ-10780); aquí solo se arma lo que cada bloque pinta.
 * Un bloque cuya vista queda en null igual recibe sus props: el componente ya devuelve vacío sin «N/D».
 */
import { bookingSteps } from "@/trips/lib/booking-steps";
import type { TransferCardView } from "@/trips/lib/transfer-card";
import { blocksFor, type BlockContext, type BlockId } from "./blocks";
import { briefHeading, briefText } from "./brief-view";
import {
  faqBlockView, milaBlockView, reviewsBlockView,
  type FaqBlockView, type FichaReviewInput, type MilaBlockView, type ReviewsBlockView,
} from "./closing-view";
import { beforeYouGoView, conditionsText, conditionsView, importantInfoView, type BeforeYouGoView, type ConditionsView, type ImportantInfoView } from "./conditions-view";
import { contentHeading, descriptionHtml, highlightItems, itineraryDays, type ItineraryDayView } from "./content-view";
import {
  completeTripBlockView, otherExperiencesBlockView,
  type CompleteTripBlockView, type OtherCard, type OtherExperiencesBlockView, type TransportCard,
} from "./cross-sell-view";
import { fichaCrumbs, type FichaCrumb } from "./crumbs";
import { faqFor, type FichaFaq } from "./faq";
import { galleryLayout, type GalleryLayout } from "./gallery";
import { guaranteesBlockView, type GuaranteesBlockView } from "./guarantees";
import { keyFactsRows, type KeyFactRow } from "./key-facts";
import type { FxTable } from "./local-price";
import type { FichaModel } from "./model";
import { panelPlan, type PanelFlags, type PanelPlan } from "./panel-plan";
import { panelView, type PanelView } from "./panel-view";
import { includesView, meetingView, optionCards, practicalText, type IncludesView, type MeetingView, type OptionCard } from "./practical-view";
import type { FichaPrefill } from "./prefill";
import { taxonomyChips, type TaxonomyChip } from "./taxonomy-view";
import { titleView, type TitleView } from "./title";

/** Banderas ya resueltas por el servidor (ningún bloque lee `process.env`). */
export interface PageViewFlags extends PanelFlags, Pick<BlockContext, "milaEnabled" | "freetourFaqEnabled"> {
  /** CART_ADD_ENABLED: botón «Agregar a mi viaje» (decisión 23). */
  cartEnabled: boolean;
  /** STRIPE_HOLD_ENABLED: «Cómo funciona tu reserva» con retención en tarjeta o con liga de pago (REQ-059). */
  cardHold: boolean;
  /** Garantías de FREETOUR solo con su revisión de cumplimiento (REQ-10804). */
  freetourGuarantees?: boolean;
  /** REQ-10874: LOCAL_CURRENCY_ENABLED; encendida, el panel lleva la ruta para pedir el precio en la moneda del visitante. */
  localCurrency?: boolean;
}

export interface PageViewsInput {
  f: FichaModel;
  prefill: FichaPrefill;
  /** Número de WhatsApp de Travel Puzzle; null = sin Mila ni asesor. */
  whatsapp: string | null;
  /**
   * País del visitante y tipos de cambio (decisión 32). REQ-10874: el HTML de la ficha lo guarda el borde (REQ-3318), así
   * que la página debe pasar `visitorCountry: null` (precio en la moneda del proveedor, igual para todos) y el navegador
   * pide su precio local a `/api/precio-local`; un país aquí solo tiene sentido en salidas que no se guardan (correo, Mila).
   */
  visitorCountry: string | null;
  fx: FxTable | null;
  flags: PageViewFlags;
  /** Lo que llega aparte del modelo (bloques 18, 19 y 20); vacío = el bloque no sale. */
  reviews: { items: FichaReviewInput[]; total: number };
  transport: TransportCard[];
  kiwitaxi: TransferCardView | null;
  others: { paid: OtherCard[]; free: OtherCard[]; includePaid: boolean };
  /** Ancla del apartado del proveedor en T&C (ola 14); null = enlace general. */
  providerAnchor?: string | null;
}

/** Props de cada bloque (mismas que reciben los componentes de `src/components/ficha/blocks/`; la prueba lo amarra). */
export interface FichaViews {
  migas?: { items: FichaCrumb[] };
  galeria?: { layout: GalleryLayout; title: string };
  titulo?: { view: TitleView };
  taxonomia?: { chips: TaxonomyChip[] };
  "datos-clave"?: { rows: KeyFactRow[] };
  "en-breve"?: { text: string | null; heading: string };
  destacado?: { items: string[]; heading: string };
  descripcion?: { html: string | null; heading: string };
  itinerario?: { days: ItineraryDayView[]; heading: string };
  incluye?: { view: IncludesView; headings: { incluye: string; noIncluye: string } };
  "punto-de-encuentro"?: { view: MeetingView | null; text: { heading: string; directions: string; zone: string; zoneNote: string } };
  opciones?: { cards: OptionCard[]; heading: string };
  "antes-de-ir"?: { view: BeforeYouGoView | null; text: { heading: string; bring: string; requirements: string } };
  condiciones?: { view: ConditionsView; text: { heading: string; cancellation: string } };
  "informacion-importante"?: { view: ImportantInfoView | null; heading: string };
  preguntas?: { view: FaqBlockView | null };
  mila?: { view: MilaBlockView | null };
  resenas?: { view: ReviewsBlockView | null; language: string };
  "completa-tu-viaje"?: { view: CompleteTripBlockView | null };
  "otras-experiencias"?: { view: OtherExperiencesBlockView | null };
  garantias?: { view: GuaranteesBlockView };
}

export interface FichaPageViews {
  /** Bloques visibles en orden (`blocksFor`). */
  order: BlockId[];
  views: FichaViews;
  plan: PanelPlan;
  panel: PanelView;
  faq: FichaFaq[];
}

/** Tarjeta de la franja de transporte de hoy (`transportForPlace`, REQ-10751) → tarjeta del bloque 19; sin ruta o título, fuera. */
// REQ-10860
export function transportCardsFrom(items: ReadonlyArray<{ id: string; path: string; title: string; image: string | null; provider?: string | null }>): TransportCard[] {
  return items
    .filter((i) => !!i.id && !!i.path?.trim() && !!i.title?.trim())
    .map((i) => ({ id: i.id, title: i.title.trim(), href: i.path, provider: i.provider ?? null, imageUrl: i.image ?? null }));
}

/** Las props de los 21 bloques, siempre completas; la plantilla pinta solo los de `order`. */
// REQ-10858
export function fichaViews(i: Omit<PageViewsInput, "visitorCountry" | "fx">): FichaViews {
  const { f, flags } = i;
  const lang = f.lang;
  return {
    migas: { items: fichaCrumbs({ country: f.country, city: f.city, title: f.title, lang }) },
    galeria: { layout: galleryLayout(f.gallery), title: f.title },
    titulo: { view: titleView({ title: f.title, rating: f.rating, provider: f.provider, lang }) },
    taxonomia: { chips: taxonomyChips(f.taxonomy, f.provider) },
    "datos-clave": { rows: keyFactsRows(f.facts, lang) },
    "en-breve": { text: briefText({ brief: f.brief, provider: f.provider, operator: f.operator }), heading: briefHeading(lang) },
    destacado: { items: highlightItems(f.highlights), heading: contentHeading("destacado", lang) },
    descripcion: { html: descriptionHtml(f.descriptionHtml, f.provider), heading: contentHeading("descripcion", lang) },
    itinerario: { days: itineraryDays(f.itinerary, lang), heading: contentHeading("itinerario", lang) },
    incluye: { view: includesView(f.includes, f.excludes), headings: { incluye: practicalText("incluye", lang), noIncluye: practicalText("noIncluye", lang) } },
    "punto-de-encuentro": {
      view: meetingView(f.meeting),
      text: { heading: practicalText("puntoDeEncuentro", lang), directions: practicalText("comoLlegar", lang), zone: practicalText("zona", lang), zoneNote: practicalText("zonaNota", lang) },
    },
    opciones: { cards: optionCards(f.options, lang, { localCurrency: !!flags.localCurrency }), heading: practicalText("opciones", lang) }, // REQ-10879
    "antes-de-ir": {
      view: beforeYouGoView(f.whatToBring, f.requirements),
      text: { heading: conditionsText("antesDeIr", lang), bring: conditionsText("queLlevar", lang), requirements: conditionsText("requisitos", lang) },
    },
    condiciones: {
      view: conditionsView(f.cancellation, lang, bookingSteps(lang, { cardHold: flags.cardHold })),
      text: { heading: conditionsText("condiciones", lang), cancellation: conditionsText("cancelacion", lang) },
    },
    "informacion-importante": { view: importantInfoView(f.notes, f.operator, lang), heading: conditionsText("informacion", lang) },
    preguntas: { view: faqBlockView(f) },
    mila: { view: milaBlockView(f, i.whatsapp, i.prefill) },
    resenas: { view: reviewsBlockView(f, i.reviews.items, i.reviews.total), language: lang },
    "completa-tu-viaje": { view: completeTripBlockView(f, i.transport, i.kiwitaxi) },
    "otras-experiencias": { view: otherExperiencesBlockView(f, i.others.paid, i.others.free, { includePaid: i.others.includePaid }) },
    garantias: { view: guaranteesBlockView(f, { freetourGuarantees: flags.freetourGuarantees, providerAnchor: i.providerAnchor ?? null }) },
  };
}

/** Orden de bloques, props de cada uno, plan y vista del panel: todo lo que `FichaView` y el panel necesitan. */
// REQ-10858
export function fichaPageViews(i: PageViewsInput): FichaPageViews {
  const { f, flags } = i;
  const views = fichaViews(i);
  const faq = faqFor(f);
  const order = blocksFor(f, {
    reviews: views.resenas?.view?.items.length ?? 0,
    faq: faq.length,
    crossSell: views["completa-tu-viaje"]?.view ? views["completa-tu-viaje"].view.transport.length + (views["completa-tu-viaje"].view.affiliate ? 1 : 0) : 0,
    others: views["otras-experiencias"]?.view?.items.length ?? 0,
    milaEnabled: flags.milaEnabled,
    freetourFaqEnabled: flags.freetourFaqEnabled,
  });
  const plan = panelPlan(f, flags);
  const panel = panelView(f, plan, {
    visitorCountry: i.visitorCountry, fx: i.fx, whatsapp: i.whatsapp, prefill: i.prefill, milaEnabled: flags.milaEnabled, cartEnabled: flags.cartEnabled,
    localCurrency: flags.localCurrency === true, // REQ-10874
  });
  return { order, views, plan, panel, faq };
}
