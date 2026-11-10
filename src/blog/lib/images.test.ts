import { describe, expect, it } from "vitest";
import { photoReuseProblems, imageVariants, imageUrl, imageFiles, imageProblems, aspectFor, IMAGE_WIDTHS, IMAGE_FORMATS, BODY_PHOTOS, PROVEEDORES_FOTOS_CON_PERMISO } from "./images";
import { sampleDaily, sampleImage } from "./fixtures";
import { parsePost, type PostInput } from "./schema";

const post = (o: Partial<PostInput> = {}) => { const r = parsePost(sampleDaily(o)); if (!r.ok) throw new Error(r.error); return r.post; };
const SLUG = "entrada-diaria-de-prueba";

describe("imágenes del blog", () => {
  it("REQ-1053: una imagen del sitio sale en AVIF, WebP y JPG a 800 y 1600 px; una https queda igual", () => {
    expect(IMAGE_WIDTHS).toEqual([800, 1600]);
    expect(IMAGE_FORMATS).toEqual(["avif", "webp", "jpg"]);
    const v = imageVariants(`/blog/img/${SLUG}/portada`);
    expect(v).toEqual({
      local: true,
      avif: `/blog/img/${SLUG}/portada-800.avif 800w, /blog/img/${SLUG}/portada-1600.avif 1600w`,
      webp: `/blog/img/${SLUG}/portada-800.webp 800w, /blog/img/${SLUG}/portada-1600.webp 1600w`,
      jpg: `/blog/img/${SLUG}/portada-800.jpg 800w, /blog/img/${SLUG}/portada-1600.jpg 1600w`,
      fallback: `/blog/img/${SLUG}/portada-1600.jpg`,
    });
    expect(imageVariants("https://example.org/a.jpg")).toEqual({ local: false, fallback: "https://example.org/a.jpg" });
    expect(imageUrl(`/blog/img/${SLUG}/portada`, "https://t.mx/", 800)).toBe(`https://t.mx/blog/img/${SLUG}/portada-800.jpg`);
    expect(imageFiles(`/blog/img/${SLUG}/portada`)).toHaveLength(6);
  });

  it("REQ-1054: proporción por formato (portada y banner 21:9)", () => {
    expect(aspectFor("portada")).toEqual([21, 9]);
    expect(aspectFor("banner")).toEqual([21, 9]);
    expect(aspectFor("ancho")).toEqual([16, 9]);
    expect(aspectFor("columna")).toEqual([3, 2]);
    expect(aspectFor("dos")).toEqual([4, 5]);
    expect(aspectFor("collage")).toEqual([4, 3]);
  });

  it("REQ-1051: la entrada de ejemplo cumple: portada y de 2 a 4 fotos en el cuerpo, todas con alt, crédito y licencia", () => {
    expect(BODY_PHOTOS).toEqual({ min: 2, max: 4 });
    expect(imageProblems(post())).toEqual([]);
  });

  it("REQ-1051: rechaza sin portada, con menos de 2 o más de 4 fotos en el cuerpo, o con un formato mal armado", () => {
    expect(imageProblems(post({ cover: undefined }))).toContain("falta la portada (hero) con licencia");
    const one = { formato: "columna" as const, despues: 0, fotos: [sampleImage("una")] };
    expect(imageProblems(post({ imagenes: [one] }))).toContain("el cuerpo necesita de 2 a 4 fotos (tiene 1)");
    const five = { formato: "galeria" as const, despues: 1, fotos: ["a", "b", "c", "d", "e"].map((n) => sampleImage(n)) };
    expect(imageProblems(post({ imagenes: [five] }))).toContain("el cuerpo necesita de 2 a 4 fotos (tiene 5)");
    const badDos = { formato: "dos" as const, despues: 0, fotos: [sampleImage("x"), sampleImage("y"), sampleImage("z")] };
    expect(imageProblems(post({ imagenes: [badDos] }))).toContain("formato «dos» lleva 2 fotos (tiene 3)");
    const late = { formato: "columna" as const, despues: 7, fotos: [sampleImage("t")] };
    expect(imageProblems(post({ imagenes: [late, one] }))).toContain("imagen después de la sección 7: la entrada tiene 4");
  });

  it("REQ-1052: rechaza imágenes sin licencia, de Unsplash+, de FREETOUR o de un proveedor sin permiso; la licencia corresponde al banco", () => {
    const noLic = { ...sampleImage("sin"), license: undefined };
    expect(imageProblems(post({ cover: noLic })).join(" ")).toMatch(/portada: falta la licencia/);
    const plus = sampleImage("plus", { descarga: "https://plus.unsplash.com/premium_photo-1" });
    expect(imageProblems(post({ cover: plus })).join(" ")).toMatch(/Unsplash\+/);
    const ft = sampleImage("ft", { descarga: "https://img.freetour.com/tour/1.jpg" });
    expect(imageProblems(post({ cover: ft })).join(" ")).toMatch(/proveedor de free tours/);
    const wrong = { ...sampleImage("w"), license: { name: "Pexels License" as const, url: "https://www.pexels.com/license/" } };
    expect(imageProblems(post({ cover: wrong })).join(" ")).toMatch(/licencia no corresponde al banco/);
    expect(PROVEEDORES_FOTOS_CON_PERMISO).toEqual([]);
    const prov = { ...sampleImage("p"), license: { name: "Permiso del proveedor" as const, url: "https://travelpuzzle.com.mx/terminos" }, origen: { banco: "proveedor" as const, id: "ext-1", pagina: "https://www.extime.com/", autor: "Extime Travel" }, credit: "© Extime Travel" };
    expect(imageProblems(post({ cover: prov })).join(" ")).toMatch(/sin permiso escrito/);
    const otherSlug = { ...sampleImage("o"), src: "/blog/img/otra-entrada/o" };
    expect(imageProblems(post({ cover: otherSlug })).join(" ")).toMatch(/\/blog\/img\/entrada-diaria-de-prueba\//);
    const noAuthor = { ...sampleImage("n"), credit: "Foto de banco" };
    expect(imageProblems(post({ cover: noAuthor })).join(" ")).toMatch(/el crédito debe nombrar al autor/);
  });
});

describe("descarga del original", () => {
  it("REQ-1054: Unsplash y Pexels por su CDN, Pixabay por id con la API; sin datos, nada", async () => {
    const { downloadPlan } = await import("./images");
    expect(downloadPlan(sampleImage("u", { descarga: "https://images.unsplash.com/photo-1?fm=jpg&w=3000" }))).toEqual({ kind: "url", url: "https://images.unsplash.com/photo-1?w=2400&q=85&fm=jpg" });
    const px = { ...sampleImage("p"), origen: { banco: "pexels" as const, id: "2598484", pagina: "https://www.pexels.com/photo/2598484/", autor: "Pierre Blaché" } };
    expect(downloadPlan(px)).toEqual({ kind: "url", url: "https://images.pexels.com/photos/2598484/pexels-photo-2598484.jpeg?auto=compress&cs=tinysrgb&w=2400" });
    const pb = { ...sampleImage("b"), origen: { banco: "pixabay" as const, id: "123", pagina: "https://pixabay.com/photos/x-123/", autor: "Alguien" } };
    expect(downloadPlan(pb)).toEqual({ kind: "pixabay", id: 123 });
    expect(downloadPlan({ ...sampleImage("n"), origen: undefined })).toBeNull();
  });
});

// REQ-1512: una foto de banco no se repite en otra entrada del blog (ni en la misma entrada)
describe("REQ-1512: fotos no repetidas", () => {
  const otra = (id: string, slug = "otra-entrada") => ({ ...post({ imagenes: [] }), slug, draft: false, cover: { ...post().cover!, origen: { banco: "unsplash" as const, id, pagina: "https://unsplash.com/photos/x", autor: "A" } } });
  it("avisa si la portada ya se usó en otra entrada publicada", () => {
    const yo = post({ imagenes: [], cover: { ...sampleDaily().cover, origen: { ...sampleDaily().cover.origen, id: "FOTO-USADA" } } as never });
    expect(photoReuseProblems(yo, [otra("FOTO-USADA")])).toEqual([`portada: la foto unsplash:FOTO-USADA ya está en «otra-entrada»`]);
  });
  it("no compara con borradores ni con la misma entrada, y sin repetidos no avisa", () => {
    const yo = post({ imagenes: [] });
    expect(photoReuseProblems(yo, [{ ...otra(yo.cover!.origen!.id), draft: true }])).toEqual([]);
    expect(photoReuseProblems(yo, [{ ...yo, slug: yo.slug }])).toEqual([]);
    expect(photoReuseProblems(yo, [otra("OTRA-FOTO")])).toEqual([]);
  });
});
