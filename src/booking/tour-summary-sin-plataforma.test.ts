/** REQ-1246 (D31): los correos al cliente usan el título del tour sin la plataforma. */
import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { getMoreTours, getTourSummary } from "./tour-summary";

const tr = [{ language: "es", title: "Tallin (Premios FREETOUR.com)" }, { language: "en", title: "Tallinn - FreeTour.com" }];
const one = { providerTitle: "Ana", duration: "2:00", meetingPoint: null, titleImageURL: "https://i/a.jpg", images: [], priceValue: 0, id: "t1", rating: 5, reviewsNumber: 3, city: { translations: { es: "Tallin" } }, translations: tr, cityId: 1 };
const prisma = { tour: { findUnique: async () => one, findMany: async () => [{ id: "t2", titleImageURL: "https://i/b.jpg", rating: 5, priceValue: 0, translations: tr }] } } as unknown as PrismaClient;

describe("REQ-1246 correos sin la plataforma", () => {
  it("REQ-1246 resumen del tour en es y en", async () => {
    expect((await getTourSummary(prisma, 9, "es"))!.title).toBe("Tallin");
    expect((await getTourSummary(prisma, 9, "en"))!.title).toBe("Tallinn");
  });
  it("REQ-1246 «más tours» de la misma ciudad", async () => {
    const more = await getMoreTours(prisma, 9, "es", "https://travelpuzzle.com.mx");
    expect(more.map((m) => m.title)).toEqual(["Tallin"]);
  });
});
