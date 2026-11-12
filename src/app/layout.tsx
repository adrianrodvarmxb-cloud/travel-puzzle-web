import type { Metadata } from "next";
import localFont from "next/font/local";
import { SessionProvider } from "next-auth/react";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { SITE_META } from "@/seo/lib/meta";
import { AffiliateDrive } from "@/components/affiliates/AffiliateDrive";
import { driveConfig } from "@/affiliates/lib/drive";
import { FeatureFlagsProvider } from "@/components/providers/FeatureFlags";
import { footerGuideLinksByLang } from "@/destinations/guias";
import { isPrimeraPiezaEnabled } from "@/tours/lib/menu";
import { isTransfersVisible } from "@/transfers/lib/widget";
import { visibilityFromEnv } from "@/trips/lib/visibility";
import { sitePagesFromEnv } from "@/site/lib/pages";
import { blogEnv, loadVisiblePosts } from "@/blog/load";
import { blogNavVisible } from "@/blog/lib/registry";
import { isHomeCarouselsEnabled } from "@/home/lib/flags";
import { ClientErrorListener } from "@/components/common/ClientErrorListener";
import { localeUrlsEnabled } from "@/i18n/lib/flags";
import { htmlLang } from "@/i18n/lib/locales";
import { routeLanguageState } from "@/i18n/server";

// REQ-1560: fuentes auto-hospedadas (antes @import de Google Fonts que bloqueaba el render).
// REQ-1616 (INC-012): los archivos viven en src/app/fonts (OFL, de Fontsource) para que el build
// no dependa de descargar de Google, que fallaba de forma intermitente en CI.
// Solo Poppins (texto del cuerpo) se precarga; Geist casi no se usa y ya no se precarga.
const geistSans = localFont({
  variable: "--font-geist-sans",
  src: [
    { path: "./fonts/geist-sans/geist-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/geist-sans/geist-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/geist-sans/geist-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/geist-sans/geist-sans-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: false,
});

const geistMono = localFont({
  variable: "--font-geist-mono",
  src: [
    { path: "./fonts/geist-mono/geist-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
  ],
  display: "swap",
  preload: false,
});

const poppins = localFont({
  variable: "--font-poppins-nf",
  src: [
    { path: "./fonts/poppins/poppins-latin-300-normal.woff2", weight: "300", style: "normal" },
    { path: "./fonts/poppins/poppins-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/poppins/poppins-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/poppins/poppins-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/poppins/poppins-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: true,
});

const spaceGrotesk = localFont({
  variable: "--font-space-grotesk",
  src: [
    { path: "./fonts/space-grotesk/space-grotesk-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/space-grotesk/space-grotesk-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/space-grotesk/space-grotesk-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: false,
});

const jetbrainsMono = localFont({
  variable: "--font-jetbrains-mono",
  src: [
    { path: "./fonts/jetbrains-mono/jetbrains-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/jetbrains-mono/jetbrains-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  display: "swap",
  preload: false,
});

// Vista previa al compartir (WhatsApp, Facebook, LinkedIn, X) e íconos: ver src/seo/lib/meta.ts
export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "https://travelpuzzle.com.mx"),
  title: { default: SITE_META.title, template: `%s · ${SITE_META.name}` },
  description: SITE_META.description,
  applicationName: SITE_META.name,
  openGraph: {
    type: "website",
    siteName: SITE_META.name,
    locale: "es_MX",
    title: SITE_META.title,
    description: SITE_META.description,
    url: "/",
    images: [{ url: SITE_META.image, width: 1200, height: 630, alt: "Travel Puzzle · Tu próximo viaje, pieza por pieza." }],
  },
  twitter: { card: "summary_large_image", title: SITE_META.title, description: SITE_META.description, images: [SITE_META.image] },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // REQ-027: afiliados (Travelpayouts) apagados por defecto y solo en rutas elegidas.
  const drive = driveConfig(process.env as Record<string, string | undefined>);
  // REQ-241, REQ-257: «Blog» en el pie solo con BLOG_ENABLED y al menos 3 artículos visibles.
  const env = process.env as Record<string, string | undefined>;
  const be = blogEnv(env);
  const pages = { ...sitePagesFromEnv(env), blog: blogNavVisible(be.enabled, loadVisiblePosts(be)) };
  // REQ-654 (Gate 3): con LOCALE_URLS_ENABLED, el idioma de la URL llega al cliente. Apagada no se leen encabezados
  // (las páginas estáticas siguen estáticas) y el provider arranca como hoy.
  const route = localeUrlsEnabled(env) ? await routeLanguageState() : null;
  return (
    // REQ-664: <html lang> del idioma de la URL en las rutas en alcance; en lo demás (y sin la bandera), español como hoy.
    // REQ-1560: las variables de fuente van en <html> porque --tp-font-primary y @theme se resuelven en :root.
    <html lang={htmlLang(route)} className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        {/* REQ-221: errores del navegador a los logs del Worker (client-error) */}
        <ClientErrorListener />
        <SessionProvider>
          <AppProviders language={route?.lang} locked={route?.locked ?? false}>
            <FeatureFlagsProvider flags={{ transfers: isTransfersVisible(process.env.TRANSFERS_ENABLED), ownTrips: visibilityFromEnv(process.env as Record<string, string | undefined>).own, primeraPieza: isPrimeraPiezaEnabled(process.env.PRIMERA_PIEZA_ENABLED), dayTrips: isHomeCarouselsEnabled(process.env.CARRUSELES_HOME_ENABLED), pages, year: new Date().getFullYear(), guideLinks: isPrimeraPiezaEnabled(process.env.PRIMERA_PIEZA_ENABLED) ? footerGuideLinksByLang() : undefined }}>
              {children}
            </FeatureFlagsProvider>
            {drive.enabled && <AffiliateDrive config={drive} />}
          </AppProviders>
        </SessionProvider>
      </body>
    </html>
  );
}
