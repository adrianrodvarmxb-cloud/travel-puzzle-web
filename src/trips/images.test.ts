import { describe, it, expect, vi } from "vitest";
import { uploadTripImage } from "./images";

const file = (type: string, size: number) => ({ type, size, arrayBuffer: async () => new ArrayBuffer(size) });

describe("uploadTripImage", () => {
  it("guarda en el almacén y devuelve llave y url", async () => {
    const put = vi.fn(async () => {});
    const r = await uploadTripImage(file("image/jpeg", 100), { put, now: () => 5, random: () => "abcd" });
    expect(r).toEqual({ ok: true, key: "trips/5-abcd.jpg", url: "/api/viajes/foto/trips/5-abcd.jpg" });
    expect(put).toHaveBeenCalledWith("trips/5-abcd.jpg", expect.any(ArrayBuffer), "image/jpeg");
  });
  it("rechaza archivos que no son foto sin guardar nada", async () => {
    const put = vi.fn();
    expect(await uploadTripImage(file("text/html", 10), { put, now: () => 5, random: () => "a" })).toMatchObject({ ok: false });
    expect(put).not.toHaveBeenCalled();
  });
  it("sin almacén configurado, error claro", async () => {
    expect(await uploadTripImage(file("image/png", 10), { put: null, now: () => 5, random: () => "a" })).toEqual({ ok: false, error: "El almacén de fotos aún no está configurado" });
  });
});
