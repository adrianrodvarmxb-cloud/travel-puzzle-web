/**
 * REQ-1073: pinta las láminas de Instagram (1080×1350) de una entrada y las deja junto a sus imágenes:
 *   npx tsx src/scripts/redes-laminas.ts <entrada.json>   → public/blog/img/{slug}/ig-{n}.jpg
 * La portada usa la foto optimizada de la entrada (corre después de blog-imagenes.ts). Se publican con la entrada,
 * así Instagram puede leerlas por URL pública del sitio.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { parsePost } from "../blog/lib/schema";
import { laminasFor } from "../redes/lib/textos";
import { laminaSvg, laminaFile, LAMINA_W, LAMINA_H, PHOTO_H } from "../redes/lib/laminas";

(async () => {
  const file = process.argv[2];
  if (!file) { console.error("Uso: npx tsx src/scripts/redes-laminas.ts <entrada.json>"); process.exit(2); }
  const r = parsePost(JSON.parse(readFileSync(file, "utf8")));
  if (!r.ok) { console.error(`entrada inválida: ${r.error}`); process.exit(1); }
  const laminas = laminasFor(r.post);
  for (const [i, l] of laminas.entries()) {
    const svg = Buffer.from(laminaSvg(l));
    const layers: { input: Buffer; top: number; left: number }[] = [];
    if (l.tipo === "portada") {
      const photo = `public${l.imagen}-1600.jpg`;
      if (!existsSync(photo)) { console.error(`falta ${photo} (corre antes blog-imagenes.ts)`); process.exit(1); }
      layers.push({ input: await sharp(photo).resize(LAMINA_W, PHOTO_H, { fit: "cover", position: sharp.strategy.attention }).toBuffer(), top: 0, left: 0 });
    }
    layers.push({ input: svg, top: 0, left: 0 });
    const out = await sharp({ create: { width: LAMINA_W, height: LAMINA_H, channels: 3, background: "#0A1330" } }).composite(layers).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
    writeFileSync(laminaFile(r.post.slug, i + 1), out);
    console.log(`ok ${laminaFile(r.post.slug, i + 1)}`);
  }
})();
