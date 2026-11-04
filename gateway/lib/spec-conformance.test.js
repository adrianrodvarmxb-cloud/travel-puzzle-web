// REQ-019 — INC-002: lo que la pasarela manda a Freetour cumple los campos `required` del Swagger oficial (v2.0, v2.1 y v2.2).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { toFreetourRequest } from "./operations.js";

const spec = JSON.parse(readFileSync(new URL("./freetour-spec-required.json", import.meta.url), "utf8"));
const ref = { refNumber: "6782-20261104140813-761", eventId: 631715588, adults: 1, children: 0 };

describe("conformidad con el Swagger de Freetour", () => {
  for (const [version, req] of Object.entries(spec.required)) {
    it(`REQ-019: v${version} POST /booking/cancel lleva todos los campos obligatorios`, () => {
      const r = toFreetourRequest("cancelBooking", ref);
      expect(r).toMatchObject({ ok: true, method: "POST", path: "/booking/cancel" });
      for (const k of req.cancel) expect(r.body, `falta ${k}`).toHaveProperty(k);
      expect(typeof r.body.eventId).toBe("number");
      expect(typeof r.body.adults).toBe("number");
      expect(typeof r.body.children).toBe("number");
    });
    it(`REQ-019: v${version} POST /booking/edit y /booking también cumplen`, () => {
      const e = toFreetourRequest("editBooking", ref);
      for (const k of req.edit) expect(e.body).toHaveProperty(k);
      const b = toFreetourRequest("createBooking", { eventId: 1, adults: 1, children: 0, price: 0, customer: { email: "a@b.co", firstName: "A", lastName: "B" } });
      for (const k of req.booking) expect(b.body).toHaveProperty(k);
    });
  }
});
