import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import NavShell from "@/components/NavShell";
import AuthGate from "@/components/AuthGate";
import ErrorReporter from "@/components/ErrorReporter";
import MetaPixel from "@/components/MetaPixel";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://rumea.app"),
  title: "RumeApp · Su finca en el celular",
  description:
    "Ganado, búfalos, cabras, ovejas, caballos, cerdos y aves: animales, lotes, plan sanitario automático, partos y gastos entre socios, desde el celular.",
  appleWebApp: { capable: true, title: "RumeApp", statusBarStyle: "default" },
  openGraph: {
    title: "RumeApp — Su finca en el celular",
    description:
      "Para ganado, cabras, ovejas, caballos, cerdos y gallinas: plan sanitario automático, lotes, partos y gastos entre socios.",
    type: "website",
    locale: "es_CO",
    siteName: "RumeApp",
  },
  twitter: {
    card: "summary_large_image",
    title: "RumeApp — Su finca en el celular",
    description: "Ganado, cabras, ovejas, caballos, cerdos y aves: todo su manejo en una app.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F8F5EE",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      data-theme="light"
      className={`${spaceGrotesk.variable} ${GeistMono.variable}`}
    >
      <body className="min-h-screen antialiased">
        <AuthGate>
          <div className="app-bg" aria-hidden />
          <div className="app-glow-1" aria-hidden />
          <div className="app-glow-2" aria-hidden />
          <NavShell>{children}</NavShell>
        </AuthGate>
        <ErrorReporter />
        <MetaPixel />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
