import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";

import Navbar from "../Layout/Client/Navbar/Navbar";
import Footer from "../Layout/Client/Footer/Footer";
import CartDrawer from "../components/Clients/Cart/CartDrawer";
import UserProvider from "../components/Clients/Auth/UserProvider";

const siteUrl = "https://durbinbangla.vercel.app";


export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "Durbin Bangla Restaurants | Discover Great Food",
    template: "%s | Durbin Bangla Restaurants",
  },

  description:
    "Discover delicious food, explore restaurants, view menus, and find the best dining experiences with Durbin Bangla Restaurants.",

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

  authors: [{ name: "Durbin Bangla Restaurants" }],

  creator: "Durbin Bangla Restaurants",
  publisher: "Durbin Bangla Restaurants",
  applicationName: "Durbin Bangla Restaurants",

  alternates: { canonical: "/" },

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
    siteName: "Durbin Bangla Restaurants",
    title: "Durbin Bangla Restaurants | Discover Great Food",
    description:
      "Discover delicious food, explore restaurants, view menus, and find the best dining experiences with Durbin Bangla Restaurants.",
    images: [
      {
        url: "/site-page.png",
        width: 1200,
        height: 630,
        alt: "Durbin Bangla Restaurants",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Durbin Bangla Restaurants | Discover Great Food",
    description:
      "Discover delicious food, explore restaurants, view menus, and find the best dining experiences with Durbin Bangla Restaurants.",
    images: ["/site-page.png"],
  },

  category: "food",
};

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /* কে লগইন আছে সেটা নেভবার, চেকআউট আর অ্যাকাউন্ট পেজ — সবাই এখান থেকেই পায় */
    <UserProvider>
      <div className="flex min-h-full flex-col">
        <Navbar />

        <main className="flex-1">{children}</main>

        <Footer />

        {/* কার্ট ড্রয়ার — যেকোনো পেজ থেকে openCart() ডাকলেই খুলবে */}
        <CartDrawer />

        <Toaster
          position="top-center"
          toastOptions={{
            duration: 2600,
            style: {
              background: "var(--color-ink)",
              color: "var(--color-ink-invert)",
              fontSize: "13.5px",
              fontWeight: 600,
              borderRadius: "var(--radius-sm)",
              boxShadow: "var(--shadow-float)",
            },
            success: {
              iconTheme: { primary: "var(--color-herb)", secondary: "#fff" },
            },
            error: {
              iconTheme: { primary: "var(--color-chili)", secondary: "#fff" },
            },
          }}
        />
      </div>
    </UserProvider>
  );
}
