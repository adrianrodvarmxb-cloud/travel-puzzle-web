import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ExperienceCard } from "./ExperienceCard";
import { experienceCard } from "@/tours/lib/experience-card";

describe("REQ-583: la tarjeta es un enlace real con sus datos en texto (HTML del servidor, sin JS)", () => {
  it("REQ-583: <a href> a la ficha con título, ciudad · duración, precio y operador", () => {
    const card = experienceCard({
      key: "v1", href: "/destinos/fr/paris/louvre", title: "Louvre con guía", image: null, city: "París", duration: "3 h", formato: "tour",
      rating: 4.8, reviews: 120, provider: "Extime Travel", price: { text: "Desde aprox. MXN $1,780 · EUR €89", free: false },
    }, "es");
    const html = renderToStaticMarkup(createElement(ExperienceCard, { card }));
    const a = html.match(/^<a [^>]*href="([^"]+)"/);
    expect(a?.[1]).toBe("/destinos/fr/paris/louvre");
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    for (const t of ["Louvre con guía", "París · 3 h", "Desde aprox. MXN $1,780 · EUR €89", "Extime Travel"]) expect(text).toContain(t);
  });
});
