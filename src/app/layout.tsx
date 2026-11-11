import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { SITE_META } from "@/seo/lib/meta";
import { AffiliateDrive } from "@/components/affiliates/AffiliateDrive";
import { driveConfig } from "@/affiliates/lib/drive";
import { FeatureFlagsProvider } from "@/components/providers/FeatureFlags";
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

// REQ-1530: fuentes auto-hospedadas con next/font (antes @import de Google Fonts que bloqueaba el render).
// Solo Poppins (texto del cuerpo) se precarga; Geist casi no se usa y ya no se precarga.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const poppins = Poppins({
  variable: "--font-poppins-nf",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  preload: false,
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
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
    // REQ-1530: las variables de fuente van en <html> porque --tp-font-primary y @theme se resuelven en :root.
    <html lang={htmlLang(route)} className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        {/* REQ-221: errores del navegador a los logs del Worker (client-error) */}
        <ClientErrorListener />
        <SessionProvider>
          <AppProviders language={route?.lang} locked={route?.locked ?? false}>
            <FeatureFlagsProvider flags={{ transfers: isTransfersVisible(process.env.TRANSFERS_ENABLED), ownTrips: visibilityFromEnv(process.env as Record<string, string | undefined>).own, primeraPieza: isPrimeraPiezaEnabled(process.env.PRIMERA_PIEZA_ENABLED), dayTrips: isHomeCarouselsEnabled(process.env.CARRUSELES_HOME_ENABLED), pages, year: new Date().getFullYear() }}>
              {children}
            </FeatureFlagsProvider>
            {drive.enabled && <AffiliateDrive config={drive} />}
          </AppProviders>
        </SessionProvider>
      </body>
    </html>
  );
}
