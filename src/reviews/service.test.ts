import { describe, it, expect, vi } from "vitest";
import { getTourReviews, getHomeReviews, refreshStaleReviews, type ReviewRepo } from "./service";

const now = new Date("2026-10-30T12:00:00Z");
const review = (id: number, language = "Spanish") => ({ id, reviewerName: "Ana", language, title: null, content: "Excelente", rate: 5, addedAt: new Date(`2026-10-${10 + id}T00:00:00Z`) });

function fakeRepo(cache: { fetchedAt: Date; totalObjects: number } | null, stored = [review(1), review(2, "English")]) {
  return {
    getCache: vi.fn(async () => cache),
    listByTour: vi.fn(async () => stored),
    listRecent: vi.fn(async () => stored),
    saveTourReviews: vi.fn(async () => {}),
    listStaleTours: vi.fn(async () => [6782, 42065]),
  } satisfies ReviewRepo;
}

const apiWith = (reviews = [{ id: 9, reviewerName: "Leo", language: "Spanish", title: "Top", content: "Increíble", rate: 5, addedAt: "2026-10-29 10:00:00" }]) => ({
  get: vi.fn(async () => ({ data: { reviews, totalObjects: reviews.length, currentPage: 1, totalPages: 1 }, status: 200 })),
});

describe("getTourReviews", () => {
  it("con caché vigente no llama a Freetour", async () => {
    const repo = fakeRepo({ fetchedAt: new Date("2026-10-29T00:00:00Z"), totalObjects: 2 });
    const api = apiWith();
    const out = await getTourReviews({ tourExternalId: 6782, lang: "es", limit: 5 }, { api, repo, now });
    expect(api.get).not.toHaveBeenCalled();
    expect(out.reviews.map((r) => r.id)).toEqual([1, 2]);
    expect(out.total).toBe(2);
  });

  it("con caché vencida pide las 100 más recientes en v.2.1 y las guarda", async () => {
    const repo = fakeRepo({ fetchedAt: new Date("2026-10-01T00:00:00Z"), totalObjects: 2 });
    const api = apiWith();
    const out = await getTourReviews({ tourExternalId: 6782, lang: "es", limit: 5 }, { api, repo, now });
    expect(api.get).toHaveBeenCalledWith("/tours/6782/reviews?page=1&sort=desc", { version: "2.1" });
    expect(repo.saveTourReviews).toHaveBeenCalledWith(6782, expect.any(Array), 1, now);
    expect(out.reviews.map((r) => r.id)).toEqual([9]);
  });

  it("si Freetour falla, muestra lo que haya en caché aunque esté vencido", async () => {
    const repo = fakeRepo({ fetchedAt: new Date("2026-10-01T00:00:00Z"), totalObjects: 2 });
    const api = { get: vi.fn(async () => { throw new Error("caído"); }) };
    const out = await getTourReviews({ tourExternalId: 6782, lang: "es", limit: 5 }, { api, repo, now });
    expect(out.reviews.length).toBe(2);
  });
});

describe("getHomeReviews", () => {
  it("toma las recientes ya guardadas y prioriza el idioma", async () => {
    const repo = fakeRepo(null, [review(1, "English"), review(2)]);
    const out = await getHomeReviews({ lang: "es", limit: 2 }, { repo });
    expect(out.map((r) => r.id)).toEqual([2, 1]);
  });
});

describe("refreshStaleReviews", () => {
  it("pide a la base los tours con reseñas vencidas (7 días) y los actualiza uno por uno", async () => {
    const repo = fakeRepo(null);
    const api = apiWith();
    const out = await refreshStaleReviews({ batch: 2 }, { api, repo, now });
    expect(repo.listStaleTours).toHaveBeenCalledWith(2, new Date("2026-10-23T12:00:00Z"));
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(repo.saveTourReviews).toHaveBeenCalledTimes(2);
    expect(out).toEqual({ refreshed: 2, failed: 0 });
  });

  it("si un tour falla, sigue con los demás y lo cuenta", async () => {
    const repo = fakeRepo(null);
    const api = { get: vi.fn().mockRejectedValueOnce(new Error("caído")).mockResolvedValue({ data: [], status: 200 }) };
    const out = await refreshStaleReviews({ batch: 2 }, { api, repo, now });
    expect(out).toEqual({ refreshed: 1, failed: 1 });
  });
});
