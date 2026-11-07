/**
 * REQ-1054: baja y optimiza las imágenes de una entrada del blog.
 *   npx tsx src/scripts/blog-imagenes.ts <entrada.json>
 * Por cada imagen con src /blog/img/{slug}/{nombre}: baja el original del banco (Unsplash/Pexels por CDN; Pixabay
 * por id con PIXABAY_API_KEY, como el import de viajes), lo recorta a la proporción de su formato y escribe
 * public/blog/img/{slug}/{nombre}-{800,1600}.{avif,webp,jpg}. Si los 6 archivos ya existen, no la vuelve a bajar.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import sharp from "sharp";
import { parsePost } from "../blog/lib/schema";
import { allImages, aspectFor, downloadPlan, imageFiles, IMAGE_WIDTHS } from "../blog/lib/images";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string): Promise<Response> {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: { "user-agent": "TravelPuzzleBlog/1.0 (+https://travelpuzzle.com.mx)" } });
    if (r.status !== 429 && r.status < 500) return r;
    await sleep(5_000 * (i + 1));
  }
  return fetch(url);
}

async function original(plan: NonNullable<ReturnType<typeof downloadPlan>>): Promise<Buffer> {
  let url = plan.kind === "url" ? plan.url : "";
  if (plan.kind === "pixabay") {
    const key = process.env.PIXABAY_API_KEY;
    if (!key) throw new Error("Falta PIXABAY_API_KEY");
    const r = await get(`https://pixabay.com/api/?key=${key}&id=${plan.id}`);
    const hit = r.ok ? (await r.json()).hits?.[0] : null;
    if (!hit) throw new Error(`Pixabay ${plan.id}: sin resultado (HTTP ${r.status})`);
    url = hit.largeImageURL;
  }
  const img = await get(url);
  if (!img.ok) throw new Error(`descarga HTTP ${img.status}: ${url}`);
  return Buffer.from(await img.arrayBuffer());
}

(async () => {
  const file = process.argv[2];
  if (!file) { console.error("Uso: npx tsx src/scripts/blog-imagenes.ts <entrada.json>"); process.exit(2); }
  const r = parsePost(JSON.parse(readFileSync(file, "utf8")));
  if (!r.ok) { console.error(`entrada inválida: ${r.error}`); process.exit(1); }
  const errors: string[] = [];
  for (const { where, kind, img } of allImages(r.post)) {
    const files = imageFiles(img.src);
    if (!files.length) { errors.push(`${where}: src no es del sitio (${img.src})`); continue; }
    if (files.every((f) => existsSync(f))) { console.log(`ya existe ${img.src}`); continue; }
    const plan = downloadPlan(img);
    if (!plan) { errors.push(`${where}: sin origen descargable`); continue; }
    try {
      const buf = await original(plan);
      const [aw, ah] = aspectFor(kind);
      mkdirSync(dirname(files[0]), { recursive: true });
      for (const w of IMAGE_WIDTHS) {
        const base = sharp(buf).rotate().resize({ width: w, height: Math.round((w * ah) / aw), fit: "cover", position: sharp.strategy.attention });
        writeFileSync(`public${img.src}-${w}.avif`, await base.clone().avif({ quality: 50, effort: 4 }).toBuffer());
        writeFileSync(`public${img.src}-${w}.webp`, await base.clone().webp({ quality: 72 }).toBuffer());
        writeFileSync(`public${img.src}-${w}.jpg`, await base.clone().jpeg({ quality: 78, mozjpeg: true, progressive: true }).toBuffer());
      }
      console.log(`ok ${img.src} (${kind} ${aw}:${ah})`);
    } catch (e) { errors.push(`${where}: ${(e as Error).message}`); }
  }
  if (errors.length) { errors.forEach((e) => console.error(`ERROR ${e}`)); process.exit(1); }
})();
