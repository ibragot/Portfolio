import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Noureldin Ibrahim | Portfolio",
  description:
    "Noureldin Ibrahim · Computer Science student at UOttawa building thoughtful software projects.",
  metadataBase: new URL("https://ibragot.github.io"),
  openGraph: {
    title: "Noureldin Ibrahim | Portfolio",
    description:
      "Placeholder portfolio highlighting Noureldin Ibrahim's projects, experience, and contact details.",
    url: "https://www.noureldin.dev",
    siteName: "Noureldin Ibrahim Portfolio",
  },
  twitter: {
    card: "summary_large_image",
    title: "Noureldin Ibrahim | Portfolio",
    description:
      "Computer Science student at UOttawa building thoughtful digital products.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetBrainsMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
