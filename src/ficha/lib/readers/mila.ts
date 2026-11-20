/** REQ-10826 · Lector de Mila: núcleo común + vista de agente (REQ-10825). FREETOUR da null (decisión 42). Puro. */
import { agentView, agentViewText, type AgentView } from "../agent-view";
import type { FichaModel } from "../model";
import { commonFacts, type CommonFacts, type ReaderContext } from "./common";

export interface MilaRead { common: CommonFacts; view: AgentView; text: string }

// REQ-10826
export function readMila(f: FichaModel, ctx: ReaderContext): MilaRead | null {
  const view = agentView(f, ctx);
  const text = agentViewText(f, ctx);
  if (!view || !text) return null;
  return { common: commonFacts(f, ctx), view, text };
}
