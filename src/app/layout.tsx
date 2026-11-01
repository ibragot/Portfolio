import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted (SIL Open Font License), so builds never depend on Google Fonts being reachable.
// Tall condensed deco capitals for headings, like the lettering on 1930s towers.
const deco = localFont({
  variable: "--font-deco",
  display: "swap",
  src: [{ path: "../fonts/big-shoulders-display-latin-wght-normal.woff2", weight: "100 900", style: "normal" }],
});

// A warm old-style serif for reading, with an optical-size axis for big and small text.
const serif = localFont({
  variable: "--font-serif",
  display: "swap",
  src: [
    { path: "../fonts/fraunces-latin-opsz-normal.woff2", weight: "100 900", style: "normal" },
    { path: "../fonts/fraunces-latin-opsz-italic.woff2", weight: "100 900", style: "italic" },
  ],
});

const description =
  "Noureldin Ibrahim, Computer Science at uOttawa. Full-stack apps, machine learning, and Roblox games.";

export const metadata: Metadata = {
  title: "Noureldin Ibrahim",
  description,
  metadataBase: new URL("https://noureldin.dev"),
  openGraph: {
    title: "Noureldin Ibrahim",
    description,
    url: "https://noureldin.dev",
    siteName: "Noureldin Ibrahim",
  },
  twitter: { card: "summary_large_image", title: "Noureldin Ibrahim", description },
};

export const viewport: Viewport = { themeColor: "#000000" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${deco.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
