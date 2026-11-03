import { describe, it, expect } from "vitest";
import { checkImage, imageKey, imageUrl, MAX_IMAGE_BYTES } from "./image";

describe("fotos de viajes", () => {
  it("acepta jpg, png y webp de hasta 5 MB", () => {
    expect(checkImage({ type: "image/jpeg", size: 1000 })).toBeNull();
    expect(checkImage({ type: "image/webp", size: MAX_IMAGE_BYTES })).toBeNull();
    expect(checkImage({ type: "application/pdf", size: 10 })).toMatch(/JPG, PNG o WebP/);
    expect(checkImage({ type: "image/png", size: MAX_IMAGE_BYTES + 1 })).toMatch(/5 MB/);
  });
  it("la llave no deja pasar rutas ni nombres raros", () => {
    expect(imageKey("image/png", 1800000000000, "ab12")).toBe("trips/1800000000000-ab12.png");
  });
  it("url pública para mostrarla", () => {
    expect(imageUrl("trips/1-a.png")).toBe("/api/viajes/foto/trips/1-a.png");
  });
});
