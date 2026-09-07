import type { Metadata, Viewport } from "next";
import {
  Playfair_Display,
  Plus_Jakarta_Sans,
  Dancing_Script,
  Hind_Siliguri,
} from "next/font/google";
import "./globals.css";

/* ==========================================================================
   RESTAURANT FONT STACK — পুরো অ্যাপে একবারেই লোড হয়
   (site + dashboard দুটোই root layout এর ভিতরে, তাই সব জায়গায় পাওয়া যাবে)

   globals.css এ এগুলো ম্যাপ করা আছে:
     --font-display  → Playfair Display  (হেডিং — রেস্টুরেন্ট এলিগ্যান্স)
     --font-body     → Plus Jakarta Sans (বডি টেক্সট — মডার্ন, পরিষ্কার)
     --font-script   → Dancing Script    (eyebrow / ট্যাগলাইন)
     --font-bengali  → Hind Siliguri     (বাংলা টেক্সট ও ৳)
   ========================================================================== */

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-playfair",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const dancing = Dancing_Script({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-dancing",
  display: "swap",
});

const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hind",
  display: "swap",
});

const fontVariables = [
  playfair.variable,
  jakarta.variable,
  dancing.variable,
  hindSiliguri.variable,
].join(" ");

export const metadata: Metadata = {
  title: {
    default: "Spice Route — Order Fresh Food Online",
    template: "%s | Spice Route",
  },
  description:
    "Browse the menu, add your favourites to the cart and get hot food delivered to your door.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // ⚠️ পুরো অ্যাপে এটাই একমাত্র জায়গা যেখানে ব্র্যান্ড রঙটা hex হিসেবে লেখা —
  // মোবাইল ব্রাউজারের অ্যাড্রেস বার CSS ভ্যারিয়েবল পড়তে পারে না।
  // globals.css এ --color-brand বদলালে এই লাইনটাও মিলিয়ে দিন।
  themeColor: "#d70f64",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
