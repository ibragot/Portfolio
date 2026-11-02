import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// All self-hosted (SIL Open Font License), so builds never depend on Google Fonts.
// Fraunces for display and italic accents, Hanken Grotesk for reading, Michroma for small labels.
const serif = localFont({
  variable: "--font-serif",
  display: "swap",
  src: [
    { path: "../fonts/fraunces-latin-opsz-normal.woff2", weight: "100 900", style: "normal" },
    { path: "../fonts/fraunces-latin-opsz-italic.woff2", weight: "100 900", style: "italic" },
  ],
});

const sans = localFont({
  variable: "--font-sans",
  display: "swap",
  src: [{ path: "../fonts/hanken-grotesk-latin-wght-normal.woff2", weight: "100 900", style: "normal" }],
});

const label = localFont({
  variable: "--font-label",
  display: "swap",
  src: [{ path: "../fonts/michroma-latin-400-normal.woff2", weight: "400", style: "normal" }],
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

export const viewport: Viewport = { themeColor: "#0e1029", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${label.variable}`}>
      <body>{children}</body>
    </html>
  );
}
