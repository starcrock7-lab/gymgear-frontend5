import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

// Body: Inter — the readable, low-quirk sans the tech world runs on.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Headings: Space Grotesk — sharp, techy, energetic without Syne's fatigue.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://gymgearcompare.com";
const TITLE = "GymGear Compare — Your Perfect Home Gym, Built by AI";
const DESCRIPTION =
  "Answer 7 quick questions and get three personalized gym equipment kits — Best Value, Best Match, Best Quality — with live prices and honest AI verdicts.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · GymGear Compare",
  },
  description: DESCRIPTION,
  applicationName: "GymGear Compare",
  keywords: [
    "home gym",
    "gym equipment comparison",
    "best home gym kit",
    "barbell comparison",
    "gym gear deals",
  ],
  openGraph: {
    type: "website",
    siteName: "GymGear Compare",
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/hero.jpg", width: 2048, height: 2048, alt: "GymGear Compare" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/hero.jpg"],
  },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
