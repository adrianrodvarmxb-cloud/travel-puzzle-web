/** REQ-10826 · Lector de la página de reserva (paso único, ola 8): núcleo común + opciones, panel y prellenado. Puro. */
import type { FichaModel, FichaOption } from "../model";
import { panelPlan, type PanelFlags, type PanelPlan } from "../panel-plan";
import { leerPrefill, type FichaPrefill, type Query } from "../prefill";
import { commonFacts, type CommonFacts, type ReaderContext } from "./common";

export interface BookingReaderContext extends ReaderContext { flags: PanelFlags; query: Query }
export interface BookingRead { common: CommonFacts; panel: PanelPlan; options: FichaOption[]; prefill: FichaPrefill; leadHours: number | null }

// REQ-10826
export function readBooking(f: FichaModel, ctx: BookingReaderContext): BookingRead {
  return { common: commonFacts(f, ctx), panel: panelPlan(f, ctx.flags), options: f.options, prefill: leerPrefill(ctx.query, f), leadHours: f.booking.leadHours };
}
