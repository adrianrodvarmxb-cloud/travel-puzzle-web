// REQ-10826: paridad entre lectores (decisión 3) con los tres fixtures reales de la ola 6 y la ficha de ejemplo.
import { describe, expect, it } from "vitest";
import tangolFixture from "../../../../tests/fixtures/tangol/tour-43-glaciar-perito-moreno.json";
import freetourFixture from "../../../../tests/fixtures/freetour/tour-30042-edimburgo.json";
import tripFixture from "../../../../tests/fixtures/trips/tas-mys-01-malasia-esencial.json";
import { tangolToFicha, type TangolInput } from "../../adapters/tangol";
import { freetourToFicha, type FreetourInput } from "../../adapters/freetour";
import { tripToFicha, type TripInput } from "../../adapters/trip";
import { fichaEjemplo } from "../fixtures";
import type { FichaModel } from "../model";
import { PARITY_KEYS, readBooking, readEmail, readMila, readPage, readSearch, type CommonFacts } from "./index";

const tangol = (): FichaModel => tangolToFicha({
  row: tangolFixture as unknown as TangolInput["row"], translation: tangolFixture.translation,
  city: { slug: tangolFixture.city.slug, name: tangolFixture.city.name }, country: tangolFixture.country, lang: "es",
  taxonomy: { tipo: { slug: "excursion-de-un-dia", label: "Excursión de un día" }, temas: [], atributos: [] }, map: null,
});
const freetour = (): FichaModel => freetourToFicha({
  row: freetourFixture as unknown as FreetourInput["row"], translation: freetourFixture.translation,
  city: { slug: freetourFixture.city.slug, name: freetourFixture.city.name }, country: freetourFixture.country, lang: "es",
  taxonomy: { tipo: { slug: "free-tour", label: "Free tour" }, temas: [], atributos: [] }, map: { kind: "exact", lat: 55.9497, lng: -3.1912, directions: true },
});
const trip = (): FichaModel => tripToFicha({
  row: tripFixture as unknown as TripInput["row"],
  texts: { title: tripFixture.titleEs, summary: tripFixture.summaryEs, description: tripFixture.descriptionEs },
  gallery: tripFixture.images.map((im) => ({ url: `https://travelpuzzle.com.mx/img/${im.key}`, alt: im.alt })),
  city: { slug: "kuala-lumpur", name: "Kuala Lumpur" }, country: { code: "MY", name: "Malasia" }, lang: "es",
  taxonomy: { tipo: { slug: "circuito", label: "Circuito" }, temas: [], atributos: [] }, format: "circuito",
  map: { kind: "exact", lat: 2.7456, lng: 101.7072, directions: true }, agencyName: tripFixture.agencyName,
});

const ctx = { path: "/p" };
const flags = { bookings: true, paidTours: true, directPurchase: false, milaEnabled: true, freetourFaqEnabled: false };
const pick = (c: CommonFacts) => Object.fromEntries(PARITY_KEYS.map((k) => [k, c[k]]));

function allReaders(f: FichaModel): Record<string, CommonFacts> {
  const out: Record<string, CommonFacts> = {
    page: readPage(f, { ...ctx, flags, reviews: 0, crossSell: 0, others: 0 }).common,
    email: readEmail(f, ctx).common,
    booking: readBooking(f, { ...ctx, flags, query: {} }).common,
    search: readSearch(f, ctx).common,
  };
  const mila = readMila(f, ctx);
  if (mila) out.mila = mila.common;
  return out;
}

describe("REQ-10826: página, Mila, correo, reserva y buscador dan el mismo dato para la misma ficha", () => {
  it.each([["ejemplo", fichaEjemplo], ["tangol", tangol], ["freetour", freetour], ["viaje", trip]])("REQ-10826: paridad en %s", (_n, make) => {
    const readers = allReaders(make());
    const ref = pick(readers.page);
    for (const [name, c] of Object.entries(readers)) expect(pick(c), name).toEqual(ref);
    expect(ref.title).toBeTruthy();
    expect(ref.path).toBe("/p");
  });

  it("REQ-10826: Mila lee Tangol y los viajes, pero nunca FREETOUR (decisión 42)", () => {
    expect(readMila(tangol(), ctx)).not.toBeNull();
    expect(readMila(trip(), ctx)).not.toBeNull();
    expect(readMila(freetour(), ctx)).toBeNull();
    expect(Object.keys(allReaders(freetour()))).not.toContain("mila");
  });

  it("REQ-10826: duración, idioma y cancelación del correo son los mismos de la página y de la vista de Mila (REQ-10803)", () => {
    const f = tangol();
    const page = readPage(f, { ...ctx, flags, reviews: 0, crossSell: 0, others: 0 });
    const email = readEmail(f, ctx);
    const mila = readMila(f, ctx)!;
    expect(email.common.duration).toBe("8 h");
    expect(email.common.duration).toBe(page.common.duration);
    expect(mila.view.duration).toBe(page.common.duration);
    expect(email.common.cancellation).toBe(page.faq.find((q) => q.id === "cancelacion")!.a);
    expect(mila.view.cancellation).toBe(email.common.cancellation);
    expect(email.operatorLine).toBe("Servicio operado en destino por: Tangol Tours");
  });

  it("REQ-10826: ningún lector deja pasar neto, comisión, teléfonos ni correos", () => {
    for (const make of [tangol, freetour, trip]) {
      const f = make();
      const todo = JSON.stringify([readPage(f, { ...ctx, flags, reviews: 0, crossSell: 0, others: 0 }).common, readEmail(f, ctx), readBooking(f, { ...ctx, flags, query: {} }), readSearch(f, ctx), readMila(f, ctx)]);
      expect(todo).not.toMatch(/"(net|neto|commission|comision|markup|providerPhone|providerEmail|phone|email)":/i);
      expect(todo).not.toMatch(/\+\d{2}[\d\s-]{8,}/);
    }
  });

  it("REQ-10826: la reserva lee el prellenado válido y el buscador la primera foto y el tipo", () => {
    const f = tangol();
    const b = readBooking(f, { ...ctx, flags, query: { fecha: "2026-12-20", adultos: "2", opcion: "53673" } });
    expect(b.prefill).toEqual({ fecha: "2026-12-20", adultos: 2, opcion: "53673" });
    expect(b.panel.control).toBe("request-form");
    const s = readSearch(f, ctx);
    expect(s.image).toMatch(/^https?:\/\//);
    expect(s.tipo?.slug).toBe("excursion-de-un-dia");
    expect(s.rating).toBeNull(); // decisión 18
  });
});
