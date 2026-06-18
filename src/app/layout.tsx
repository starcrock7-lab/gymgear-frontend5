import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const SITE_URL = "https://gymgearcompare.com";
const TITLE = "GymGear Compare — Your Perfect Home Gym, Built by AI";
const DESCRIPTION =
  "Answer 5 quick questions and get three personalized gym equipment kits — Best Value, Best Match, Best Quality — with live prices and honest AI verdicts.";

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
      className={`${syne.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
