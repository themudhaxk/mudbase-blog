import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://blog.mudbase.dev"),
  title: {
    template: "%s - Mudbase Blog",
    default: "Mudbase Blog",
  },
  description:
    "Migration guides, showcase apps, and engineering notes from the team building Mudbase - the backend that also gets you paid.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    siteName: "Mudbase Blog",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@mudbasedev",
    creator: "@mudbasedev",
  },
};

// Site-wide structured data. Rendered once in the root layout body so Organization
// and WebSite markup appears in the initial HTML of every route (server component).
const siteJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Mudbase",
    url: "https://www.mudbase.dev",
    logo: "https://www.mudbase.dev/logo.png",
    sameAs: [
      "https://www.linkedin.com/company/mudbase-dev",
      "https://x.com/mudbasedev",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Mudbase Blog",
    url: "https://blog.mudbase.dev",
  },
];

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <ThemeProvider>{children}</ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
