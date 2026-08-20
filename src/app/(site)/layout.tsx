import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "../globals.css";

import Navbar from "../Layout/Client/Navbar/Navbar";
import Footer from "../Layout/Client/Footer/Footer";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  style: ["normal"],
  variable: "--font-montserrat",
  display: "swap",
});

const siteUrl = "https://yourdomain.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "My Restaurants App | Discover Great Food",
    template: "%s | My Restaurants App",
  },

  description:
    "Discover delicious food, explore restaurants, view menus, and find the best dining experiences with My Restaurants App.",

  keywords: [
    "restaurant",
    "restaurants",
    "food",
    "food delivery",
    "restaurant app",
    "restaurant menu",
    "best restaurants",
    "online food",
  ],

  authors: [
    {
      name: "My Restaurants App",
    },
  ],

  creator: "My Restaurants App",
  publisher: "My Restaurants App",

  applicationName: "My Restaurants App",

  alternates: {
    canonical: "/",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-video-preview": -1,
      "max-snippet": -1,
    },
  },

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "My Restaurants App",
    title: "My Restaurants App | Discover Great Food",
    description:
      "Discover delicious food, explore restaurants, view menus, and find the best dining experiences with My Restaurants App.",
    images: [
      {
        url: "/site-page.png",
        width: 1200,
        height: 630,
        alt: "My Restaurants App",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "My Restaurants App | Discover Great Food",
    description:
      "Discover delicious food, explore restaurants, view menus, and find the best dining experiences with My Restaurants App.",
    images: ["/site-page.png"],
  },

  category: "food",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`${montserrat.variable} min-h-full flex flex-col font-montserrat`}
    >
      <Navbar />

      <main className="flex-1">{children}</main>

      <Footer />
    </div>
  );
}
