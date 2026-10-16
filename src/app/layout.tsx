import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { site } from "@/content/site";
import "./globals.css";

// Display: high-contrast serif with a brush-cut quality. Two weights only.
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

// The brush's hand: the same face in italic, for the names the brush writes and
// the project titles they become. Not preloaded; it is first needed below the fold.
const cormorantItalic = Cormorant_Garamond({
  variable: "--font-cormorant-italic",
  subsets: ["latin"],
  weight: "500",
  style: "italic",
  display: "swap",
  preload: false,
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = `${site.identity} — ${site.person.name}, ${site.role}`;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: title,
    template: `%s — ${site.identity}`,
  },
  description: site.description,
  authors: [{ name: site.person.name, url: site.links[0].href }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.identity,
    title,
    description: site.description,
    url: "/",
    locale: "en",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: site.description,
  },
};

export const viewport: Viewport = {
  themeColor: "#101110",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${cormorantItalic.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="surface-ink flex min-h-svh flex-col">
        <a
          href="#main"
          className="label sr-only z-50 bg-parchment px-4 py-3 text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
