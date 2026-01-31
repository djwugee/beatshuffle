import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "BeatShuffle - Audio Beat Manipulation",
  description:
    "Powerful client-side audio beat manipulation tool. Upload your tracks, detect beats, and apply pattern-based effects to create unique remixes.",
  keywords: [
    "beat manipulation",
    "audio processing",
    "beat detection",
    "music remix",
    "drum patterns",
    "audio effects",
  ],
  authors: [{ name: "djwugee" }],
  openGraph: {
    title: "BeatShuffle - Audio Beat Manipulation",
    description:
      "Powerful client-side audio beat manipulation tool for creating unique remixes.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
