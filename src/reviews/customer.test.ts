import { describe, it, expect, vi } from "vitest";
import { submitReview, moderateReview, reviewPageState, adminLinkValid, type CustomerReviewDeps, type StoredReview } from "./customer";
import { signLink } from "./lib/customer-review";
import type { BookingRecord } from "@/booking/lib/booking-record";

const now = new Date("2026-11-10T12:00:00Z");
const record: BookingRecord = {
  refNumber: "6782-1-1", tourExternalId: 6782, eventId: 1, adults: 1, children: 0, price: 0,
  email: "ana@example.com", firstName: "Ana", lastName: "Gómez", phone: "+5215555555555",
  eventDate: "2026-11-09 10:00", eventUtcDate: "2026-11-09 09:00:00", language: "es", status: "active",
  manageToken: "t".repeat(24), createdAt: now, updatedAt: now,
};

function deps(over: Partial<CustomerReviewDeps> = {}) {
  const store = new Map<string, StoredReview>();
  const d: CustomerReviewDeps = {
    now,
    secret: "s3creto",
    siteUrl: "https://travelpuzzle.com.mx",
    findBooking: async (t) => (t === record.manageToken ? record : null),
    findReviewByRef: async (ref) => [...store.values()].find((r) => r.refNumber === ref) ?? null,
    findReviewById: async (id) => store.get(id) ?? null,
    saveReview: async (data) => {
      const prev = [...store.values()].find((r) => r.refNumber === data.refNumber);
      const row: StoredReview = { id: prev?.id ?? "r1", status: "pending", ...data };
      store.set(row.id, row);
      return row;
    },
    setStatus: async (id, status) => { const r = store.get(id); if (r) store.set(id, { ...r, status }); },
    tourTitle: async () => "Visita gratuita a Split",
    notify: vi.fn(async () => undefined),
    ...over,
  };
  return { d, store };
}

describe("reseña del cliente", () => {
  it("estado de la página: lista, aún no, cancelada o no existe", async () => {
    const { d } = deps();
    expect((await reviewPageState(record.manageToken, d)).kind).toBe("ready");
    expect((await reviewPageState("x".repeat(24), d)).kind).toBe("not_found");
    expect((await reviewPageState(record.manageToken, { ...d, now: new Date("2026-11-08T00:00:00Z") })).kind).toBe("too_early");
    const canceled = { ...d, findBooking: async () => ({ ...record, status: "canceled" }) };
    expect((await reviewPageState(record.manageToken, canceled)).kind).toBe("not_allowed");
  });

  it("guarda la reseña pendiente, con nombre público y aviso interno", async () => {
    const { d, store } = deps();
    expect(await submitReview({ token: record.manageToken, rate: 2, content: "Llegó tarde", consent: true }, d)).toBe("saved");
    const r = [...store.values()][0];
    expect(r).toMatchObject({ rate: 2, content: "Llegó tarde", displayName: "Ana G.", consent: true, status: "pending", tourExternalId: 6782 });
    expect(d.notify).toHaveBeenCalledOnce();
    const alert = (d.notify as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(alert.subject).toContain("Dar seguimiento");
  });

  it("si vuelve a entrar, edita la misma reseña y regresa a pendiente", async () => {
    const { d, store } = deps();
    await submitReview({ token: record.manageToken, rate: 5, content: "", consent: true }, d);
    await d.setStatus("r1", "published");
    await submitReview({ token: record.manageToken, rate: 4, content: "Muy bien", consent: true }, d);
    expect(store.size).toBe(1);
    expect(store.get("r1")).toMatchObject({ rate: 4, status: "pending" });
  });

  it("no guarda antes del tour", async () => {
    const { d } = deps({ now: new Date("2026-11-08T00:00:00Z") });
    expect(await submitReview({ token: record.manageToken, rate: 5, content: "", consent: true }, d)).toBe("not_allowed");
  });

  it("moderar con enlace firmado; sin consentimiento no se publica", async () => {
    const { d, store } = deps();
    await submitReview({ token: record.manageToken, rate: 5, content: "Genial", consent: true }, d);
    const exp = now.getTime() + 1000;
    const sig = await signLink(d.secret, "publish:r1", exp);
    expect(await moderateReview({ id: "r1", action: "publish", exp, sig }, d)).toBe("published");
    expect(store.get("r1")?.status).toBe("published");
    expect(await moderateReview({ id: "r1", action: "hide", exp, sig }, d)).toBe("invalid");
    store.set("r1", { ...store.get("r1")!, consent: false });
    expect(await moderateReview({ id: "r1", action: "publish", exp, sig }, d)).toBe("no_consent");
  });

  it("enlace del panel", async () => {
    const { d } = deps();
    const exp = now.getTime() + 1000;
    expect(await adminLinkValid({ exp, sig: await signLink(d.secret, "admin", exp) }, d)).toBe(true);
    expect(await adminLinkValid({ exp, sig: "nope-nope-nope" }, d)).toBe(false);
  });
});
