import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif, Josefin_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const serif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const caps = Josefin_Sans({
  variable: "--font-caps",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const description =
  "Noureldin Ibrahim, Computer Science student at uOttawa building trustworthy software, with a focus on security and AI.";

export const metadata: Metadata = {
  title: "Noureldin Ibrahim | Portfolio",
  description,
  metadataBase: new URL("https://ibragot.github.io"),
  openGraph: {
    title: "Noureldin Ibrahim | Portfolio",
    description,
    url: "https://www.noureldin.dev",
    siteName: "Noureldin Ibrahim Portfolio",
  },
  twitter: {
    card: "summary_large_image",
    title: "Noureldin Ibrahim | Portfolio",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1210",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${serif.variable} ${caps.variable}`}>{children}</body>
    </html>
  );
}
