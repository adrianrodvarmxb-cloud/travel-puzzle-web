import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
import { isHomeCarouselsEnabled } from "@/home/lib/flags";
import { ClientErrorListener } from "@/components/common/ClientErrorListener";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // REQ-027: afiliados (Travelpayouts) apagados por defecto y solo en rutas elegidas.
  const drive = driveConfig(process.env as Record<string, string | undefined>);
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {/* REQ-221: errores del navegador a los logs del Worker (client-error) */}
        <ClientErrorListener />
        <SessionProvider>
          <AppProviders>
            <FeatureFlagsProvider flags={{ transfers: isTransfersVisible(process.env.TRANSFERS_ENABLED), ownTrips: visibilityFromEnv(process.env as Record<string, string | undefined>).own, primeraPieza: isPrimeraPiezaEnabled(process.env.PRIMERA_PIEZA_ENABLED), dayTrips: isHomeCarouselsEnabled(process.env.CARRUSELES_HOME_ENABLED), pages: sitePagesFromEnv(process.env as Record<string, string | undefined>), year: new Date().getFullYear() }}>
              {children}
            </FeatureFlagsProvider>
            {drive.enabled && <AffiliateDrive config={drive} />}
          </AppProviders>
        </SessionProvider>
      </body>
    </html>
  );
}
