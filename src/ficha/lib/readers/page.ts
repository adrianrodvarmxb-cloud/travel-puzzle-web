/** REQ-10826 · Lector de la página (plantilla de 21 bloques): núcleo común + bloques visibles, preguntas y panel. Puro. */
import { blocksFor, type BlockContext, type BlockId } from "../blocks";
import { faqFor, type FichaFaq } from "../faq";
import type { FichaModel } from "../model";
import { panelPlan, type PanelFlags, type PanelPlan } from "../panel-plan";
import { commonFacts, type CommonFacts, type ReaderContext } from "./common";

export interface PageReaderContext extends ReaderContext {
  flags: PanelFlags & Pick<BlockContext, "milaEnabled" | "freetourFaqEnabled">;
  /** Reseñas y tarjetas llegan aparte del modelo (bloques 18, 19 y 20). */
  reviews: number;
  crossSell: number;
  others: number;
}

export interface PageRead { common: CommonFacts; blocks: BlockId[]; faq: FichaFaq[]; panel: PanelPlan; model: FichaModel }

// REQ-10826
export function readPage(f: FichaModel, ctx: PageReaderContext): PageRead {
  const faq = faqFor(f);
  const blocks = blocksFor(f, { reviews: ctx.reviews, faq: faq.length, crossSell: ctx.crossSell, others: ctx.others, milaEnabled: ctx.flags.milaEnabled, freetourFaqEnabled: ctx.flags.freetourFaqEnabled });
  return { common: commonFacts(f, ctx), blocks, faq, panel: panelPlan(f, ctx.flags), model: f };
}
