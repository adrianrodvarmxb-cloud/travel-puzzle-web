import { describe, it, expect } from "vitest";
import { reviewerDisplayName, canReview, needsFollowUp, signLink, verifyLink, parseRate } from "./customer-review";
import { reviewInputSchema } from "../schemas/customer-review";

const now = new Date("2026-11-10T12:00:00Z");

describe("reseñas de clientes", () => {
  it("nombre público: nombre e inicial del apellido", () => {
    expect(reviewerDisplayName("Ana", "Gómez")).toBe("Ana G.");
    expect(reviewerDisplayName(" ana maría ", "de la Cruz")).toBe("Ana María D.");
    expect(reviewerDisplayName("Ana", "")).toBe("Ana");
    expect(reviewerDisplayName("", "")).toBe("Viajero");
  });

  it("solo después del tour y si la reserva no se canceló", () => {
    const base = { status: "active", eventUtcDate: "2026-11-09 10:00:00", eventDate: null };
    expect(canReview(base, now)).toBe(true);
    expect(canReview({ ...base, status: "completed" }, now)).toBe(true);
    expect(canReview({ ...base, eventUtcDate: "2026-11-11 10:00:00" }, now)).toBe(false);
    expect(canReview({ ...base, status: "canceled" }, now)).toBe(false);
    expect(canReview({ ...base, status: "rejected" }, now)).toBe(false);
    expect(canReview({ status: "active", eventUtcDate: null, eventDate: "2026-11-08 18:00" }, now)).toBe(true);
    expect(canReview({ status: "active", eventUtcDate: null, eventDate: null }, now)).toBe(false);
  });

  it("1 a 3 estrellas piden seguimiento", () => {
    expect([1, 2, 3, 4, 5].map(needsFollowUp)).toEqual([true, true, true, false, false]);
  });

  it("estrellas desde la URL", () => {
    expect(parseRate("4")).toBe(4);
    expect(parseRate("9")).toBeNull();
    expect(parseRate(undefined)).toBeNull();
  });

  it("enlaces firmados: válidos, no alterables y con vencimiento", async () => {
    const exp = now.getTime() + 60_000;
    const sig = await signLink("secreto", "publish:abc", exp);
    expect(await verifyLink("secreto", "publish:abc", exp, sig, now)).toBe(true);
    expect(await verifyLink("secreto", "hide:abc", exp, sig, now)).toBe(false);
    expect(await verifyLink("otro", "publish:abc", exp, sig, now)).toBe(false);
    expect(await verifyLink("secreto", "publish:abc", exp, sig, new Date(exp + 1))).toBe(false);
    expect(await verifyLink("", "publish:abc", exp, sig, now)).toBe(false);
  });

  it("valida el formulario", () => {
    expect(reviewInputSchema.safeParse({ token: "x".repeat(20), rate: 5, content: " Genial ", consent: true }).success).toBe(true);
    expect(reviewInputSchema.safeParse({ token: "x".repeat(20), rate: 0, consent: true }).success).toBe(false);
    expect(reviewInputSchema.safeParse({ token: "x".repeat(20), rate: 5, content: "a".repeat(2001), consent: true }).success).toBe(false);
    expect(reviewInputSchema.parse({ token: "x".repeat(20), rate: 3 }).consent).toBe(false);
  });
});
