import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// One variable family: condensed + heavy + italic for the menu, normal width for reading.
// Self-hosted (SIL Open Font License), so builds never depend on Google Fonts being reachable.
const archivo = localFont({
  variable: "--font-archivo",
  display: "swap",
  src: [
    { path: "../fonts/archivo-latin-wdth-normal.woff2", style: "normal", weight: "100 900" },
    { path: "../fonts/archivo-latin-wdth-italic.woff2", style: "italic", weight: "100 900" },
  ],
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
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

export const viewport: Viewport = { themeColor: "#0a1fa8" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={archivo.variable}>
      <body>{children}</body>
    </html>
  );
}
