/** Barrido de retenciones: avisa al día 5 y libera las vencidas (REQ-3484). Dependencias por parámetro (I/O fuera). */
import { classifyHold } from "./lib/hold-notices";
import type { PaymentKind } from "./lib/checkout";
import { buildHoldNoticeTeamEmail, buildReleasedCustomerEmail, buildReleasedTeamEmail } from "./lib/email";

type Mail = { to: string; subject: string; html: string; text: string };

export interface HeldRow {
  payment: { id: string; paymentIntent: string | null; amountCentavos: number; kind: PaymentKind };
  request: { id: string; ref: string; tripTitle: string; email: string; firstName: string };
  /** Cuándo quedó retenida (el pago pasa a «held» una sola vez). */
  heldAt: Date;
}

export interface SweepDeps {
  enabled: boolean; now: Date; siteUrl: string; logoUrl: string;
  listHeld(): Promise<HeldRow[]>;
  /** Marca de «aviso del día 5 ya enviado» por pago. */
  wasNoticed(paymentId: string): Promise<boolean>;
  markNoticed(paymentId: string): Promise<void>;
  cancel(paymentIntent: string, idempotencyKey: string): Promise<unknown>;
  markReleased(paymentId: string): Promise<boolean>;
  setRequestStatus(id: string, status: string): Promise<unknown>;
  sendCustomer(m: Mail): Promise<unknown>;
  sendTeam(m: Omit<Mail, "to">): Promise<unknown>;
}

export type SweepResult = { skipped: "disabled" } | { noticed: number; expired: number; failed: number };

// REQ-3484
export async function runHoldSweep(d: SweepDeps): Promise<SweepResult> {
  if (!d.enabled) return { skipped: "disabled" };
  const adminUrl = `${d.siteUrl}/admin/solicitudes`;
  let noticed = 0, expired = 0, failed = 0;
  for (const h of await d.listHeld()) {
    const { payment: p, request: r } = h;
    const info = { ref: r.ref, tripTitle: r.tripTitle, firstName: r.firstName, kind: p.kind, centavos: p.amountCentavos, logoUrl: d.logoUrl };
    try {
      const c = classifyHold(h.heldAt, d.now);
      if (c.stage === "notice") {
        if (await d.wasNoticed(p.id)) continue;
        await d.sendTeam(buildHoldNoticeTeamEmail(info, adminUrl, c.daysLeft));
        await d.markNoticed(p.id);
        noticed++;
      } else if (c.stage === "expired") {
        // Stripe suele haberla soltado ya: si cancelar falla, igual se cierra en la base.
        if (p.paymentIntent) await d.cancel(p.paymentIntent, `release_${p.id}`).catch((e) => console.warn(`[retenciones] ${r.ref}: Stripe ya no la tenía (${(e as Error).message})`));
        if (!(await d.markReleased(p.id))) continue;
        await d.setRequestStatus(r.id, "closed");
        await d.sendCustomer({ to: r.email, ...buildReleasedCustomerEmail(info) }).catch((e) => console.error(`[retenciones] correo ${r.ref}:`, (e as Error).message));
        await d.sendTeam(buildReleasedTeamEmail(info, adminUrl, "venció la retención de 7 días sin confirmar con el proveedor")).catch((e) => console.error(`[retenciones] aviso ${r.ref}:`, (e as Error).message));
        expired++;
      }
    } catch (e) {
      failed++;
      console.error(`[retenciones] ${r.ref}:`, (e as Error).message);
    }
  }
  return { noticed, expired, failed };
}
