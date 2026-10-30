import { describe, it, expect, vi } from "vitest";
import { runSyncStep, type CatalogRepo } from "./sync";

function fakeRepo(initial: Awaited<ReturnType<CatalogRepo["getState"]>> = null) {
  let state = initial;
  const repo = {
    tours: [] as number[],
    cities: [] as number[],
    countries: [] as number[],
    deactivated: [] as Date[],
    getState: vi.fn(async () => state),
    saveState: vi.fn(async (s) => { state = { ...(state ?? { status: "", nextPage: 1, totalPages: 0, runStartedAt: null }), ...s }; }),
    existingCityIds: vi.fn(async () => [] as number[]),
    existingCountryIds: vi.fn(async (ids: number[]) => ids.filter((id) => repo.countries.includes(id))),
    upsertCountries: vi.fn(async (rows: { id: number }[]) => { repo.countries.push(...rows.map((r) => r.id)); }),
    upsertCities: vi.fn(async (rows: { id: number }[]) => { repo.cities.push(...rows.map((r) => r.id)); }),
    upsertTours: vi.fn(async (rows: { tour: { externalId: number } }[]) => { repo.tours.push(...rows.map((r) => r.tour.externalId)); }),
    deactivateNotSeenSince: vi.fn(async (d: Date) => { repo.deactivated.push(d); return 3; }),
    state: () => state,
  };
  return repo;
}

const tour = (id: number, cityId = 10, countryId = 99) => ({
  id, updatedAt: "", title: { es: "t" }, brief: {}, description: {}, URLs: { es: "u" }, providerTitle: "p", providerPhone: null,
  price: { value: 0, currency: "EUR" }, length: "2:00", meetingPoint: {}, cityId, countryId, includes: [], POIs: null,
  titleImageURL: null, categoryId: 1, images: null, videoURL: null, rating: null, reviewsNumber: 0,
});

function fakeApi(totalPages = 2) {
  return {
    get: vi.fn(async (path: string) => {
      if (path.startsWith("/tours?page=")) {
        const page = Number(path.split("=")[1]);
        return { data: { tours: [tour(page * 100 + 1), tour(page * 100 + 2, 11)], totalPages, currentPage: page, totalObjects: totalPages * 2 } };
      }
      if (path.startsWith("/cities/")) return { data: [{ id: 10, title: { es: "Ciudad 10" } }, { id: 11, title: { es: "Ciudad 11" } }] };
      throw new Error("ruta inesperada " + path);
    }),
  };
}

const countries = [{ id: 99, shortTitle: "mx", title: { en: "Mexico", es: "México", pt: "", de: "", fr: "", it: "" } }];
const now = new Date("2026-10-30T09:00:00Z");

describe("runSyncStep", () => {
  it("arranca la corrida del día: página 1, guarda países, ciudades y tours", async () => {
    const repo = fakeRepo();
    const res = await runSyncStep({ api: fakeApi(), repo, countries: countries as never, now });
    expect(res).toMatchObject({ action: "start", page: 1, tours: 2 });
    expect(repo.countries).toEqual([99]);
    expect(repo.cities).toEqual([10, 11]);
    expect(repo.tours).toEqual([101, 102]);
    expect(repo.state()).toMatchObject({ status: "in_progress", nextPage: 2, totalPages: 2, runStartedAt: now });
  });

  it("no vuelve a pedir ciudades que ya existen", async () => {
    const repo = fakeRepo({ status: "in_progress", nextPage: 2, totalPages: 2, runStartedAt: now });
    repo.existingCityIds.mockResolvedValue([10, 11]);
    const api = fakeApi();
    await runSyncStep({ api, repo, countries: countries as never, now });
    expect(api.get.mock.calls.map((c) => c[0])).toEqual(["/tours?page=2"]);
  });

  it("al terminar las páginas desactiva los tours que ya no aparecen y cierra la corrida", async () => {
    const repo = fakeRepo({ status: "in_progress", nextPage: 3, totalPages: 2, runStartedAt: now });
    const res = await runSyncStep({ api: fakeApi(), repo, countries: countries as never, now: new Date("2026-10-30T10:00:00Z") });
    expect(res).toMatchObject({ action: "finish", deactivated: 3 });
    expect(repo.deactivated).toEqual([now]);
    expect(repo.state()).toMatchObject({ status: "completed" });
  });

  it("si falla una página la marca como fallida para reintentarla", async () => {
    const repo = fakeRepo({ status: "in_progress", nextPage: 2, totalPages: 2, runStartedAt: now });
    const api = { get: vi.fn(async () => { throw new Error("timeout"); }) };
    await expect(runSyncStep({ api, repo, countries: countries as never, now })).rejects.toThrow("timeout");
    expect(repo.state()).toMatchObject({ status: "failed", nextPage: 2 });
  });

  it("si la corrida del día ya terminó no hace nada", async () => {
    const repo = fakeRepo({ status: "completed", nextPage: 3, totalPages: 2, runStartedAt: now });
    const api = fakeApi();
    expect(await runSyncStep({ api, repo, countries: countries as never, now })).toEqual({ action: "idle" });
    expect(api.get).not.toHaveBeenCalled();
  });

  it("si la corrida retoma sin países guardados, primero guarda el país y luego sus ciudades", async () => {
    const repo = fakeRepo({ status: "failed", nextPage: 2, totalPages: 2, runStartedAt: now });
    const order: string[] = [];
    repo.upsertCountries.mockImplementation(async (rows) => { order.push("países"); repo.countries.push(...rows.map((r) => r.id)); });
    repo.upsertCities.mockImplementation(async () => { order.push("ciudades"); });
    await runSyncStep({ api: fakeApi(), repo, countries: countries as never, now });
    expect(repo.countries).toEqual([99]);
    expect(order).toEqual(["países", "ciudades"]);
  });

  it("si Freetour manda un país que no está en la lista, lo guarda con nombre provisional", async () => {
    const repo = fakeRepo({ status: "in_progress", nextPage: 2, totalPages: 2, runStartedAt: now });
    await runSyncStep({ api: fakeApi(), repo, countries: [] as never, now });
    expect(repo.upsertCountries).toHaveBeenCalledWith([expect.objectContaining({ id: 99, code: "C99" })]);
  });
});
