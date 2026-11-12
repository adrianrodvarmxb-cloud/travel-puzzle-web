/**
 * REQ-1564: prueba con navegador real (Playwright) de que la carga inicial no descarga imágenes
 * fuera de la pantalla. Revisa cada ruta a 390 y 1366 px sin hacer scroll y sale con código 1 si
 * encuentra alguna. Uso: npx tsx src/scripts/offscreen-images.ts <url-base> [ruta ...]
 * Rutas por defecto: /, /tours y la primera ficha /viajes/... que aparezca en /tours.
 */
import { chromium } from "playwright";
import { offscreenLoaded, type LoadedImage } from "../perf/lib/offscreen";

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1366, height: 768 },
];

async function main() {
  const [base, ...rest] = process.argv.slice(2);
  if (!base) {
    console.error("Uso: offscreen-images.ts <url-base> [ruta ...]");
    process.exit(2);
  }
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: process.env.HTTPS_PROXY ? [`--proxy-server=${process.env.HTTPS_PROXY}`] : [],
  });
  let paths = rest;
  if (!paths.length) {
    const probe = await browser.newPage();
    await probe.goto(new URL("/tours", base).href, { waitUntil: "domcontentloaded" });
    const ficha = await probe.evaluate(() => document.querySelector<HTMLAnchorElement>('a[href^="/viajes/"]')?.getAttribute("href"));
    await probe.close();
    paths = ["/", "/tours", ...(ficha ? [ficha] : [])];
  }
  let failures = 0;
  for (const vp of VIEWPORTS) {
    for (const path of paths) {
      const page = await browser.newPage({ viewport: vp });
      await page.goto(new URL(path, base).href, { waitUntil: "load", timeout: 90_000 });
      await page.waitForTimeout(1500); // margen para lo que arranca justo después de load
      const images: LoadedImage[] = await page.evaluate(() =>
        [...document.images].map((i) => {
          const r = i.getBoundingClientRect();
          return { src: i.currentSrc || i.src, top: r.top + window.scrollY, height: r.height, loaded: i.complete && i.naturalWidth > 0, lazy: i.loading === "lazy" };
        }),
      );
      const bad = offscreenLoaded(images, vp.height);
      console.log(`${bad.length ? "FALLA" : "OK   "} ${vp.width}px ${path} — ${bad.length} fuera de pantalla de ${images.filter((i) => i.loaded).length} descargadas`);
      for (const b of bad) console.log(`        ${Math.round(b.top)}px ${b.src.slice(-90)}`);
      failures += bad.length;
      await page.close();
    }
  }
  await browser.close();
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
